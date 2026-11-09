package com.testmoa.backend.service.admin.impl;

import com.testmoa.backend.dto.request.AdminSubscriptionGrantRequest;
import com.testmoa.backend.dto.request.PaymentRequest;
import com.testmoa.backend.entity.CreditWallet;
import com.testmoa.backend.entity.Payment;
import com.testmoa.backend.entity.Plan;
import com.testmoa.backend.entity.Subscription;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.security.Role;
import com.testmoa.backend.entity.CreditLedger;
import com.testmoa.backend.repository.CreditLedgerRepository;
import com.testmoa.backend.repository.CreditWalletRepository;
import com.testmoa.backend.repository.PlanRepository;
import com.testmoa.backend.repository.SubscriptionRepository;
import com.testmoa.backend.repository.UserRepository;
import com.testmoa.backend.service.admin.AdminSubscriptionService;
import com.testmoa.backend.service.my.PaymentService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;

/**
 * 결제와 운영자 구독 부여·해제가 같은 회원에 겹칠 때(#204-S24). 두 경로가 같은 "가장 늦은 end_at"을 읽으므로
 * 회원 행의 같은 잠금 안에서 차례로 처리되어야 한다. 결제가 구독 기간을 읽고 저장하는 사이에 멈추게 해서 그 틈에 운영자 작업을
 * 넣는다. 잠금이 같으면 운영자 작업이 기다리고(결제는 기다린 시간이 지나면 이어 간다), 다르면 운영자 작업이 먼저 끝난다.
 * 실제로 커밋해야 확인되는 것이라 테스트 트랜잭션을 쓰지 않고, 만든 데이터는 끝나면 지운다.
 */
@SpringBootTest
class SubscriptionLockConcurrencyTest {

    /** 운영자 작업이 먼저 끝나기를 결제가 기다리는 최대 시간. 잠금이 같으면 끝까지 기다리고 넘긴다 */
    private static final long PAUSE_SECONDS = 2;

    @Autowired UserRepository userRepository;
    @Autowired PlanRepository planRepository;
    @Autowired CreditWalletRepository creditWalletRepository;
    @Autowired PaymentService paymentService;
    @Autowired AdminSubscriptionService adminSubscriptionService;
    @Autowired JdbcTemplate jdbc;
    @Autowired SubscriptionRepository subscriptionRepository;
    @MockitoSpyBean CreditLedgerRepository creditLedgerRepository;

    private final List<Long> userIds = new ArrayList<>();
    private final List<Long> planIds = new ArrayList<>();

    @AfterEach
    void cleanUp() {
        for (Long userId : userIds) {
            jdbc.update("delete from credit_ledgers where credit_wallet_id in (select id from credit_wallets where user_id = ?)", userId);
            jdbc.update("delete from payments where subscription_id in (select id from subscriptions where user_id = ?)", userId);
            jdbc.update("delete from subscriptions where user_id = ?", userId);
            jdbc.update("delete from credit_wallets where user_id = ?", userId);
            jdbc.update("delete from users where id = ?", userId);
        }
        for (Long planId : planIds) {
            jdbc.update("delete from plans where id = ?", planId);
        }
    }

    private User saveUser() {
        User user = userRepository.save(User.builder()
                .name("한서윤")
                .nickname("t" + UUID.randomUUID().toString().substring(0, 8))
                .email(UUID.randomUUID() + "@example.com")
                .role(Role.USER)
                .status(UserStatus.ACTIVE)
                .build());
        userIds.add(user.getId());
        return user;
    }

    private Plan savePlan() {
        Plan plan = planRepository.save(Plan.builder()
                .tier("구독-" + UUID.randomUUID().toString().substring(0, 8))
                .cashPrice(10000).creditPrice(9000).periodDays(30).version(1).build());
        planIds.add(plan.getId());
        return plan;
    }

    /** 지갑이 이미 있고 10일 뒤에 끝나는 구독이 있는 회원 */
    private User subscribedUserWithWallet(Plan plan) {
        User user = saveUser();
        CreditWallet wallet = CreditWallet.builder().user(user).build();
        wallet.grantEvent(20000);
        creditWalletRepository.save(wallet);
        LocalDateTime now = LocalDateTime.now();
        subscriptionRepository.save(Subscription.builder()
                .user(user).plan(plan).startAt(now.minusDays(20)).endAt(now.plusDays(10)).build());
        return user;
    }

    /**
     * 결제와 운영자 작업을 겹친다. 결제가 구독 기간을 읽은 뒤(저장 전) 멈추고, 그 사이 운영자 작업을 시작한다.
     * 운영자 작업이 끝나면 결제가 이어 가고, 끝나지 않으면(잠금으로 기다리는 중이면) 기다린 시간이 지난 뒤 이어 간다.
     */
    private void payWhileAdminRuns(User user, Plan plan, Runnable adminWork) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            AtomicReference<Thread> payThread = new AtomicReference<>();
            CountDownLatch paymentRead = new CountDownLatch(1);
            CountDownLatch adminDone = new CountDownLatch(1);
            // 결제 스레드가 구독 기간을 읽고 새 기간을 저장한 뒤 크레딧 내역을 남기는 자리에서 멈춘다(기간은 이미 읽은 값이다).
            // 내역 저장은 이 테스트에서 실제로 하지 않는다. 운영자 작업은 내역을 남기지 않아 멈추지 않는다
            doAnswer(invocation -> {
                if (Thread.currentThread() == payThread.get()) {
                    paymentRead.countDown();
                    adminDone.await(PAUSE_SECONDS, TimeUnit.SECONDS);
                }
                return invocation.getArgument(0);
            }).when(creditLedgerRepository).save(any(CreditLedger.class));

            Future<?> payment = pool.submit(() -> {
                payThread.set(Thread.currentThread());
                return paymentService.pay(user.getId(), new PaymentRequest(plan.getId(), Payment.Method.CREDIT));
            });
            // 결제가 읽기 전에 실패했다면 기다리지 않고 그 이유를 던진다
            while (!paymentRead.await(100, TimeUnit.MILLISECONDS)) {
                if (payment.isDone()) {
                    payment.get();
                    throw new AssertionError("결제가 구독 기간을 읽지 않고 끝났다");
                }
            }
            Future<?> admin = pool.submit(() -> {
                try {
                    adminWork.run();
                } finally {
                    adminDone.countDown();
                }
            });
            payment.get(30, TimeUnit.SECONDS);
            admin.get(30, TimeUnit.SECONDS);
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    @DisplayName("#204-S24 결제와 운영자 부여가 겹쳐도 두 기간이 이어 붙는다(기존 10일 + 결제 30일 + 부여 30일 = 70일)")
    void grantAndPaymentAreSerialized() throws Exception {
        Plan plan = savePlan();
        User user = subscribedUserWithWallet(plan);

        payWhileAdminRuns(user, plan,
                () -> adminSubscriptionService.grant(new AdminSubscriptionGrantRequest(user.getEmail(), plan.getId())));

        List<LocalDateTime[]> periods = jdbc.query(
                "select start_at, end_at from subscriptions where user_id = ? order by start_at",
                (rs, i) -> new LocalDateTime[]{rs.getTimestamp(1).toLocalDateTime(), rs.getTimestamp(2).toLocalDateTime()},
                user.getId());
        assertEquals(3, periods.size());
        // 새 두 기간이 겹치지 않고 서로의 끝에서 시작한다
        assertEquals(periods.get(0)[1], periods.get(1)[0]);
        assertEquals(periods.get(1)[1], periods.get(2)[0]);
        long daysLeft = ChronoUnit.DAYS.between(LocalDateTime.now(), periods.get(2)[1]);
        assertTrue(daysLeft >= 69 && daysLeft <= 70, "남은 날 " + daysLeft);
    }

    @Test
    @DisplayName("#204-S24 결제와 운영자 해제가 겹치면 차례로 처리되어 끝나지 않은 기간이 남지 않는다")
    void revokeAndPaymentAreSerialized() throws Exception {
        Plan plan = savePlan();
        User user = subscribedUserWithWallet(plan);

        payWhileAdminRuns(user, plan, () -> adminSubscriptionService.revoke(user.getEmail()));

        // 결제가 먼저 끝난 뒤 해제가 그 기간까지 취소한다. 해제 뒤에 미래에 시작하는 ACTIVE 기간만 남으면 안 된다
        Integer active = jdbc.queryForObject(
                "select count(*) from subscriptions where user_id = ? and status = 'ACTIVE' and end_at > ?",
                Integer.class, user.getId(), LocalDateTime.now());
        assertEquals(0, active);
        assertEquals(1, jdbc.queryForObject("select count(*) from payments where subscription_id in (select id from subscriptions where user_id = ?)",
                Integer.class, user.getId()));
    }
}
