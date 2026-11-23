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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * 프로젝트 삭제와 모집 작성이 동시에 들어올 때(#287-S4). 요청마다 실제 트랜잭션이 필요해 테스트 트랜잭션을 쓰지 않고, 끝나면 만든 행을 지운다.
 * 한 번으로는 겹치지 않을 수 있어 새 프로젝트로 여러 번 되풀이한다
 */
@SpringBootTest
@AutoConfigureMockMvc
class ProjectDeleteConcurrencyTest {
    private static final int ROUNDS = 20;
    private static final ObjectMapper JSON = new ObjectMapper();

    @Autowired MockMvc mvc;
    @Autowired EntityManager em;
    @Autowired TransactionTemplate tx;
    @Autowired JwtProvider jwtProvider;
    @Autowired JdbcTemplate jdbc;

    private Long userId;
    private final List<Long> projectIds = new ArrayList<>();

    @AfterEach
    void cleanUp() {
        for (Long projectId : projectIds) {
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

    private Long newProject() {
        return tx.execute(status -> {
            Project project = Project.builder().user(em.find(User.class, userId)).title("북로그").build();
            em.persist(project);
            projectIds.add(project.getId());
            return project.getId();
        });
    }

    @Test
    @DisplayName("#287-S4 프로젝트 삭제와 모집 작성이 동시에")
    void 둘_중_하나만_되고_없는_프로젝트를_가리키는_모집글이_남지_않는다() throws Exception {
        tx.executeWithoutResult(status -> {
            String suffix = UUID.randomUUID().toString().substring(0, 8);
            User user = User.builder().name("김모아").nickname("모아" + suffix).email(suffix + "@example.com")
                    .role(Role.USER).status(UserStatus.ACTIVE).build();
            em.persist(user);
            userId = user.getId();
        });
        String token = "Bearer " + jwtProvider.createAccessToken(userId);
        ExecutorService pool = Executors.newFixedThreadPool(2);

        try {
            for (int round = 0; round < ROUNDS; round++) {
                Long projectId = newProject();
                String body = JSON.writeValueAsString(RecruitmentVersionTest.body(projectId));
                CountDownLatch start = new CountDownLatch(1);
                Callable<Integer> createCall = () -> {
                    start.await();
                    return mvc.perform(post("/api/v1/developer/recruitments").header("Authorization", token)
                            .contentType(MediaType.APPLICATION_JSON).content(body)).andReturn().getResponse().getStatus();
                };
                Callable<Integer> deleteCall = () -> {
                    start.await();
                    return mvc.perform(delete("/api/v1/developer/projects/" + projectId).header("Authorization", token))
                            .andReturn().getResponse().getStatus();
                };
                Future<Integer> created = pool.submit(createCall);
                Future<Integer> deleted = pool.submit(deleteCall);
                start.countDown();

                int createStatus = created.get();
                int deleteStatus = deleted.get();
                Long projects = jdbc.queryForObject("select count(*) from projects where id = ?", Long.class, projectId);
                Long recruitments = jdbc.queryForObject("select count(*) from recruitments where project_id = ?", Long.class, projectId);
                /* 작성이 먼저면 삭제는 409이고 둘 다 남는다. 삭제가 먼저면 작성은 404이고 아무것도 남지 않는다 */
                if (createStatus == 201) {
                    assertThat(deleteStatus).as("round %d", round).isEqualTo(409);
                    assertThat(projects).isEqualTo(1L);
                    assertThat(recruitments).isEqualTo(1L);
                } else {
                    assertThat(createStatus).as("round %d", round).isEqualTo(404);
                    assertThat(deleteStatus).isEqualTo(200);
                    assertThat(projects).isZero();
                    assertThat(recruitments).isZero();
                }
            }
        } finally {
            pool.shutdown();
        }
    }
}
