package com.testmoa.backend.service;

import com.testmoa.backend.entity.Feedback;
import com.testmoa.backend.entity.Project;
import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.Register;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.SelectionMode;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.security.Role;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
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

/**
 * 자동 지급이 동시에 두 번 돌 때(#288-S6). 서버가 여러 대이거나 실행이 겹쳐도 같은 참가를 두 번 지급하지 않는다.
 * 실제 트랜잭션이 필요해 테스트 트랜잭션을 쓰지 않고, 끝나면 만든 행을 지운다. 한 번으로는 겹치지 않을 수 있어 여러 번 되풀이한다
 */
@SpringBootTest
class FeedbackPayoutConcurrencyTest {
    private static final int ROUNDS = 10;

    @Autowired FeedbackPayoutService payoutService;
    @Autowired EntityManager em;
    @Autowired TransactionTemplate tx;
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
            jdbc.update("delete from recruitments where project_id = ?", projectId);
            jdbc.update("delete from projects where id = ?", projectId);
        }
        for (Long id : userIds) {
            jdbc.update("delete from credit_ledgers where credit_wallet_id in (select id from credit_wallets where user_id = ?)", id);
            jdbc.update("delete from credit_wallets where user_id = ?", id);
            jdbc.update("delete from users where id = ?", id);
        }
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
    @DisplayName("#288-S6 자동 지급이 동시에 두 번 돌면")
    void 같은_참가는_한_번만_지급된다() throws Exception {
        LocalDateTime now = LocalDateTime.now();
        Long testerId = tx.execute(status -> {
            User developer = newUser();
            User tester = newUser();
            Project project = Project.builder().user(developer).title("북로그").build();
            em.persist(project);
            projectId = project.getId();
            return tester.getId();
        });
        ExecutorService pool = Executors.newFixedThreadPool(2);

        try {
            for (int round = 0; round < ROUNDS; round++) {
                tx.executeWithoutResult(status -> {
                    Recruitment recruitment = Recruitment.builder().project(em.find(Project.class, projectId)).title("북로그 베타")
                            .description("써 봐 주세요").conditions("누구나").accessUrl("https://booklog.example.com")
                            .recruitDeadline(now.minusDays(5)).feedbackDeadline(now.plusDays(2))
                            .selectionMode(SelectionMode.FIRST_COME).build();
                    em.persist(recruitment);
                    Register register = Register.builder().recruitment(recruitment).user(em.find(User.class, testerId)).build();
                    em.persist(register);
                    register.confirm(1000, 0, now.minusDays(6));
                    em.persist(Feedback.builder().register(register).content("좋아요").submittedAt(now.minusHours(73)).build());
                });

                CountDownLatch start = new CountDownLatch(1);
                Callable<Integer> call = () -> { start.await(); return payoutService.payDue(now); };
                Future<Integer> first = pool.submit(call);
                Future<Integer> second = pool.submit(call);
                start.countDown();

                /* 두 실행이 지급한 수를 더하면 이번에 만든 참가 하나다 */
                assertThat(first.get() + second.get()).as("round %d", round).isEqualTo(1);
                Integer earned = jdbc.queryForObject("select earned_balance from credit_wallets where user_id = ?", Integer.class, testerId);
                Long ledgers = jdbc.queryForObject("select count(*) from credit_ledgers where credit_wallet_id = "
                        + "(select id from credit_wallets where user_id = ?)", Long.class, testerId);
                assertThat(earned).isEqualTo(1000 * (round + 1));
                assertThat(ledgers).isEqualTo(round + 1L);
            }
        } finally {
            pool.shutdown();
        }
    }
}
