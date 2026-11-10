package com.testmoa.backend.service.my.impl;

import com.testmoa.backend.dto.request.PaymentRequest;
import com.testmoa.backend.entity.CreditLedger;
import com.testmoa.backend.entity.CreditWallet;
import com.testmoa.backend.entity.Payment;
import com.testmoa.backend.entity.Plan;
import com.testmoa.backend.entity.Subscription;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.global.security.Role;
import com.testmoa.backend.repository.CreditLedgerRepository;
import com.testmoa.backend.repository.CreditWalletRepository;
import com.testmoa.backend.repository.PaymentRepository;
import com.testmoa.backend.repository.PlanRepository;
import com.testmoa.backend.repository.SubscriptionRepository;
import com.testmoa.backend.repository.UserRepository;
import com.testmoa.backend.service.my.PaymentService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;

/**
 * 결제의 동시 처리와 롤백(#71-S6 지갑 없음·S7 더블클릭 경계·S8·S9·S10). 실제로 커밋해야 확인되는 것이라
 * 테스트 트랜잭션을 쓰지 않고, 만든 데이터는 끝나면 지운다.
 * S7 경계 테스트가 여기 있는 것은 시계를 바꿔 끼우는 생성자가 같은 패키지({@code service.impl})에서만 보이기 때문이다.
 */
@SpringBootTest
class PaymentConcurrencyTest {

    @Autowired UserRepository userRepository;
    @Autowired PlanRepository planRepository;
    @Autowired CreditWalletRepository creditWalletRepository;
    @Autowired SubscriptionRepository subscriptionRepository;
    @Autowired PaymentRepository paymentRepository;
    @Autowired PaymentService paymentService;
    @Autowired PlatformTransactionManager transactionManager;
    @Autowired JdbcTemplate jdbc;
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

    /** 이벤트 크레딧이 넉넉한 회원. 현금은 PG 승인을 거쳐야 해서 이 테스트의 결제는 크레딧으로 한다 */
    private User saveUserWithCredit() {
        User user = saveUser();
        CreditWallet wallet = CreditWallet.builder().user(user).build();
        wallet.grantEvent(100000);
        creditWalletRepository.save(wallet);
        return user;
    }

    private Plan savePlan() {
        Plan plan = planRepository.save(Plan.builder()
                .tier("구독-" + UUID.randomUUID().toString().substring(0, 8))
                .cashPrice(10000).creditPrice(9000).periodDays(30).version(1).build());
        planIds.add(plan.getId());
        return plan;
    }

    private int count(String table, String where, Object... args) {
        Integer n = jdbc.queryForObject("select count(*) from " + table + " where " + where, Integer.class, args);
        return n == null ? 0 : n;
    }

    /** 두 작업을 같은 순간에 시작시키고 결과(성공이면 null, 실패면 던진 예외)를 모은다 */
    private List<Throwable> runTogether(Callable<?> first, Callable<?> second) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            CountDownLatch ready = new CountDownLatch(2);
            CountDownLatch go = new CountDownLatch(1);
            List<Future<Throwable>> futures = new ArrayList<>();
            for (Callable<?> task : List.of(first, second)) {
                futures.add(pool.submit(() -> {
                    ready.countDown();
                    go.await();
                    try {
                        task.call();
                        return null;
                    } catch (Throwable e) {
                        return e;
                    }
                }));
            }
            ready.await();
            go.countDown();
            List<Throwable> results = new ArrayList<>();
            for (Future<Throwable> future : futures) {
                results.add(future.get(30, TimeUnit.SECONDS));
            }
            return results;
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    @DisplayName("#71-S8 같은 회원이 동시에 두 번 결제하면 하나만 되고 구독은 한 건이다")
    void concurrentPaymentsAllowOnlyOne() throws Exception {
        User user = saveUserWithCredit();
        Plan plan = savePlan();
        PaymentRequest request = new PaymentRequest(plan.getId(), Payment.Method.CREDIT);

        List<Throwable> results = runTogether(
                () -> paymentService.pay(user.getId(), request),
                () -> paymentService.pay(user.getId(), request));

        assertEquals(1, results.stream().filter(r -> r == null).count());
        Throwable failure = results.stream().filter(r -> r != null).findFirst().orElseThrow();
        assertEquals(ErrorCode.DUPLICATE_PAYMENT, ((BusinessException) failure).getErrorCode());
        assertEquals(1, count("subscriptions", "user_id = ?", user.getId()));
        assertEquals(1, count("credit_wallets", "user_id = ?", user.getId()));
    }

    @Test
    @DisplayName("#71-S8 더블클릭 시간을 지난 두 요청이 겹쳐도 차례로 처리되어 두 번째 시작이 첫 번째 끝과 같다")
    void overlappingRequestsAreSerialized() throws Exception {
        User user = saveUserWithCredit();
        Plan plan = savePlan();
        PaymentRequest request = new PaymentRequest(plan.getId(), Payment.Method.CREDIT);
        // 부를 때마다 10초씩 흐르는 시계라서 두 번째 요청은 더블클릭 시간을 지난 뒤에 온 것이 된다
        AtomicInteger calls = new AtomicInteger();
        Instant base = Instant.now();
        Clock clock = new Clock() {
            @Override public ZoneId getZone() { return ZoneId.systemDefault(); }
            @Override public Clock withZone(ZoneId zone) { return this; }
            @Override public Instant instant() { return base.plusSeconds(10L * calls.incrementAndGet()); }
        };
        PaymentServiceImpl service = new PaymentServiceImpl(userRepository, planRepository, creditWalletRepository,
                creditLedgerRepository, subscriptionRepository, paymentRepository, clock);
        TransactionTemplate tx = new TransactionTemplate(transactionManager);

        List<Throwable> results = runTogether(
                () -> tx.execute(status -> service.pay(user.getId(), request)),
                () -> tx.execute(status -> service.pay(user.getId(), request)));

        assertTrue(results.stream().allMatch(r -> r == null), results.toString());
        List<LocalDateTime[]> periods = jdbc.query(
                "select start_at, end_at from subscriptions where user_id = ? order by start_at",
                (rs, i) -> new LocalDateTime[]{
                        rs.getTimestamp(1).toLocalDateTime(), rs.getTimestamp(2).toLocalDateTime()},
                user.getId());
        assertEquals(2, periods.size());
        assertEquals(periods.get(0)[1], periods.get(1)[0]);
    }

    @Test
    @DisplayName("#71-S7 더블클릭 경계: 직전 결제가 정확히 5초 전이면 되고 4.999초 전이면 거절한다")
    void doubleClickBoundary() {
        Instant fixedNow = Instant.now().truncatedTo(java.time.temporal.ChronoUnit.SECONDS);
        Clock clock = Clock.fixed(fixedNow, ZoneId.systemDefault());
        LocalDateTime now = LocalDateTime.ofInstant(fixedNow, ZoneId.systemDefault());
        PaymentServiceImpl service = new PaymentServiceImpl(userRepository, planRepository, creditWalletRepository,
                creditLedgerRepository, subscriptionRepository, paymentRepository, clock);
        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        Plan plan = savePlan();
        PaymentRequest request = new PaymentRequest(plan.getId(), Payment.Method.CREDIT);

        User exactly = saveUserWithCredit();
        seedPayment(exactly, plan, now.minusSeconds(5));
        tx.execute(status -> service.pay(exactly.getId(), request));
        assertEquals(2, count("subscriptions", "user_id = ?", exactly.getId()));

        User justInside = saveUserWithCredit();
        seedPayment(justInside, plan, now.minusSeconds(5).plusNanos(1_000_000));
        BusinessException e = assertThrows(BusinessException.class,
                () -> tx.execute(status -> service.pay(justInside.getId(), request)));
        assertEquals(ErrorCode.DUPLICATE_PAYMENT, e.getErrorCode());
        assertEquals(1, count("subscriptions", "user_id = ?", justInside.getId()));
    }

    /** 지정한 시각에 결제한 것으로 결제·구독을 한 쌍 넣는다. 이용 기간은 아주 오래전이라 시작 계산에 영향이 없다 */
    private void seedPayment(User user, Plan plan, LocalDateTime paidAt) {
        Subscription subscription = subscriptionRepository.save(Subscription.builder()
                .user(user).plan(plan).startAt(paidAt.minusDays(60)).endAt(paidAt.minusDays(30)).build());
        paymentRepository.save(Payment.builder()
                .subscription(subscription).method(Payment.Method.CASH).amount(10000).paidAt(paidAt).build());
    }

    @Test
    @DisplayName("#71-S6 지갑이 없는 회원의 크레딧 결제는 409이고 만들었던 지갑도 남지 않는다")
    void creditWithoutWalletLeavesNoWallet() {
        User user = saveUser();
        Plan plan = savePlan();

        BusinessException e = assertThrows(BusinessException.class,
                () -> paymentService.pay(user.getId(), new PaymentRequest(plan.getId(), Payment.Method.CREDIT)));

        assertEquals(ErrorCode.INSUFFICIENT_CREDIT, e.getErrorCode());
        assertEquals(0, count("credit_wallets", "user_id = ?", user.getId()));
        assertEquals(0, count("subscriptions", "user_id = ?", user.getId()));
    }

    @Test
    @DisplayName("#71-S10 크레딧 내역 저장에서 실패하면 결제·구독·지갑 변동·내역이 모두 되돌려진다")
    void failureRollsEverythingBack() {
        User user = saveUser();
        Plan plan = savePlan();
        CreditWallet wallet = CreditWallet.builder().user(user).build();
        wallet.grantEvent(20000);
        creditWalletRepository.save(wallet);
        doThrow(new IllegalStateException("내역 저장 실패")).when(creditLedgerRepository).save(any(CreditLedger.class));

        assertThrows(IllegalStateException.class,
                () -> paymentService.pay(user.getId(), new PaymentRequest(plan.getId(), Payment.Method.CREDIT)));

        assertEquals(0, count("subscriptions", "user_id = ?", user.getId()));
        assertEquals(0, count("payments", "subscription_id in (select id from subscriptions where user_id = ?)", user.getId()));
        assertEquals(20000, jdbc.queryForObject("select event_credit from credit_wallets where user_id = ?", Integer.class, user.getId()));
        assertEquals(0, count("credit_ledgers", "credit_wallet_id = ?", wallet.getId()));
    }
}
