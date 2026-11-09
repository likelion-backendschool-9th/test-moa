package com.testmoa.backend.controller.my;

import com.testmoa.backend.entity.CreditLedger;
import com.testmoa.backend.entity.CreditWallet;
import com.testmoa.backend.entity.Payment;
import com.testmoa.backend.entity.Plan;
import com.testmoa.backend.entity.Subscription;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.security.JwtProvider;
import com.testmoa.backend.global.security.Role;
import com.testmoa.backend.repository.CreditLedgerRepository;
import com.testmoa.backend.repository.CreditWalletRepository;
import com.testmoa.backend.repository.PaymentRepository;
import com.testmoa.backend.repository.PlanRepository;
import com.testmoa.backend.repository.SubscriptionRepository;
import com.testmoa.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 구독 결제 실행과 결제 이력(#71-S1~S7, S9, S11~S15, S17). 동시성·롤백은 {@code PaymentConcurrencyTest}가 확인한다.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PaymentControllerTest {

    private static final String CHECKOUT = "/api/v1/my/subscription/checkout";
    private static final String PAYMENTS = "/api/v1/my/subscription/payments";

    @Autowired MockMvc mvc;
    @Autowired JwtProvider jwtProvider;
    @Autowired UserRepository userRepository;
    @Autowired PlanRepository planRepository;
    @Autowired SubscriptionRepository subscriptionRepository;
    @Autowired PaymentRepository paymentRepository;
    @Autowired CreditWalletRepository creditWalletRepository;
    @Autowired CreditLedgerRepository creditLedgerRepository;

    private Plan plan;

    @BeforeEach
    void setUp() {
        plan = savePlan(1);
    }

    private Plan savePlan(int version) {
        return planRepository.save(Plan.builder()
                .tier("구독-" + UUID.randomUUID().toString().substring(0, 8))
                .cashPrice(10000).creditPrice(9000).periodDays(30).version(version).build());
    }

    private User saveUser(Role role) {
        return userRepository.save(User.builder()
                .name("한서윤")
                .nickname("t" + UUID.randomUUID().toString().substring(0, 8))
                .email(UUID.randomUUID() + "@example.com")
                .role(role)
                .status(UserStatus.ACTIVE)
                .build());
    }

    private String bearer(User user) {
        return "Bearer " + jwtProvider.createAccessToken(user.getId());
    }

    private CreditWallet saveWallet(User user, int event, int earned, int locked) {
        CreditWallet wallet = CreditWallet.builder().user(user).build();
        if (event > 0) wallet.grantEvent(event);
        if (earned + locked > 0) wallet.grantEarned(earned + locked);
        if (locked > 0) wallet.lockForCashout(locked);
        return creditWalletRepository.save(wallet);
    }

    private ResultActions pay(User user, Long planId, String method) throws Exception {
        String body = "{\"planId\":" + planId + ",\"method\":\"" + method + "\"}";
        return mvc.perform(post(CHECKOUT).header("Authorization", bearer(user))
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private Subscription seedPeriod(User user, int startDays, int endDays, boolean cancelled) {
        LocalDateTime base = LocalDateTime.now();
        Subscription subscription = subscriptionRepository.save(Subscription.builder()
                .user(user).plan(plan).startAt(base.plusDays(startDays)).endAt(base.plusDays(endDays)).build());
        if (cancelled) {
            ReflectionTestUtils.setField(subscription, "status", Subscription.Status.CANCELLED);
            subscriptionRepository.save(subscription);
        }
        return subscription;
    }

    private Payment seedPayment(User user, Plan seedPlan, LocalDateTime paidAt, int startDays) {
        LocalDateTime base = LocalDateTime.now();
        Subscription subscription = subscriptionRepository.save(Subscription.builder()
                .user(user).plan(seedPlan).startAt(base.plusDays(startDays))
                .endAt(base.plusDays(startDays + 30)).build());
        return paymentRepository.save(Payment.builder()
                .subscription(subscription).method(Payment.Method.CASH).amount(10000).paidAt(paidAt).build());
    }

    /** 방금 만든 결제의 구독. 회원의 결제 중 가장 최근 것 */
    private Subscription latestSubscription(User user) {
        return paymentRepository.findBySubscriptionUserIdOrderByPaidAtDescIdDesc(user.getId())
                .get(0).getSubscription();
    }

    private List<CreditLedger> ledgers(CreditWallet wallet) {
        return creditLedgerRepository.findByCreditWalletIdOrderByCreatedAtDesc(wallet.getId());
    }

    @Test
    @DisplayName("#71-S1 구독하지 않은 회원의 현금 결제는 결제 한 건과 구독 한 건이 짝으로 저장된다")
    void cashPaymentCreatesPair() throws Exception {
        User user = saveUser(Role.USER);
        LocalDateTime before = LocalDateTime.now();

        pay(user, plan.getId(), "CASH")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.method").value("CASH"))
                .andExpect(jsonPath("$.data.amount").value(10000))
                .andExpect(jsonPath("$.data.payableCredits").value(0));

        List<Payment> payments = paymentRepository.findBySubscriptionUserIdOrderByPaidAtDescIdDesc(user.getId());
        assertEquals(1, payments.size());
        Payment payment = payments.get(0);
        assertEquals(Payment.Status.COMPLETED, payment.getStatus());
        Subscription subscription = payment.getSubscription();
        assertEquals(Subscription.Status.ACTIVE, subscription.getStatus());
        assertEquals(plan.getId(), subscription.getPlan().getId());
        assertFalse(subscription.getStartAt().isBefore(before));
        assertEquals(subscription.getStartAt().plusDays(30), subscription.getEndAt());
        CreditWallet wallet = creditWalletRepository.findByUserId(user.getId()).orElseThrow();
        assertEquals(0, wallet.total());
        assertTrue(ledgers(wallet).isEmpty());
    }

    @Test
    @DisplayName("#71-S2 구독 중이면 가장 늦은 만료일부터 이어지고 취소된 기간은 세지 않는다")
    void startsAtLatestEnd() throws Exception {
        User single = saveUser(Role.USER);
        Subscription current = seedPeriod(single, -10, 20, false);
        pay(single, plan.getId(), "CASH").andExpect(status().isCreated());
        Subscription added = latestSubscription(single);
        assertEquals(current.getEndAt(), added.getStartAt());
        assertEquals(current.getEndAt().plusDays(30), added.getEndAt());

        User chained = saveUser(Role.USER);
        seedPeriod(chained, -10, 20, false);
        Subscription second = seedPeriod(chained, 20, 50, false);
        pay(chained, plan.getId(), "CASH").andExpect(status().isCreated());
        assertEquals(second.getEndAt(), latestSubscription(chained).getStartAt());

        User cancelledTail = saveUser(Role.USER);
        Subscription alive = seedPeriod(cancelledTail, -10, 20, false);
        seedPeriod(cancelledTail, 20, 50, true);
        pay(cancelledTail, plan.getId(), "CASH").andExpect(status().isCreated());
        assertEquals(alive.getEndAt(), latestSubscription(cancelledTail).getStartAt());

        User finished = saveUser(Role.USER);
        seedPeriod(finished, -40, -10, false);
        seedPeriod(finished, -10, 20, true);
        LocalDateTime before = LocalDateTime.now();
        pay(finished, plan.getId(), "CASH").andExpect(status().isCreated());
        assertFalse(latestSubscription(finished).getStartAt().isBefore(before));
        assertTrue(Duration.between(before, latestSubscription(finished).getStartAt()).abs().getSeconds() < 60);
    }

    @Test
    @DisplayName("#71-S3 크레딧 결제는 이벤트 크레딧을 먼저 쓰고 모자란 만큼 적립에서 뺀다")
    void creditSpendsEventFirst() throws Exception {
        User user = saveUser(Role.USER);
        CreditWallet wallet = saveWallet(user, 5000, 6000, 0);

        pay(user, plan.getId(), "CREDIT")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.method").value("CREDIT"))
                .andExpect(jsonPath("$.data.amount").value(9000))
                .andExpect(jsonPath("$.data.payableCredits").value(2000));

        assertEquals(0, wallet.getEventCredit());
        assertEquals(2000, wallet.getEarnedBalance());
        List<CreditLedger> rows = ledgers(wallet);
        assertEquals(2, rows.size());
        CreditLedger event = rows.stream().filter(r -> r.getType() == CreditLedger.Type.EVENT).findFirst().orElseThrow();
        CreditLedger earned = rows.stream().filter(r -> r.getType() == CreditLedger.Type.EARNED).findFirst().orElseThrow();
        assertEquals(-5000, event.getDelta());
        assertEquals("구독 결제(이벤트 크레딧)", event.getDescription());
        assertEquals(-4000, earned.getDelta());
        assertEquals("구독 결제(적립 크레딧)", earned.getDescription());
    }

    @Test
    @DisplayName("#71-S4 한쪽 크레딧만 쓰면 내역은 한 줄이다")
    void oneSideLedgerRow() throws Exception {
        User eventOnly = saveUser(Role.USER);
        CreditWallet eventWallet = saveWallet(eventOnly, 10000, 0, 0);
        pay(eventOnly, plan.getId(), "CREDIT").andExpect(status().isCreated());
        List<CreditLedger> eventRows = ledgers(eventWallet);
        assertEquals(1, eventRows.size());
        assertEquals(CreditLedger.Type.EVENT, eventRows.get(0).getType());
        assertEquals(-9000, eventRows.get(0).getDelta());

        User earnedOnly = saveUser(Role.USER);
        CreditWallet earnedWallet = saveWallet(earnedOnly, 0, 10000, 0);
        pay(earnedOnly, plan.getId(), "CREDIT").andExpect(status().isCreated());
        List<CreditLedger> earnedRows = ledgers(earnedWallet);
        assertEquals(1, earnedRows.size());
        assertEquals(CreditLedger.Type.EARNED, earnedRows.get(0).getType());
        assertEquals(-9000, earnedRows.get(0).getDelta());
    }

    @Test
    @DisplayName("#71-S5 출금 처리 중인 크레딧은 쓰지 않는다")
    void lockedCreditIsNotSpent() throws Exception {
        User user = saveUser(Role.USER);
        CreditWallet wallet = saveWallet(user, 3000, 2000, 4000);

        pay(user, plan.getId(), "CREDIT")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("INSUFFICIENT_CREDIT"));

        assertEquals(4000, wallet.getLockedBalance());
        assertEquals(3000, wallet.getEventCredit());
        assertEquals(2000, wallet.getEarnedBalance());
    }

    @Test
    @DisplayName("#71-S6 크레딧이 모자라면 크레딧 결제는 되지 않고 현금 결제는 된다")
    void insufficientCredit() throws Exception {
        User user = saveUser(Role.USER);
        CreditWallet wallet = saveWallet(user, 4000, 4999, 0);

        pay(user, plan.getId(), "CREDIT")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("INSUFFICIENT_CREDIT"));

        assertTrue(paymentRepository.findBySubscriptionUserIdOrderByPaidAtDescIdDesc(user.getId()).isEmpty());
        assertTrue(subscriptionRepository.findAll().stream().noneMatch(s -> s.getUser().getId().equals(user.getId())));
        assertTrue(ledgers(wallet).isEmpty());
        assertEquals(8999, wallet.payable());

        pay(user, plan.getId(), "CASH").andExpect(status().isCreated());
    }

    @Test
    @DisplayName("#71-S17 크레딧 가격이 0이면 차감 없이 결제되고 크레딧 내역 행은 만들지 않는다")
    void freePlanByCreditSpendsNothing() throws Exception {
        Plan free = planRepository.save(Plan.builder()
                .tier("구독-" + UUID.randomUUID().toString().substring(0, 8))
                .cashPrice(10000).creditPrice(0).periodDays(30).version(1).build());
        User user = saveUser(Role.USER);
        CreditWallet wallet = saveWallet(user, 3000, 0, 0);

        pay(user, free.getId(), "CREDIT")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.method").value("CREDIT"))
                .andExpect(jsonPath("$.data.amount").value(0))
                .andExpect(jsonPath("$.data.payableCredits").value(3000));

        assertEquals(3000, wallet.getEventCredit());
        assertTrue(ledgers(wallet).isEmpty());
        assertEquals(1, paymentRepository.findBySubscriptionUserIdOrderByPaidAtDescIdDesc(user.getId()).size());
    }

    @Test
    @DisplayName("#71-S7 더블클릭은 5초 안이면 거절하고 5초가 지나면 미리 결제할 수 있다")
    void doubleClickGuard() throws Exception {
        User user = saveUser(Role.USER);
        CreditWallet wallet = saveWallet(user, 20000, 0, 0);

        pay(user, plan.getId(), "CREDIT").andExpect(status().isCreated());
        pay(user, plan.getId(), "CREDIT")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("DUPLICATE_PAYMENT"));
        assertEquals(1, paymentRepository.findBySubscriptionUserIdOrderByPaidAtDescIdDesc(user.getId()).size());
        assertEquals(11000, wallet.getEventCredit());
        assertEquals(1, ledgers(wallet).size());

        User old = saveUser(Role.USER);
        seedPayment(old, plan, LocalDateTime.now().minusSeconds(10), -5);
        pay(old, plan.getId(), "CASH").andExpect(status().isCreated());
        assertEquals(2, paymentRepository.findBySubscriptionUserIdOrderByPaidAtDescIdDesc(old.getId()).size());
    }

    @Test
    @DisplayName("#71-S9 지갑이 없는 회원도 현금으로 결제할 수 있고 지갑이 잔액 0으로 만들어진다")
    void walletCreatedOnFirstPayment() throws Exception {
        User user = saveUser(Role.USER);
        assertTrue(creditWalletRepository.findByUserId(user.getId()).isEmpty());

        pay(user, plan.getId(), "CASH").andExpect(status().isCreated());

        CreditWallet wallet = creditWalletRepository.findByUserId(user.getId()).orElseThrow();
        assertEquals(0, wallet.total());
    }

    @Test
    @DisplayName("#71-S11 입력이 틀리면 400, 없는 플랜이나 옛 version 플랜이면 404이고 결제가 생기지 않는다")
    void inputValidation() throws Exception {
        User user = saveUser(Role.USER);
        String auth = bearer(user);

        for (String body : new String[]{
                "{\"method\":\"CASH\"}",
                "{\"planId\":" + plan.getId() + "}",
                "{\"planId\":" + plan.getId() + ",\"method\":\"CHECK\"}",
                "{\"planId\":\"abc\",\"method\":\"CASH\"}",
                "{}"}) {
            mvc.perform(post(CHECKOUT).header("Authorization", auth)
                            .contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"));
        }
        mvc.perform(post(CHECKOUT).header("Authorization", auth).contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());

        pay(user, 999_999_999L, "CASH").andExpect(status().isNotFound());
        Plan oldVersion = plan;
        planRepository.save(Plan.builder().tier(oldVersion.getTier())
                .cashPrice(10000).creditPrice(9000).periodDays(30).version(2).build());
        pay(user, oldVersion.getId(), "CASH").andExpect(status().isNotFound());

        assertTrue(paymentRepository.findBySubscriptionUserIdOrderByPaidAtDescIdDesc(user.getId()).isEmpty());
    }

    @Test
    @DisplayName("#71-S12 운영자는 결제할 수 없고 결제 이력은 빈 배열이다")
    void adminCannotPay() throws Exception {
        User admin = saveUser(Role.ADMIN);

        pay(admin, plan.getId(), "CASH")
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
        mvc.perform(get(PAYMENTS).header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0));
    }

    @Test
    @DisplayName("#71-S13 토큰 없이 결제와 이력을 부르면 401")
    void loginRequired() throws Exception {
        mvc.perform(post(CHECKOUT).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"planId\":1,\"method\":\"CASH\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get(PAYMENTS)).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("#71-S14 결제한 뒤 구독 상태와 결제 가능 크레딧과 결제 화면 값이 바뀐다")
    void screensReflectPayment() throws Exception {
        User user = saveUser(Role.USER);
        saveWallet(user, 0, 10000, 0);
        String auth = bearer(user);

        pay(user, plan.getId(), "CREDIT").andExpect(status().isCreated());

        // 처음 구독한 결제는 지금부터 시작하므로 바로 구독 중이다
        mvc.perform(get("/api/v1/my/subscription/status").header("Authorization", auth))
                .andExpect(jsonPath("$.data.active").value(true))
                .andExpect(jsonPath("$.data.planId").value(plan.getId()));
        mvc.perform(get("/api/v1/my/subscription/payable-credits").header("Authorization", auth))
                .andExpect(jsonPath("$.data.payableCredits").value(1000));
        mvc.perform(get("/api/v1/my/subscription/checkout").param("planId", String.valueOf(plan.getId()))
                        .header("Authorization", auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.payableCredits").value(1000))
                .andExpect(jsonPath("$.data.active").value(true));
    }

    @Test
    @DisplayName("#71-S15 결제 이력은 최신순이고 결제가 없으면 빈 배열이다")
    void historyNewestFirst() throws Exception {
        User user = saveUser(Role.USER);
        Plan other = savePlan(1);
        LocalDateTime now = LocalDateTime.now();
        Payment oldest = seedPayment(user, plan, now.minusDays(30), -60);
        Payment newest = seedPayment(user, other, now.minusDays(1), 0);
        Payment middle = seedPayment(user, plan, now.minusDays(10), -30);

        mvc.perform(get(PAYMENTS).header("Authorization", bearer(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(3))
                .andExpect(jsonPath("$.data[0].paymentId").value(newest.getId()))
                .andExpect(jsonPath("$.data[1].paymentId").value(middle.getId()))
                .andExpect(jsonPath("$.data[2].paymentId").value(oldest.getId()))
                .andExpect(jsonPath("$.data[0].plan").value(other.getTier()))
                .andExpect(jsonPath("$.data[0].method").value("CASH"))
                .andExpect(jsonPath("$.data[0].amount").value(10000))
                .andExpect(jsonPath("$.data[0].status").value("COMPLETED"))
                .andExpect(jsonPath("$.data[0].paidAt").exists())
                .andExpect(jsonPath("$.data[0].period.startAt").exists())
                .andExpect(jsonPath("$.data[0].period.endAt").exists());

        User none = saveUser(Role.USER);
        mvc.perform(get(PAYMENTS).header("Authorization", bearer(none)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0));

        // 다른 회원의 결제는 내 이력에 나오지 않고, 그 회원은 자기 결제만 본다
        User stranger = saveUser(Role.USER);
        Payment strangers = seedPayment(stranger, plan, now.minusHours(1), 0);
        mvc.perform(get(PAYMENTS).header("Authorization", bearer(user)))
                .andExpect(jsonPath("$.data.length()").value(3))
                .andExpect(jsonPath("$.data[?(@.paymentId==" + strangers.getId() + ")]").isEmpty());
        mvc.perform(get(PAYMENTS).header("Authorization", bearer(stranger)))
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].paymentId").value(strangers.getId()));
    }
}
