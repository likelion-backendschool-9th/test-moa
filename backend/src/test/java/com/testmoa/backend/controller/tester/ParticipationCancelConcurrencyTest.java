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
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
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
 * 지원 취소와 피드백 제출이 동시에 들어올 때(#286-S6). 요청마다 실제 트랜잭션이 필요해 테스트 트랜잭션을 쓰지 않고, 끝나면 만든 행을 지운다.
 * 한 번으로는 겹치지 않을 수 있어 새 모집글로 여러 번 되풀이한다
 */
@SpringBootTest
@AutoConfigureMockMvc
class ParticipationCancelConcurrencyTest {
    private static final int ROUNDS = 20;

    @Autowired MockMvc mvc;
    @Autowired EntityManager em;
    @Autowired TransactionTemplate tx;
    @Autowired JwtProvider jwtProvider;
    @Autowired JdbcTemplate jdbc;

    private final List<Long> userIds = new ArrayList<>();
    private Long projectId;

    @AfterEach
    void cleanUp() {
        if (projectId != null) {
            String recruitments = "select id from recruitments where project_id = " + projectId;
            String registers = "select id from registers where recruitment_id in (" + recruitments + ")";
            jdbc.update("delete from feedbacks where register_id in (" + registers + ")");
            jdbc.update("delete from registers where recruitment_id in (" + recruitments + ")");
            jdbc.update("delete from test_items where recruitment_id in (" + recruitments + ")");
            jdbc.update("delete from recruitments where project_id = ?", projectId);
            jdbc.update("delete from projects where id = ?", projectId);
        }
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

    /** 모집 중인 선착순 모집과 확정된 참가. 선착순은 모집 중에도 피드백을 낼 수 있다. [참가 id, 항목 id] */
    private long[] recruitingRecruitment(Long testerId) {
        return tx.execute(status -> {
            Project project = em.find(Project.class, projectId);
            Recruitment recruitment = Recruitment.builder().project(project).title("북로그 베타").description("써 봐 주세요")
                    .conditions("누구나").accessUrl("https://booklog.example.com")
                    .recruitDeadline(LocalDateTime.now().plusDays(3)).feedbackDeadline(LocalDateTime.now().plusDays(10))
                    .selectionMode(SelectionMode.FIRST_COME).build();
            em.persist(recruitment);
            TestItem item = TestItem.builder().recruitment(recruitment).title("밑줄 저장").required(true).build();
            em.persist(item);
            Register register = Register.builder().recruitment(recruitment).user(em.find(User.class, testerId)).build();
            em.persist(register);
            register.confirm(1000, 0, LocalDateTime.now());
            return new long[]{register.getId(), item.getId()};
        });
    }

    @Test
    @DisplayName("#286-S6 지원 취소와 피드백 제출이 동시에")
    void 둘_중_하나만_되고_피드백을_낸_참가는_취소되지_않는다() throws Exception {
        Long testerId = tx.execute(status -> {
            User developer = newUser();
            User tester = newUser();
            Project project = Project.builder().user(developer).title("북로그").build();
            em.persist(project);
            projectId = project.getId();
            return tester.getId();
        });
        String token = "Bearer " + jwtProvider.createAccessToken(testerId);
        ExecutorService pool = Executors.newFixedThreadPool(2);

        try {
            for (int round = 0; round < ROUNDS; round++) {
                long[] created = recruitingRecruitment(testerId);
                long registerId = created[0];
                String body = "{\"items\":[{\"testItemId\":" + created[1] + ",\"content\":\"좋아요\"}]}";
                MockHttpServletRequestBuilder submit = post("/api/v1/tester/participations/" + registerId + "/feedbacks")
                        .header("Authorization", token).contentType(MediaType.APPLICATION_JSON).content(body);
                MockHttpServletRequestBuilder cancel = post("/api/v1/tester/participations/" + registerId + "/cancel")
                        .header("Authorization", token);

                CountDownLatch start = new CountDownLatch(1);
                Callable<Integer> submitCall = () -> { start.await(); return mvc.perform(submit).andReturn().getResponse().getStatus(); };
                Callable<Integer> cancelCall = () -> { start.await(); return mvc.perform(cancel).andReturn().getResponse().getStatus(); };
                Future<Integer> submitted = pool.submit(submitCall);
                Future<Integer> cancelled = pool.submit(cancelCall);
                start.countDown();

                int submitStatus = submitted.get();
                int cancelStatus = cancelled.get();
                String registerStatus = jdbc.queryForObject("select status from registers where id = ?", String.class, registerId);
                Long feedbackCount = jdbc.queryForObject("select count(*) from feedbacks where register_id = ?", Long.class, registerId);
                /* 제출이 먼저면 취소는 409이고 참가는 확정으로 남는다. 취소가 먼저면 제출은 409이고 피드백이 없다 */
                if (submitStatus == 201) {
                    assertThat(cancelStatus).as("round %d", round).isEqualTo(409);
                    assertThat(registerStatus).isEqualTo("CONFIRMED");
                    assertThat(feedbackCount).isEqualTo(1L);
                } else {
                    assertThat(submitStatus).as("round %d", round).isEqualTo(409);
                    assertThat(cancelStatus).isEqualTo(200);
                    assertThat(registerStatus).isEqualTo("CANCELLED");
                    assertThat(feedbackCount).isZero();
                }
            }
        } finally {
            pool.shutdown();
        }
    }
}
