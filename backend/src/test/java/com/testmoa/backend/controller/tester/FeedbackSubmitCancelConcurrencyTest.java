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
 * 피드백 제출과 모집 취소가 동시에 들어올 때(#118-S8). 요청마다 실제 트랜잭션이 필요해 테스트 트랜잭션을 쓰지 않고, 끝나면 만든 행을 지운다.
 * 한 번으로는 겹치지 않을 수 있어 새 모집글로 여러 번 되풀이한다
 */
@SpringBootTest
@AutoConfigureMockMvc
class FeedbackSubmitCancelConcurrencyTest {
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

    /** 테스트 중(모집 마감 뒤, 제출 마감 전)인 모집과 확정된 참가. [모집글 id, 참가 id, 항목 id] */
    private long[] testingRecruitment(Long developerId, Long testerId) {
        return tx.execute(status -> {
            Project project = em.find(Project.class, projectId);
            Recruitment recruitment = Recruitment.builder().project(project).title("북로그 베타").description("써 봐 주세요")
                    .conditions("누구나").accessUrl("https://booklog.example.com")
                    .recruitDeadline(LocalDateTime.now().minusDays(1)).feedbackDeadline(LocalDateTime.now().plusDays(5))
                    .selectionMode(SelectionMode.FIRST_COME).build();
            em.persist(recruitment);
            TestItem item = TestItem.builder().recruitment(recruitment).title("밑줄 저장").required(true).build();
            em.persist(item);
            Register register = Register.builder().recruitment(recruitment).user(em.find(User.class, testerId)).build();
            em.persist(register);
            register.confirm(1000, 0, LocalDateTime.now().minusDays(2));
            return new long[]{recruitment.getId(), register.getId(), item.getId()};
        });
    }

    @Test
    @DisplayName("#118-S8 피드백 제출과 모집 취소가 동시에")
    void 피드백을_냈으면_동시에_취소돼도_참가가_확정으로_남는다() throws Exception {
        Long[] ids = tx.execute(status -> {
            User developer = newUser();
            User tester = newUser();
            Project project = Project.builder().user(developer).title("북로그").build();
            em.persist(project);
            projectId = project.getId();
            return new Long[]{developer.getId(), tester.getId()};
        });
        String developerToken = "Bearer " + jwtProvider.createAccessToken(ids[0]);
        String testerToken = "Bearer " + jwtProvider.createAccessToken(ids[1]);
        ExecutorService pool = Executors.newFixedThreadPool(2);

        try {
            for (int round = 0; round < ROUNDS; round++) {
                long[] created = testingRecruitment(ids[0], ids[1]);
                long recruitmentId = created[0];
                long registerId = created[1];
                String body = "{\"items\":[{\"testItemId\":" + created[2] + ",\"content\":\"좋아요\"}]}";
                MockHttpServletRequestBuilder submit = post("/api/v1/tester/participations/" + registerId + "/feedbacks")
                        .header("Authorization", testerToken).contentType(MediaType.APPLICATION_JSON).content(body);
                MockHttpServletRequestBuilder cancel = post("/api/v1/developer/recruitments/" + recruitmentId + "/cancel")
                        .header("Authorization", developerToken).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"서버 장애로 진행할 수 없어요\"}");

                CountDownLatch start = new CountDownLatch(1);
                Callable<Integer> submitCall = () -> { start.await(); return mvc.perform(submit).andReturn().getResponse().getStatus(); };
                Callable<Integer> cancelCall = () -> { start.await(); return mvc.perform(cancel).andReturn().getResponse().getStatus(); };
                Future<Integer> submitted = pool.submit(submitCall);
                Future<Integer> cancelled = pool.submit(cancelCall);
                start.countDown();

                assertThat(cancelled.get()).isEqualTo(200);
                int submitStatus = submitted.get();
                String registerStatus = jdbc.queryForObject("select status from registers where id = ?", String.class, registerId);
                Long feedbackCount = jdbc.queryForObject("select count(*) from feedbacks where register_id = ?", Long.class, registerId);
                /* 제출이 먼저면 피드백이 있고 참가는 확정으로 남는다. 취소가 먼저면 제출은 409이고 피드백이 없다 */
                if (submitStatus == 201) {
                    assertThat(registerStatus).as("round %d", round).isEqualTo("CONFIRMED");
                    assertThat(feedbackCount).isEqualTo(1L);
                } else {
                    assertThat(submitStatus).as("round %d", round).isEqualTo(409);
                    assertThat(registerStatus).isEqualTo("CANCELLED");
                    assertThat(feedbackCount).isZero();
                }
            }
        } finally {
            pool.shutdown();
        }
    }
}
