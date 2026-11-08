package com.testmoa.backend.controller.tester;

import com.testmoa.backend.entity.Project;
import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.Register;
import com.testmoa.backend.entity.TestItem;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.SelectionMode;
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

import java.time.LocalDateTime;
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
 * 피드백 동시 제출(#118-S7). 요청마다 실제 트랜잭션이 필요해 테스트 트랜잭션을 쓰지 않고, 끝나면 만든 행을 지운다
 */
@SpringBootTest
@AutoConfigureMockMvc
class FeedbackSubmitConcurrencyTest {
    private static final int REQUESTS = 5;

    @Autowired MockMvc mvc;
    @Autowired EntityManager em;
    @Autowired TransactionTemplate tx;
    @Autowired JwtProvider jwtProvider;
    @Autowired JdbcTemplate jdbc;

    private final List<Long> userIds = new ArrayList<>();
    private Long projectId;
    private Long recruitmentId;
    private Long registerId;
    private Long testItemId;

    @AfterEach
    void cleanUp() {
        if (registerId != null) {
            jdbc.update("delete from feedbacks where register_id = ?", registerId);
            jdbc.update("delete from registers where id = ?", registerId);
        }
        if (testItemId != null) jdbc.update("delete from test_items where id = ?", testItemId);
        if (recruitmentId != null) jdbc.update("delete from recruitments where id = ?", recruitmentId);
        if (projectId != null) jdbc.update("delete from projects where id = ?", projectId);
        userIds.forEach(id -> jdbc.update("delete from users where id = ?", id));
    }

    private User newUser() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        User user = User.builder().name("김모아").nickname("모아" + suffix).email(suffix + "@example.com")
                .role(Role.USER).status(UserStatus.ACTIVE).build();
        em.persist(user);
        userIds.add(user.getId());
        return user;
    }

    @Test
    @DisplayName("#118-S7 같은 참가로 동시에 여러 번 제출")
    void 동시에_여러_번_눌러도_피드백은_한_번만_저장된다() throws Exception {
        Long testerId = tx.execute(status -> {
            User developer = newUser();
            User tester = newUser();
            Project project = Project.builder().user(developer).title("북로그").build();
            em.persist(project);
            projectId = project.getId();
            Recruitment recruitment = Recruitment.builder().project(project).title("북로그 베타").description("써 봐 주세요")
                    .conditions("누구나").accessUrl("https://booklog.example.com")
                    .recruitDeadline(LocalDateTime.now().plusDays(3)).feedbackDeadline(LocalDateTime.now().plusDays(9))
                    .selectionMode(SelectionMode.FIRST_COME).build();
            em.persist(recruitment);
            recruitmentId = recruitment.getId();
            TestItem item = TestItem.builder().recruitment(recruitment).title("밑줄 저장").required(true).build();
            em.persist(item);
            testItemId = item.getId();
            Register register = Register.builder().recruitment(recruitment).user(tester).build();
            em.persist(register);
            register.confirm(1000, 0, LocalDateTime.now());
            registerId = register.getId();
            return tester.getId();
        });
        String token = "Bearer " + jwtProvider.createAccessToken(testerId);
        String body = "{\"items\":[{\"testItemId\":" + testItemId + ",\"content\":\"좋아요\"}],\"etc\":\"기타\"}";

        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(REQUESTS);
        List<Future<Integer>> results = new ArrayList<>();
        Callable<Integer> call = () -> {
            start.await();
            return mvc.perform(post("/api/v1/tester/participations/" + registerId + "/feedbacks").header("Authorization", token)
                            .contentType(MediaType.APPLICATION_JSON).content(body))
                    .andReturn().getResponse().getStatus();
        };
        for (int i = 0; i < REQUESTS; i++) results.add(pool.submit(call));
        start.countDown();
        List<Integer> statuses = new ArrayList<>();
        for (Future<Integer> result : results) statuses.add(result.get());
        pool.shutdown();

        assertThat(statuses).filteredOn(code -> code == 201).hasSize(1);
        assertThat(statuses).filteredOn(code -> code == 409).hasSize(REQUESTS - 1);
        /* 한 번 제출한 행만 있다(항목 1 + 기타 의견 1) */
        assertThat(jdbc.queryForObject("select count(*) from feedbacks where register_id = ?", Long.class, registerId)).isEqualTo(2L);
    }
}
