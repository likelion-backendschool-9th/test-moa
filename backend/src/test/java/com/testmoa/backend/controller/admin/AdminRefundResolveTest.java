package com.testmoa.backend.controller.admin;

import com.testmoa.backend.entity.Payment;
import com.testmoa.backend.entity.Plan;
import com.testmoa.backend.entity.Subscription;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.PaymentProvider;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.client.pg.KakaoPayGateway;
import com.testmoa.backend.global.client.pg.TossPaymentsGateway;
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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.sql.Timestamp;
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
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 환불 중으로 남은 결제 조회·정리(#281-S1~S7). 여러 번 커밋하고 동시성도 보므로 테스트 트랜잭션을 쓰지 않고 만든 데이터는 끝나면 지운다.
 * 정리는 PG를 부르지 않으므로 가짜 게이트웨이가 불리지 않는지도 본다.
 */
@SpringBootTest
@AutoConfigureMockMvc
class AdminRefundResolveTest {

    private static final String STUCK = "/api/v1/admin/payments/stuck-refunds";
    private static final String RESOLVE = "/api/v1/admin/payments/%d/refund/resolve";
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
                .tier("정리-" + UUID.randomUUID().toString().substring(0, 8)).cashPrice(10000).creditPrice(9000).periodDays(30).version(1).build());
        planIds.add(plan.getId());
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

    /** 카카오 결제 하나. status와 마지막 갱신 시각(몇 분 전)을 직접 맞춘다 */
    private Payment payment(String status, int updatedMinutesAgo) {
        LocalDateTime start = LocalDateTime.now().minusMinutes(60);
        Subscription subscription = subscriptionRepository.save(Subscription.builder()
                .user(member).plan(plan).startAt(start).endAt(start.plusDays(30)).build());
        Payment payment = paymentRepository.save(Payment.builder()
                .subscription(subscription).method(Payment.Method.CASH).provider(PaymentProvider.KAKAO_PAY)
                .pgTransactionId("T-" + UUID.randomUUID().toString().substring(0, 8))
                .amount(10000).paidAt(start).build());
        jdbc.update("update payments set status = ?, updated_at = ? where id = ?", status,
                Timestamp.valueOf(LocalDateTime.now().minusMinutes(updatedMinutesAgo)), payment.getId());
        return payment;
    }

    private ResultActions resolve(User by, Long paymentId, boolean canceled) throws Exception {
        return mvc.perform(post(String.format(RESOLVE, paymentId)).header("Authorization", bearer(by))
                .contentType(MediaType.APPLICATION_JSON).content("{\"canceled\":" + canceled + "}"));
    }

    private String paymentStatus(Long id) {
        return jdbc.queryForObject("select status from payments where id = ?", String.class, id);
    }

    private String subscriptionStatus(Payment payment) {
        return jdbc.queryForObject("select status from subscriptions where id = ?", String.class, payment.getSubscription().getId());
    }

    @Test
    @DisplayName("#281-S1 오래 멈춘 환불 중 결제와 환불 실패 결제만 조회된다")
    void listsOnlyStuckRefunding() throws Exception {
        Payment stuck = payment("REFUNDING", 30);
        Payment stuckNewer = payment("REFUNDING", 20);
        Payment refundFailed = payment("REFUND_FAILED", 1);
        Payment justStarted = payment("REFUNDING", 1);
        Payment completed = payment("COMPLETED", 30);
        Payment refunded = payment("REFUNDED", 30);

        String body = mvc.perform(get(STUCK).header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        List<Integer> ids = com.jayway.jsonpath.JsonPath.read(body, "$.data[*].paymentId");
        List<Long> mine = ids.stream().map(Integer::longValue)
                .filter(id -> List.of(stuck.getId(), stuckNewer.getId(), refundFailed.getId(), justStarted.getId(), completed.getId(), refunded.getId()).contains(id))
                .toList();
        assertEquals(List.of(refundFailed.getId(), stuckNewer.getId(), stuck.getId()), mine);
        List<String> emails = com.jayway.jsonpath.JsonPath.read(body, "$.data[?(@.paymentId==" + stuck.getId() + ")].userEmail");
        assertEquals(List.of(member.getEmail()), emails);
    }

    @Test
    @DisplayName("#281-S2 PG에서 취소됐다고 정리하면 결제 REFUNDED, 구독 CANCELLED이고 처리 운영자가 남으며 PG는 부르지 않는다")
    void resolveCanceled() throws Exception {
        Payment payment = payment("REFUNDING", 30);

        resolve(admin, payment.getId(), true)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("REFUNDED"))
                .andExpect(jsonPath("$.data.refundedAt").exists());

        assertEquals("REFUNDED", paymentStatus(payment.getId()));
        assertEquals("CANCELLED", subscriptionStatus(payment));
        assertEquals(admin.getId(), jdbc.queryForObject("select refunded_by from payments where id = ?", Long.class, payment.getId()));
        verify(kakaoPay, never()).cancel(any());
        verify(tossPay, never()).cancel(any());
    }

    @Test
    @DisplayName("#281-S3 PG에서 취소되지 않았다고 정리하면 REFUND_FAILED로 돌아가 구독은 그대로이고 다시 환불할 수 있다")
    void resolveNotCanceled() throws Exception {
        Payment payment = payment("REFUNDING", 30);

        resolve(admin, payment.getId(), false)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("REFUND_FAILED"));
        assertNull(jdbc.queryForObject("select refunded_by from payments where id = ?", Long.class, payment.getId()));
        assertEquals("ACTIVE", subscriptionStatus(payment));

        mvc.perform(post(String.format(REFUND, payment.getId())).header("Authorization", bearer(admin)))
                .andExpect(status().isOk());
        assertEquals("REFUNDED", paymentStatus(payment.getId()));
        assertEquals("CANCELLED", subscriptionStatus(payment));
    }

    @Test
    @DisplayName("#281-S3 이미 REFUND_FAILED인 결제에 canceled=false를 보내도 바뀌지 않고 200이다")
    void resolveNotCanceledOnRefundFailed() throws Exception {
        Payment payment = payment("REFUND_FAILED", 30);

        resolve(admin, payment.getId(), false)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("REFUND_FAILED"));
        assertEquals("REFUND_FAILED", paymentStatus(payment.getId()));
        assertEquals("ACTIVE", subscriptionStatus(payment));
    }

    @Test
    @DisplayName("#281-S4 PG에서는 취소됐는데 REFUND_FAILED로 남은 결제도 정리된다")
    void resolveRefundFailed() throws Exception {
        Payment payment = payment("REFUND_FAILED", 30);

        resolve(admin, payment.getId(), true).andExpect(status().isOk());

        assertEquals("REFUNDED", paymentStatus(payment.getId()));
        assertEquals("CANCELLED", subscriptionStatus(payment));
    }

    @Test
    @DisplayName("#281-S5 정리할 수 없는 결제는 거절한다")
    void notResolvable() throws Exception {
        Payment completed = payment("COMPLETED", 30);
        Payment refunded = payment("REFUNDED", 30);
        Payment justStarted = payment("REFUNDING", 1);
        Payment credit = payment("COMPLETED", 30);
        jdbc.update("update payments set method = 'CREDIT', provider = null, pg_transaction_id = null where id = ?", credit.getId());

        for (Payment p : List.of(completed, refunded, justStarted)) {
            resolve(admin, p.getId(), true)
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.error.code").value("PAYMENT_NOT_REFUNDABLE"));
        }
        resolve(admin, credit.getId(), true).andExpect(status().isBadRequest());
        resolve(admin, 999_999_999L, true).andExpect(status().isNotFound());

        assertEquals("REFUNDING", paymentStatus(justStarted.getId()));
        assertEquals("ACTIVE", subscriptionStatus(justStarted));
        // 본문이 없으면 400
        mvc.perform(post(String.format(RESOLVE, completed.getId())).header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("#281-S6 같은 결제를 동시에 정리해도 한쪽만 처리된다")
    void concurrentResolveOnlyOnce() throws Exception {
        Payment payment = payment("REFUNDING", 30);

        List<Integer> statuses = runConcurrently(
                () -> resolve(admin, payment.getId(), true).andReturn().getResponse().getStatus(),
                () -> resolve(admin, payment.getId(), true).andReturn().getResponse().getStatus());

        assertTrue(statuses.contains(200) && statuses.contains(409), "응답: " + statuses);
        assertEquals("REFUNDED", paymentStatus(payment.getId()));
    }

    @Test
    @DisplayName("#281-S7 운영자가 아니면 조회·정리할 수 없다")
    void adminOnly() throws Exception {
        Payment payment = payment("REFUNDING", 30);

        mvc.perform(get(STUCK).header("Authorization", bearer(member))).andExpect(status().isForbidden());
        resolve(member, payment.getId(), true).andExpect(status().isForbidden());
        mvc.perform(get(STUCK)).andExpect(status().isUnauthorized());
        mvc.perform(post(String.format(RESOLVE, payment.getId())).contentType(MediaType.APPLICATION_JSON)
                .content("{\"canceled\":true}")).andExpect(status().isUnauthorized());
        assertEquals("REFUNDING", paymentStatus(payment.getId()));
    }

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
