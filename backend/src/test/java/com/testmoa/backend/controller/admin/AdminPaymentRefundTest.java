package com.testmoa.backend.controller.admin;

import com.jayway.jsonpath.JsonPath;
import com.testmoa.backend.entity.Payment;
import com.testmoa.backend.entity.Plan;
import com.testmoa.backend.entity.Subscription;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.PaymentProvider;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.client.pg.KakaoPayGateway;
import com.testmoa.backend.global.client.pg.PaymentGateway;
import com.testmoa.backend.global.client.pg.TossPaymentsGateway;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.global.security.JwtProvider;
import com.testmoa.backend.global.security.Role;
import com.testmoa.backend.repository.PaymentRepository;
import com.testmoa.backend.repository.PlanRepository;
import com.testmoa.backend.repository.SubscriptionRepository;
import com.testmoa.backend.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 운영자 결제 환불(#275-S1~S9). 환불이 여러 번 커밋하고 동시성도 보므로 테스트 트랜잭션을 쓰지 않고, 만든 데이터는 끝나면 지운다.
 * PG 서버는 부르지 않고 두 게이트웨이를 가짜로 바꿔 끼운다.
 */
@SpringBootTest
@AutoConfigureMockMvc
class AdminPaymentRefundTest {

    private static final String REFUND = "/api/v1/admin/payments/%d/refund";

    @Autowired MockMvc mvc;
    @Autowired JwtProvider jwtProvider;
    @Autowired UserRepository userRepository;
    @Autowired PlanRepository planRepository;
    @Autowired SubscriptionRepository subscriptionRepository;
    @Autowired PaymentRepository paymentRepository;
    @Autowired JdbcTemplate jdbc;
    @MockitoBean KakaoPayGateway kakaoPay;
    @MockitoBean TossPaymentsGateway tossPay;

    private final List<Long> userIds = new ArrayList<>();
    private final List<Long> planIds = new ArrayList<>();
    private User admin;
    private User member;
    private Plan plan;

    @BeforeEach
    void setUp() {
        admin = saveUser(Role.ADMIN);
        member = saveUser(Role.USER);
        plan = planRepository.save(Plan.builder()
                .tier("환불-" + UUID.randomUUID().toString().substring(0, 8)).cashPrice(10000).creditPrice(9000).periodDays(30).version(1).build());
        planIds.add(plan.getId());
        when(kakaoPay.available()).thenReturn(true);
        when(tossPay.available()).thenReturn(true);
        when(kakaoPay.ready(any())).thenReturn(new PaymentGateway.Ready("T-NEW", "https://pc.example/pay", "https://m.example/pay", null, null));
        when(kakaoPay.approve(any())).thenReturn(new PaymentGateway.Approved("T-NEW"));
    }

    @AfterEach
    void cleanUp() {
        for (Long userId : userIds) {
            jdbc.update("delete from payment_attempts where user_id = ?", userId);
            jdbc.update("delete from payments where subscription_id in (select id from subscriptions where user_id = ?)", userId);
            jdbc.update("delete from subscriptions where user_id = ?", userId);
            jdbc.update("delete from credit_ledgers where credit_wallet_id in (select id from credit_wallets where user_id = ?)", userId);
            jdbc.update("delete from credit_wallets where user_id = ?", userId);
            jdbc.update("delete from users where id = ?", userId);
        }
        for (Long planId : planIds) {
            jdbc.update("delete from plans where id = ?", planId);
        }
    }

    private User saveUser(Role role) {
        User user = userRepository.save(User.builder()
                .name("한서윤")
                .nickname("t" + UUID.randomUUID().toString().substring(0, 8))
                .email(UUID.randomUUID() + "@example.com")
                .role(role)
                .status(UserStatus.ACTIVE)
                .build());
        userIds.add(user.getId());
        return user;
    }

    private String bearer(User user) {
        return "Bearer " + jwtProvider.createAccessToken(user.getId());
    }

    private Subscription subscription(LocalDateTime start) {
        return subscriptionRepository.save(Subscription.builder()
                .user(member).plan(plan).startAt(start).endAt(start.plusDays(30)).build());
    }

    private Payment payment(Subscription subscription, Payment.Method method, PaymentProvider provider, String tid) {
        return paymentRepository.save(Payment.builder()
                .subscription(subscription).method(method).provider(provider).pgTransactionId(tid)
                .amount(10000).paidAt(LocalDateTime.now().minusMinutes(10)).build());
    }

    private Payment kakaoPayment() {
        return payment(subscription(LocalDateTime.now().minusMinutes(10)), Payment.Method.CASH, PaymentProvider.KAKAO_PAY, "T-OLD");
    }

    private ResultActions refund(User by, Long paymentId) throws Exception {
        return mvc.perform(post(String.format(REFUND, paymentId)).header("Authorization", bearer(by)));
    }

    private String paymentStatus(Long id) {
        return jdbc.queryForObject("select status from payments where id = ?", String.class, id);
    }

    private String subscriptionStatus(Subscription s) {
        return jdbc.queryForObject("select status from subscriptions where id = ?", String.class, s.getId());
    }

    private int walletCount() {
        Integer n = jdbc.queryForObject("select count(*) from credit_wallets where user_id = ?", Integer.class, member.getId());
        return n == null ? 0 : n;
    }

    @Test
    @DisplayName("#275-S1 운영자가 카카오페이 결제를 환불하면 결제는 REFUNDED, 구독은 CANCELLED이고 PG 취소가 한 번 불린다")
    void refundsKakao() throws Exception {
        Payment payment = kakaoPayment();
        int walletsBefore = walletCount();

        refund(admin, payment.getId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.paymentId").value(payment.getId()))
                .andExpect(jsonPath("$.data.status").value("REFUNDED"))
                .andExpect(jsonPath("$.data.refundedAt").exists());

        ArgumentCaptor<PaymentGateway.CancelCommand> captor = ArgumentCaptor.forClass(PaymentGateway.CancelCommand.class);
        verify(kakaoPay, times(1)).cancel(captor.capture());
        assertEquals("T-OLD", captor.getValue().pgTransactionId());
        assertEquals(10000, captor.getValue().amount());
        assertEquals("REFUNDED", paymentStatus(payment.getId()));
        assertEquals("CANCELLED", subscriptionStatus(payment.getSubscription()));
        assertEquals(walletsBefore, walletCount());
        // #276-S5 환불한 운영자가 남는다
        assertEquals(admin.getId(), jdbc.queryForObject("select refunded_by from payments where id = ?", Long.class, payment.getId()));
    }

    @Test
    @DisplayName("#275-S1 토스 결제도 같다")
    void refundsToss() throws Exception {
        Payment payment = payment(subscription(LocalDateTime.now().minusMinutes(10)),
                Payment.Method.CASH, PaymentProvider.TOSS_PAY, "PK-OLD");

        refund(admin, payment.getId()).andExpect(status().isOk());

        ArgumentCaptor<PaymentGateway.CancelCommand> captor = ArgumentCaptor.forClass(PaymentGateway.CancelCommand.class);
        verify(tossPay, times(1)).cancel(captor.capture());
        verify(kakaoPay, never()).cancel(any());
        assertEquals("PK-OLD", captor.getValue().pgTransactionId());
        assertEquals("REFUNDED", paymentStatus(payment.getId()));
        assertEquals("CANCELLED", subscriptionStatus(payment.getSubscription()));
    }

    @Test
    @DisplayName("#275-S2 이미 환불한 결제를 다시 환불하면 409이고 PG를 부르지 않는다")
    void refundTwiceIsConflict() throws Exception {
        Payment payment = kakaoPayment();
        refund(admin, payment.getId()).andExpect(status().isOk());

        refund(admin, payment.getId())
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("PAYMENT_NOT_REFUNDABLE"));
        verify(kakaoPay, times(1)).cancel(any());
    }

    @Test
    @DisplayName("#275-S3 같은 결제를 동시에 두 번 환불해도 한쪽만 처리되고 PG 취소는 한 번만 불린다")
    void concurrentRefundOnlyOnce() throws Exception {
        Payment payment = kakaoPayment();
        // 취소 호출이 끝나기 전에 두 번째 요청이 들어오도록 잠시 붙잡는다
        doAnswer(invocation -> {
            Thread.sleep(300);
            return null;
        }).when(kakaoPay).cancel(any());

        List<Integer> statuses = runConcurrently(
                () -> refund(admin, payment.getId()).andReturn().getResponse().getStatus(),
                () -> refund(admin, payment.getId()).andReturn().getResponse().getStatus());

        assertTrue(statuses.contains(200) && statuses.contains(409), "응답: " + statuses);
        verify(kakaoPay, times(1)).cancel(any());
        assertEquals("REFUNDED", paymentStatus(payment.getId()));
    }

    @Test
    @DisplayName("#275-S4 PG 취소가 거절되면 REFUND_FAILED이고 구독은 그대로이며, 다시 환불하면 된다")
    void pgRejectsThenRetry() throws Exception {
        Payment payment = kakaoPayment();
        doThrow(new BusinessException(ErrorCode.PG_CANCEL_FAILED)).when(kakaoPay).cancel(any());

        refund(admin, payment.getId())
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.error.code").value("PG_CANCEL_FAILED"));
        assertEquals("REFUND_FAILED", paymentStatus(payment.getId()));
        assertEquals("ACTIVE", subscriptionStatus(payment.getSubscription()));

        doAnswer(invocation -> null).when(kakaoPay).cancel(any());
        refund(admin, payment.getId()).andExpect(status().isOk());
        assertEquals("REFUNDED", paymentStatus(payment.getId()));
        assertEquals("CANCELLED", subscriptionStatus(payment.getSubscription()));
    }

    @Test
    @DisplayName("#275-S5 크레딧 결제와 PG 연동 전의 현금 결제는 400, 없는 결제는 404이고 PG를 부르지 않는다")
    void notRefundable() throws Exception {
        Payment credit = payment(subscription(LocalDateTime.now().minusMinutes(10)), Payment.Method.CREDIT, null, null);
        Payment oldCash = payment(subscription(LocalDateTime.now().plusDays(40)), Payment.Method.CASH, null, null);

        refund(admin, credit.getId()).andExpect(status().isBadRequest()).andExpect(jsonPath("$.error.code").value("INVALID_INPUT"));
        refund(admin, oldCash.getId()).andExpect(status().isBadRequest());
        refund(admin, 999_999_999L).andExpect(status().isNotFound());

        verify(kakaoPay, never()).cancel(any());
        verify(tossPay, never()).cancel(any());
        assertEquals("COMPLETED", paymentStatus(credit.getId()));
    }

    @Test
    @DisplayName("#275-S6 일반 회원은 403이고 토큰이 없으면 401이다")
    void onlyAdmin() throws Exception {
        Payment payment = kakaoPayment();

        refund(member, payment.getId()).andExpect(status().isForbidden());
        mvc.perform(post(String.format(REFUND, payment.getId()))).andExpect(status().isUnauthorized());

        verify(kakaoPay, never()).cancel(any());
        assertEquals("COMPLETED", paymentStatus(payment.getId()));
    }

    @Test
    @DisplayName("#275-S7 같은 회원의 다른 구독은 환불로 해제되지 않는다")
    void otherSubscriptionStays() throws Exception {
        Payment first = kakaoPayment();
        Subscription second = subscription(first.getSubscription().getEndAt());
        payment(second, Payment.Method.CASH, PaymentProvider.KAKAO_PAY, "T-SECOND");

        refund(admin, first.getId()).andExpect(status().isOk());

        assertEquals("CANCELLED", subscriptionStatus(first.getSubscription()));
        assertEquals("ACTIVE", subscriptionStatus(second));
    }

    @Test
    @DisplayName("#275-S8 환불과 운영자 구독 해제가 동시에 와도 교착 없이 끝나고 구독은 해제된 상태다")
    void refundAndRevokeInOrder() throws Exception {
        Payment payment = kakaoPayment();
        doAnswer(invocation -> {
            Thread.sleep(300);
            return null;
        }).when(kakaoPay).cancel(any());

        List<Integer> statuses = runConcurrently(
                () -> refund(admin, payment.getId()).andReturn().getResponse().getStatus(),
                () -> mvc.perform(delete("/api/v1/admin/subscriptions").param("email", member.getEmail())
                        .header("Authorization", bearer(admin))).andReturn().getResponse().getStatus());

        assertEquals(List.of(200, 200), statuses);
        assertEquals("CANCELLED", subscriptionStatus(payment.getSubscription()));
        assertEquals("REFUNDED", paymentStatus(payment.getId()));
    }

    @Test
    @DisplayName("#275-S8 환불과 같은 회원의 PG 결제 승인이 동시에 와도 교착 없이 끝나고 새 구독은 ACTIVE, 환불한 구독은 CANCELLED다")
    void refundAndApproveInOrder() throws Exception {
        Payment payment = kakaoPayment();
        String ready = mvc.perform(post("/api/v1/my/subscription/checkout/ready").header("Authorization", bearer(member))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"planId\":" + plan.getId() + ",\"provider\":\"KAKAO_PAY\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String orderId = JsonPath.read(ready, "$.data.orderId");
        doAnswer(invocation -> {
            Thread.sleep(300);
            return null;
        }).when(kakaoPay).cancel(any());

        List<Integer> statuses = runConcurrently(
                () -> refund(admin, payment.getId()).andReturn().getResponse().getStatus(),
                () -> mvc.perform(post("/api/v1/my/subscription/checkout/approve").header("Authorization", bearer(member))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"orderId\":\"" + orderId + "\",\"pgToken\":\"pg-token-1\"}"))
                        .andReturn().getResponse().getStatus());

        assertEquals(List.of(200, 201), statuses);
        assertEquals("REFUNDED", paymentStatus(payment.getId()));
        assertEquals("CANCELLED", subscriptionStatus(payment.getSubscription()));
        Integer active = jdbc.queryForObject(
                "select count(*) from subscriptions where user_id = ? and status = 'ACTIVE'", Integer.class, member.getId());
        assertEquals(1, active);
    }

    @Test
    @DisplayName("#275-S9 환불 뒤 다시 결제하면 새 결제와 구독이 만들어진다")
    void payAgainAfterRefund() throws Exception {
        Payment payment = kakaoPayment();
        refund(admin, payment.getId()).andExpect(status().isOk());

        String ready = mvc.perform(post("/api/v1/my/subscription/checkout/ready").header("Authorization", bearer(member))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"planId\":" + plan.getId() + ",\"provider\":\"KAKAO_PAY\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String orderId = JsonPath.read(ready, "$.data.orderId");
        mvc.perform(post("/api/v1/my/subscription/checkout/approve").header("Authorization", bearer(member))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"orderId\":\"" + orderId + "\",\"pgToken\":\"pg-token-1\"}"))
                .andExpect(status().isCreated());

        Integer payments = jdbc.queryForObject(
                "select count(*) from payments where subscription_id in (select id from subscriptions where user_id = ?)",
                Integer.class, member.getId());
        Integer active = jdbc.queryForObject(
                "select count(*) from subscriptions where user_id = ? and status = 'ACTIVE'", Integer.class, member.getId());
        assertEquals(2, payments);
        assertEquals(1, active);
    }

    /** 두 작업을 동시에 시작하고 결과 값을 모은다 */
    @SafeVarargs
    private static List<Integer> runConcurrently(Callable<Integer>... tasks) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(tasks.length);
        CountDownLatch start = new CountDownLatch(1);
        try {
            List<Future<Integer>> futures = new ArrayList<>();
            for (Callable<Integer> task : tasks) {
                futures.add(pool.submit(() -> {
                    start.await();
                    return task.call();
                }));
            }
            start.countDown();
            List<Integer> results = new ArrayList<>();
            for (Future<Integer> future : futures) {
                results.add(future.get(30, TimeUnit.SECONDS));
            }
            return results;
        } finally {
            pool.shutdownNow();
        }
    }
}
