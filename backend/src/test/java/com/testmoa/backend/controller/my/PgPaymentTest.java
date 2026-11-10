package com.testmoa.backend.controller.my;

import com.jayway.jsonpath.JsonPath;
import com.testmoa.backend.dto.request.PgApproveRequest;
import com.testmoa.backend.dto.request.PgReadyRequest;
import com.testmoa.backend.entity.CreditWallet;
import com.testmoa.backend.entity.Payment;
import com.testmoa.backend.entity.Plan;
import com.testmoa.backend.entity.Subscription;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.PaymentProvider;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.client.pg.KakaoPayGateway;
import com.testmoa.backend.global.client.pg.PaymentGateway;
import com.testmoa.backend.global.client.pg.PaymentProperties;
import com.testmoa.backend.global.client.pg.TossPaymentsGateway;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.global.security.JwtProvider;
import com.testmoa.backend.global.security.Role;
import com.testmoa.backend.repository.CreditWalletRepository;
import com.testmoa.backend.repository.PaymentRepository;
import com.testmoa.backend.repository.PlanRepository;
import com.testmoa.backend.repository.SubscriptionRepository;
import com.testmoa.backend.repository.UserRepository;
import com.testmoa.backend.service.my.PgPaymentService;
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
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 구독 현금 결제의 준비·승인(#249-S1~S8, S10~S12). PG 서버는 부르지 않고 두 게이트웨이를 가짜로 바꿔 끼운다.
 * 승인이 여러 번 커밋하는 흐름이라 테스트 트랜잭션을 쓰지 않고, 만든 데이터는 끝나면 지운다.
 */
@SpringBootTest
@AutoConfigureMockMvc
class PgPaymentTest {

    private static final String READY = "/api/v1/my/subscription/checkout/ready";
    private static final String APPROVE = "/api/v1/my/subscription/checkout/approve";
    private static final String PAYMENTS = "/api/v1/my/subscription/payments";

    @Autowired MockMvc mvc;
    @Autowired JwtProvider jwtProvider;
    @Autowired UserRepository userRepository;
    @Autowired PlanRepository planRepository;
    @Autowired SubscriptionRepository subscriptionRepository;
    @Autowired CreditWalletRepository creditWalletRepository;
    @Autowired PaymentProperties paymentProperties;
    @Autowired PgPaymentService pgPaymentService;
    @Autowired JdbcTemplate jdbc;
    @MockitoBean KakaoPayGateway kakaoPay;
    @MockitoBean TossPaymentsGateway tossPay;
    @MockitoSpyBean PaymentRepository paymentRepository;

    private final List<Long> userIds = new ArrayList<>();
    private final List<Long> planIds = new ArrayList<>();
    private Plan plan;

    @BeforeEach
    void setUp() {
        plan = savePlan(1, "구독-" + UUID.randomUUID().toString().substring(0, 8));
        when(kakaoPay.available()).thenReturn(true);
        when(tossPay.available()).thenReturn(true);
        when(kakaoPay.ready(any())).thenReturn(new PaymentGateway.Ready("T-1", "https://pc.example/pay", "https://m.example/pay", null, null));
        when(kakaoPay.approve(any())).thenReturn(new PaymentGateway.Approved("T-1"));
        when(tossPay.ready(any())).thenReturn(new PaymentGateway.Ready(null, null, null, "test_ck_fake", "moa-customer-key-0123456789"));
        when(tossPay.approve(any())).thenAnswer(invocation ->
                new PaymentGateway.Approved(((PaymentGateway.ApproveCommand) invocation.getArgument(0)).paymentKey()));
    }

    @AfterEach
    void cleanUp() {
        for (Long userId : userIds) {
            jdbc.update("delete from payment_attempts where user_id = ?", userId);
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

    private Plan savePlan(int version, String tier) {
        Plan saved = planRepository.save(Plan.builder()
                .tier(tier).cashPrice(10000).creditPrice(9000).periodDays(30).version(version).build());
        planIds.add(saved.getId());
        return saved;
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

    private ResultActions ready(User user, Long planId, String provider) throws Exception {
        String body = "{\"planId\":" + planId + ",\"provider\":\"" + provider + "\"}";
        return mvc.perform(post(READY).header("Authorization", bearer(user)).contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private ResultActions approve(User user, String body) throws Exception {
        return mvc.perform(post(APPROVE).header("Authorization", bearer(user)).contentType(MediaType.APPLICATION_JSON).content(body));
    }

    /** 결제 준비를 마치고 주문번호를 돌려준다 */
    private String readied(User user, String provider) throws Exception {
        String json = ready(user, plan.getId(), provider).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(json, "$.data.orderId");
    }

    private String kakaoApproval(String orderId) {
        return "{\"orderId\":\"" + orderId + "\",\"pgToken\":\"pg-token-1\"}";
    }

    private String tossApproval(String orderId, int amount) {
        return "{\"orderId\":\"" + orderId + "\",\"paymentKey\":\"PK-1\",\"amount\":" + amount + "}";
    }

    private int count(String table, String where, Object... args) {
        Integer n = jdbc.queryForObject("select count(*) from " + table + " where " + where, Integer.class, args);
        return n == null ? 0 : n;
    }

    private String attemptStatus(String orderId) {
        return jdbc.queryForObject("select status from payment_attempts where order_id = ?", String.class, orderId);
    }

    @Test
    @DisplayName("#249-S1 카카오페이 결제 준비는 서버 금액으로 시도를 저장하고 결제창 주소를 준다")
    void kakaoReady() throws Exception {
        User user = saveUser(Role.USER);

        String json = ready(user, plan.getId(), "KAKAO_PAY")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.provider").value("KAKAO_PAY"))
                .andExpect(jsonPath("$.data.amount").value(10000))
                .andExpect(jsonPath("$.data.orderName").value(plan.getTier()))
                .andExpect(jsonPath("$.data.redirectUrl").value("https://pc.example/pay"))
                .andExpect(jsonPath("$.data.mobileRedirectUrl").value("https://m.example/pay"))
                .andExpect(jsonPath("$.data.clientKey").doesNotExist())
                .andReturn().getResponse().getContentAsString();

        String orderId = JsonPath.read(json, "$.data.orderId");
        assertTrue(orderId.startsWith("MOA"));
        assertEquals("PENDING", attemptStatus(orderId));
        assertEquals(10000, jdbc.queryForObject("select amount from payment_attempts where order_id = ?", Integer.class, orderId));
        assertEquals("T-1", jdbc.queryForObject("select pg_transaction_id from payment_attempts where order_id = ?", String.class, orderId));
        // 구독과 결제는 아직 없다
        assertEquals(0, count("subscriptions", "user_id = ?", user.getId()));

        ArgumentCaptor<PaymentGateway.ReadyCommand> captor = ArgumentCaptor.forClass(PaymentGateway.ReadyCommand.class);
        verify(kakaoPay).ready(captor.capture());
        PaymentGateway.ReadyCommand command = captor.getValue();
        assertEquals(10000, command.amount());
        assertEquals(orderId, command.orderId());
        String base = paymentProperties.returnBaseUrl();
        assertEquals(base + "/my/subscription/checkout/result?orderId=" + orderId, command.successUrl());
        assertEquals(base + "/my/subscription/checkout?pg=cancel", command.cancelUrl());
        assertEquals(base + "/my/subscription/checkout?pg=fail", command.failUrl());
    }

    @Test
    @DisplayName("#249-S2 토스 결제 준비는 결제창을 여는 값만 주고 시크릿 키는 응답에 없다")
    void tossReady() throws Exception {
        User user = saveUser(Role.USER);

        String body = ready(user, plan.getId(), "TOSS_PAY")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.provider").value("TOSS_PAY"))
                .andExpect(jsonPath("$.data.amount").value(10000))
                .andExpect(jsonPath("$.data.clientKey").value("test_ck_fake"))
                .andExpect(jsonPath("$.data.customerKey").value("moa-customer-key-0123456789"))
                .andExpect(jsonPath("$.data.redirectUrl").doesNotExist())
                .andExpect(jsonPath("$.data.successUrl").value(paymentProperties.returnBaseUrl() + "/my/subscription/checkout/result"))
                .andExpect(jsonPath("$.data.failUrl").value(paymentProperties.returnBaseUrl() + "/my/subscription/checkout?pg=fail"))
                .andReturn().getResponse().getContentAsString();

        assertFalse(body.toLowerCase().contains("secret"));
        assertEquals(1, count("payment_attempts", "user_id = ? and status = 'PENDING' and provider = 'TOSS_PAY'", user.getId()));
    }

    @Test
    @DisplayName("#249-S3 결제 준비의 입력과 대상을 검사한다")
    void readyValidation() throws Exception {
        User user = saveUser(Role.USER);
        String auth = bearer(user);

        for (String body : new String[]{
                "{\"provider\":\"KAKAO_PAY\"}",
                "{\"planId\":" + plan.getId() + "}",
                "{\"planId\":" + plan.getId() + ",\"provider\":\"PAYCO\"}",
                "{\"planId\":\"abc\",\"provider\":\"KAKAO_PAY\"}",
                "{}"}) {
            mvc.perform(post(READY).header("Authorization", auth).contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"));
        }
        ready(user, 999_999_999L, "KAKAO_PAY").andExpect(status().isNotFound());
        planRepository.save(Plan.builder().tier(plan.getTier()).cashPrice(10000).creditPrice(9000).periodDays(30).version(2).build());
        ready(user, plan.getId(), "KAKAO_PAY").andExpect(status().isNotFound());
        planIds.add(planRepository.findAll().stream().filter(p -> p.getTier().equals(plan.getTier()) && p.getVersion() == 2).findFirst().orElseThrow().getId());

        User admin = saveUser(Role.ADMIN);
        ready(admin, plan.getId(), "KAKAO_PAY")
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.message").value("운영자 계정은 구독 대상이 아니에요"));
        mvc.perform(post(READY).contentType(MediaType.APPLICATION_JSON).content("{\"planId\":1,\"provider\":\"KAKAO_PAY\"}"))
                .andExpect(status().isUnauthorized());

        assertEquals(0, count("payment_attempts", "user_id in (?, ?)", user.getId(), admin.getId()));
    }

    @Test
    @DisplayName("#249-S4 키가 없는 결제 대행사는 503이고 결제 화면 조회의 providers에서 빠진다")
    void unavailableProvider() throws Exception {
        User user = saveUser(Role.USER);
        when(kakaoPay.available()).thenReturn(false);

        ready(user, plan.getId(), "KAKAO_PAY")
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.error.code").value("PG_UNAVAILABLE"));
        verify(kakaoPay, never()).ready(any());
        assertEquals(0, count("payment_attempts", "user_id = ?", user.getId()));

        mvc.perform(get("/api/v1/my/subscription/checkout").param("planId", String.valueOf(plan.getId()))
                        .header("Authorization", bearer(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.providers.length()").value(1))
                .andExpect(jsonPath("$.data.providers[0]").value("TOSS_PAY"));

        when(tossPay.available()).thenReturn(false);
        mvc.perform(get("/api/v1/my/subscription/checkout").param("planId", String.valueOf(plan.getId()))
                        .header("Authorization", bearer(user)))
                .andExpect(jsonPath("$.data.providers.length()").value(0));
    }

    @Test
    @DisplayName("#249-S5 카카오페이 승인은 결제 한 건과 구독 한 건을 짝으로 저장하고 시도를 APPROVED로 바꾼다")
    void kakaoApprove() throws Exception {
        User user = saveUser(Role.USER);
        String orderId = readied(user, "KAKAO_PAY");
        LocalDateTime before = LocalDateTime.now();

        approve(user, kakaoApproval(orderId))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.method").value("CASH"))
                .andExpect(jsonPath("$.data.amount").value(10000))
                .andExpect(jsonPath("$.data.payableCredits").value(0));

        assertEquals("APPROVED", attemptStatus(orderId));
        List<Payment> payments = paymentRepository.findBySubscriptionUserIdOrderByPaidAtDescIdDesc(user.getId());
        assertEquals(1, payments.size());
        Payment payment = payments.get(0);
        assertEquals(Payment.Method.CASH, payment.getMethod());
        assertEquals(PaymentProvider.KAKAO_PAY, payment.getProvider());
        assertEquals("T-1", payment.getPgTransactionId());
        assertEquals(Payment.Status.COMPLETED, payment.getStatus());
        Subscription subscription = payment.getSubscription();
        assertEquals(Subscription.Status.ACTIVE, subscription.getStatus());
        assertFalse(subscription.getStartAt().isBefore(before.minusSeconds(1)));
        assertEquals(subscription.getStartAt().plusDays(30), subscription.getEndAt());
        // 지갑이 없던 회원은 잔액 0의 지갑이 만들어지고 크레딧 내역은 늘지 않는다
        CreditWallet wallet = creditWalletRepository.findByUserId(user.getId()).orElseThrow();
        assertEquals(0, wallet.total());
        assertEquals(0, count("credit_ledgers", "credit_wallet_id = ?", wallet.getId()));

        ArgumentCaptor<PaymentGateway.ApproveCommand> captor = ArgumentCaptor.forClass(PaymentGateway.ApproveCommand.class);
        verify(kakaoPay).approve(captor.capture());
        assertEquals("T-1", captor.getValue().pgTransactionId());
        assertEquals("pg-token-1", captor.getValue().pgToken());
        assertEquals(10000, captor.getValue().amount());
    }

    @Test
    @DisplayName("#249-S5 토스 승인은 서버 금액으로 승인하고 이미 구독 중이면 기존 만료일에 이어 붙는다")
    void tossApproveChainsPeriod() throws Exception {
        User user = saveUser(Role.USER);
        // DB는 마이크로초까지만 저장해서 비교할 시각을 같은 정밀도로 맞춘다
        LocalDateTime now = LocalDateTime.now().truncatedTo(java.time.temporal.ChronoUnit.MICROS);
        Subscription current = subscriptionRepository.save(Subscription.builder()
                .user(user).plan(plan).startAt(now.minusDays(10)).endAt(now.plusDays(20)).build());
        String orderId = readied(user, "TOSS_PAY");

        approve(user, tossApproval(orderId, 10000)).andExpect(status().isCreated());

        Payment payment = paymentRepository.findBySubscriptionUserIdOrderByPaidAtDescIdDesc(user.getId()).get(0);
        assertEquals(PaymentProvider.TOSS_PAY, payment.getProvider());
        assertEquals("PK-1", payment.getPgTransactionId());
        assertEquals(current.getEndAt(), payment.getSubscription().getStartAt());
        assertEquals(current.getEndAt().plusDays(30), payment.getSubscription().getEndAt());
        ArgumentCaptor<PaymentGateway.ApproveCommand> captor = ArgumentCaptor.forClass(PaymentGateway.ApproveCommand.class);
        verify(tossPay).approve(captor.capture());
        assertEquals(10000, captor.getValue().amount());
        assertEquals("PK-1", captor.getValue().paymentKey());
    }

    @Test
    @DisplayName("#249-S6 승인할 수 없는 시도는 PG를 부르지 않고 구독이 생기지 않는다")
    void notApprovable() throws Exception {
        User user = saveUser(Role.USER);
        User stranger = saveUser(Role.USER);
        String kakaoOrder = readied(user, "KAKAO_PAY");
        String tossOrder = readied(user, "TOSS_PAY");

        // 없는 주문번호, 남의 시도
        approve(user, kakaoApproval("MOA-none")).andExpect(status().isNotFound());
        approve(stranger, kakaoApproval(kakaoOrder)).andExpect(status().isNotFound());
        // 필요한 값이 빠짐
        approve(user, "{\"orderId\":\"" + kakaoOrder + "\"}").andExpect(status().isBadRequest());
        approve(user, "{\"orderId\":\"" + tossOrder + "\",\"amount\":10000}").andExpect(status().isBadRequest());
        approve(user, "{\"orderId\":\"" + tossOrder + "\",\"paymentKey\":\"PK-1\"}").andExpect(status().isBadRequest());
        approve(user, "{}").andExpect(status().isBadRequest());
        // 토스가 돌려준 금액이 서버 금액과 다름
        approve(user, tossApproval(tossOrder, 1)).andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("PAYMENT_NOT_APPROVABLE"));
        // 만료
        jdbc.update("update payment_attempts set created_at = ? where order_id = ?", LocalDateTime.now().minusMinutes(11), kakaoOrder);
        approve(user, kakaoApproval(kakaoOrder)).andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("PAYMENT_NOT_APPROVABLE"));

        verify(kakaoPay, never()).approve(any());
        verify(tossPay, never()).approve(any());
        assertEquals("PENDING", attemptStatus(kakaoOrder));
        assertEquals("PENDING", attemptStatus(tossOrder));
        assertEquals(0, count("subscriptions", "user_id in (?, ?)", user.getId(), stranger.getId()));
    }

    @Test
    @DisplayName("#249-S7 PG가 승인을 거절하면 502이고 구독이 생기지 않으며 같은 시도로 다시 승인할 수 없다")
    void pgRejectsApproval() throws Exception {
        User user = saveUser(Role.USER);
        String orderId = readied(user, "KAKAO_PAY");
        when(kakaoPay.approve(any())).thenThrow(new BusinessException(ErrorCode.PG_APPROVE_FAILED));

        approve(user, kakaoApproval(orderId))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.error.code").value("PG_APPROVE_FAILED"));

        assertEquals("FAILED", attemptStatus(orderId));
        assertEquals(0, count("subscriptions", "user_id = ?", user.getId()));
        assertEquals(0, count("payments", "subscription_id in (select id from subscriptions where user_id = ?)", user.getId()));
        approve(user, kakaoApproval(orderId)).andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("PAYMENT_NOT_APPROVABLE"));
        verify(kakaoPay, times(1)).approve(any());
    }

    @Test
    @DisplayName("#249-S8 같은 시도를 동시에 두 번 승인해도 PG 승인은 한 번이고 구독은 한 건이다")
    void concurrentApprovalsOnlyOnce() throws Exception {
        User user = saveUser(Role.USER);
        String orderId = readied(user, "KAKAO_PAY");
        // 첫 요청이 PG 승인을 부르는 동안 둘째 요청이 들어오도록 승인을 잠깐 붙잡는다
        doAnswer(invocation -> {
            Thread.sleep(300);
            return new PaymentGateway.Approved("T-1");
        }).when(kakaoPay).approve(any());
        PgApproveRequest request = new PgApproveRequest(orderId, "pg-token-1", null, null);

        List<Throwable> results = runTogether(
                () -> pgPaymentService.approve(user.getId(), request),
                () -> pgPaymentService.approve(user.getId(), request));

        assertEquals(1, results.stream().filter(r -> r == null).count(), results.toString());
        Throwable failure = results.stream().filter(r -> r != null).findFirst().orElseThrow();
        assertEquals(ErrorCode.PAYMENT_NOT_APPROVABLE, ((BusinessException) failure).getErrorCode());
        verify(kakaoPay, times(1)).approve(any());
        assertEquals(1, count("subscriptions", "user_id = ?", user.getId()));
        assertEquals("APPROVED", attemptStatus(orderId));
        // 이미 승인한 시도를 다시 승인해도 늘지 않는다
        approve(user, kakaoApproval(orderId)).andExpect(status().isConflict());
        assertEquals(1, count("subscriptions", "user_id = ?", user.getId()));
    }

    @Test
    @DisplayName("#249-S8 지갑이 없는 회원의 승인 둘이 동시에 와도 지갑은 하나이고 두 기간이 이어 붙는다")
    void concurrentFirstPaymentsShareOneWallet() throws Exception {
        User user = saveUser(Role.USER);
        String first = readied(user, "KAKAO_PAY");
        String second = readied(user, "TOSS_PAY");
        PgApproveRequest kakao = new PgApproveRequest(first, "pg-token-1", null, null);
        PgApproveRequest toss = new PgApproveRequest(second, null, "PK-2", 10000);

        List<Throwable> results = runTogether(
                () -> pgPaymentService.approve(user.getId(), kakao),
                () -> pgPaymentService.approve(user.getId(), toss));

        assertTrue(results.stream().allMatch(r -> r == null), results.toString());
        assertEquals(1, count("credit_wallets", "user_id = ?", user.getId()));
        List<LocalDateTime[]> periods = jdbc.query(
                "select start_at, end_at from subscriptions where user_id = ? order by start_at",
                (rs, i) -> new LocalDateTime[]{rs.getTimestamp(1).toLocalDateTime(), rs.getTimestamp(2).toLocalDateTime()},
                user.getId());
        assertEquals(2, periods.size());
        assertEquals(periods.get(0)[1], periods.get(1)[0]);
    }

    @Test
    @DisplayName("#249-S10 결제 이력에 결제 대행사가 남고 크레딧·예전 현금 결제는 null이다")
    void historyShowsProvider() throws Exception {
        User user = saveUser(Role.USER);
        LocalDateTime now = LocalDateTime.now();
        // 예전에 PG 없이 저장한 현금 결제(provider 없음)
        Subscription legacy = subscriptionRepository.save(Subscription.builder()
                .user(user).plan(plan).startAt(now.minusDays(90)).endAt(now.minusDays(60)).build());
        paymentRepository.save(Payment.builder()
                .subscription(legacy).method(Payment.Method.CASH).amount(10000).paidAt(now.minusDays(90)).build());
        String orderId = readied(user, "KAKAO_PAY");
        approve(user, kakaoApproval(orderId)).andExpect(status().isCreated());

        mvc.perform(get(PAYMENTS).header("Authorization", bearer(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].method").value("CASH"))
                .andExpect(jsonPath("$.data[0].provider").value("KAKAO_PAY"))
                .andExpect(jsonPath("$.data[1].method").value("CASH"))
                .andExpect(jsonPath("$.data[1].provider").doesNotExist());
    }

    @Test
    @DisplayName("#249-S11 결제 준비도 직전 결제 후 5초 안이면 409이고 5초가 지나면 된다")
    void readyDoubleClickGuard() throws Exception {
        User recent = saveUser(Role.USER);
        seedPayment(recent, LocalDateTime.now().minusSeconds(1));
        ready(recent, plan.getId(), "KAKAO_PAY")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("DUPLICATE_PAYMENT"));
        assertEquals(0, count("payment_attempts", "user_id = ?", recent.getId()));
        verify(kakaoPay, never()).ready(any());

        User old = saveUser(Role.USER);
        seedPayment(old, LocalDateTime.now().minusSeconds(10));
        ready(old, plan.getId(), "KAKAO_PAY").andExpect(status().isCreated());
    }

    @Test
    @DisplayName("#249-S12 PG가 승인한 뒤 저장이 실패하면 구독·결제는 남지 않고 시도는 APPROVING으로 남는다")
    void saveFailureAfterPgApproval() throws Exception {
        User user = saveUser(Role.USER);
        String orderId = readied(user, "KAKAO_PAY");
        doThrow(new IllegalStateException("결제 저장 실패")).when(paymentRepository).save(any(Payment.class));

        assertThrows(IllegalStateException.class,
                () -> pgPaymentService.approve(user.getId(), new PgApproveRequest(orderId, "pg-token-1", null, null)));

        verify(kakaoPay).approve(any());
        assertEquals("APPROVING", attemptStatus(orderId));
        assertEquals(0, count("subscriptions", "user_id = ?", user.getId()));
        assertEquals(0, count("payments", "subscription_id in (select id from subscriptions where user_id = ?)", user.getId()));
    }

    private void seedPayment(User user, LocalDateTime paidAt) {
        Subscription subscription = subscriptionRepository.save(Subscription.builder()
                .user(user).plan(plan).startAt(paidAt.minusDays(60)).endAt(paidAt.minusDays(30)).build());
        paymentRepository.save(Payment.builder()
                .subscription(subscription).method(Payment.Method.CASH).amount(10000).paidAt(paidAt).build());
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
}
