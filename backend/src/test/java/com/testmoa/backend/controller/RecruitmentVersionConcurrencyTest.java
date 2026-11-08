package com.testmoa.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.testmoa.backend.entity.Project;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.security.JwtProvider;
import com.testmoa.backend.global.security.Role;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * 같은 프로젝트에 동시에 모집 작성(#177-S3). 요청마다 실제 트랜잭션이 필요해 테스트 트랜잭션을 쓰지 않고, 끝나면 만든 행을 지운다
 */
@SpringBootTest
@AutoConfigureMockMvc
class RecruitmentVersionConcurrencyTest {
    private static final int REQUESTS = 5;
    private static final ObjectMapper JSON = new ObjectMapper();

    @Autowired MockMvc mvc;
    @Autowired EntityManager em;
    @Autowired TransactionTemplate tx;
    @Autowired JwtProvider jwtProvider;
    @Autowired JdbcTemplate jdbc;

    private Long userId;
    private Long projectId;

    @AfterEach
    void cleanUp() {
        if (projectId != null) {
            String recruitments = "select id from recruitments where project_id = " + projectId;
            jdbc.update("delete from test_item_images where test_item_id in (select id from test_items where recruitment_id in (" + recruitments + "))");
            jdbc.update("delete from test_items where recruitment_id in (" + recruitments + ")");
            jdbc.update("delete from recruitment_types where recruitment_id in (" + recruitments + ")");
            jdbc.update("delete from recruitment_images where recruitment_id in (" + recruitments + ")");
            jdbc.update("delete from recruitments where project_id = ?", projectId);
            jdbc.update("delete from projects where id = ?", projectId);
        }
        if (userId != null) jdbc.update("delete from users where id = ?", userId);
    }

    @Test
    @DisplayName("#177-S3 같은 프로젝트에 동시에 모집 작성")
    void 동시에_작성해도_버전이_겹치지_않는다() throws Exception {
        tx.executeWithoutResult(status -> {
            String suffix = UUID.randomUUID().toString().substring(0, 8);
            User user = User.builder().name("김모아").nickname("모아" + suffix).email(suffix + "@example.com")
                    .role(Role.USER).status(UserStatus.ACTIVE).build();
            em.persist(user);
            userId = user.getId();
            Project project = Project.builder().user(user).title("북로그").build();
            em.persist(project);
            projectId = project.getId();
        });
        String token = "Bearer " + jwtProvider.createAccessToken(userId);
        String body = JSON.writeValueAsString(RecruitmentVersionTest.body(projectId));

        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(REQUESTS);
        List<Future<Integer>> results = new ArrayList<>();
        Callable<Integer> call = () -> {
            start.await();
            return mvc.perform(post("/api/v1/developer/recruitments").header("Authorization", token)
                            .contentType(MediaType.APPLICATION_JSON).content(body))
                    .andReturn().getResponse().getStatus();
        };
        for (int i = 0; i < REQUESTS; i++) results.add(pool.submit(call));
        start.countDown();
        List<Integer> statuses = new ArrayList<>();
        for (Future<Integer> result : results) statuses.add(result.get());
        pool.shutdown();

        assertThat(statuses).containsOnly(201);
        assertThat(jdbc.queryForList("select version from recruitments where project_id = ? order by version", Integer.class, projectId))
                .containsExactly(1, 2, 3, 4, 5);
    }
}
