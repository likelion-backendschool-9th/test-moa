package com.testmoa.backend.controller.admin;

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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 운영자 구독 부여·해제(#204-S1~S10). 결제와 크레딧은 건드리지 않는 것도 함께 확인한다.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AdminSubscriptionControllerTest {

    private static final String API = "/api/v1/admin/subscriptions";

    @Autowired MockMvc mvc;
    @Autowired JwtProvider jwtProvider;
    @Autowired UserRepository userRepository;
    @Autowired PlanRepository planRepository;
    @Autowired SubscriptionRepository subscriptionRepository;
    @Autowired PaymentRepository paymentRepository;
    @Autowired CreditWalletRepository creditWalletRepository;
    @Autowired CreditLedgerRepository creditLedgerRepository;

    private User admin;
    private Plan plan;

    @BeforeEach
    void setUp() {
        admin = saveUser(Role.ADMIN);
        plan = savePlan("PRO-" + UUID.randomUUID().toString().substring(0, 8), 1);
    }

    private Plan savePlan(String tier, int version) {
        return planRepository.save(Plan.builder()
                .tier(tier).cashPrice(10000).creditPrice(9000).periodDays(30).version(version).build());
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

    private Subscription saveSubscription(User user, Plan plan, LocalDateTime startAt, LocalDateTime endAt) {
        return subscriptionRepository.save(Subscription.builder().user(user).plan(plan).startAt(startAt).endAt(endAt).build());
    }

    private String grantBody(String email, Long planId) {
        return "{\"email\":\"" + email + "\",\"planId\":" + planId + "}";
    }

    @Test
    @DisplayName("#204-S1 회원의 구독 상태를 이메일로 조회한다")
    void findsStatusByEmail() throws Exception {
        User subscribed = saveUser(Role.USER);
        LocalDateTime now = LocalDateTime.now();
        saveSubscription(subscribed, plan, now.minusDays(5), now.plusDays(25));
        User plain = saveUser(Role.USER);

        mvc.perform(get(API).param("email", " " + subscribed.getEmail() + " ").header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.nickname").value(subscribed.getNickname()))
                .andExpect(jsonPath("$.data.email").value(subscribed.getEmail()))
                .andExpect(jsonPath("$.data.eligible").value(true))
                .andExpect(jsonPath("$.data.active").value(true))
                .andExpect(jsonPath("$.data.plan").value(plan.getTier()))
                .andExpect(jsonPath("$.data.remainingDays").value(25));

        mvc.perform(get(API).param("email", plain.getEmail()).header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.eligible").value(true))
                .andExpect(jsonPath("$.data.active").value(false))
                .andExpect(jsonPath("$.data.plan").doesNotExist())
                .andExpect(jsonPath("$.data.endAt").doesNotExist())
                .andExpect(jsonPath("$.data.remainingDays").doesNotExist());
    }

    @Test
    @DisplayName("#204-S2 없는 이메일은 조회·부여·해제 모두 404이고 행이 바뀌지 않는다")
    void unknownEmailIs404() throws Exception {
        String unknown = UUID.randomUUID() + "@example.com";
        long before = subscriptionRepository.count();

        mvc.perform(get(API).param("email", unknown).header("Authorization", bearer(admin)))
                .andExpect(status().isNotFound());
        mvc.perform(post(API).header("Authorization", bearer(admin)).contentType(MediaType.APPLICATION_JSON)
                        .content(grantBody(unknown, plan.getId())))
                .andExpect(status().isNotFound());
        mvc.perform(delete(API).param("email", unknown).header("Authorization", bearer(admin)))
                .andExpect(status().isNotFound());

        assertEquals(before, subscriptionRepository.count());
    }

    @Test
    @DisplayName("#204-S3 운영자 계정은 조회는 eligible=false, 부여는 403, 해제는 eligible=false다")
    void adminAccountIsNotEligible() throws Exception {
        User otherAdmin = saveUser(Role.ADMIN);
        long before = subscriptionRepository.count();

        mvc.perform(get(API).param("email", otherAdmin.getEmail()).header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.eligible").value(false))
                .andExpect(jsonPath("$.data.active").doesNotExist())
                .andExpect(jsonPath("$.data.plan").doesNotExist());
        mvc.perform(post(API).header("Authorization", bearer(admin)).contentType(MediaType.APPLICATION_JSON)
                        .content(grantBody(otherAdmin.getEmail(), plan.getId())))
                .andExpect(status().isForbidden());
        mvc.perform(delete(API).param("email", otherAdmin.getEmail()).header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.eligible").value(false));

        assertEquals(before, subscriptionRepository.count());
    }

    @Test
    @DisplayName("#204-S4 구독을 주면 결제 없이 구독 중이 되고 결제·크레딧은 그대로다")
    void grantCreatesSubscriptionWithoutPayment() throws Exception {
        User user = saveUser(Role.USER);
        Counts before = counts();
        LocalDateTime requestedAt = LocalDateTime.now();

        mvc.perform(post(API).header("Authorization", bearer(admin)).contentType(MediaType.APPLICATION_JSON)
                        .content(grantBody(user.getEmail(), plan.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.active").value(true))
                .andExpect(jsonPath("$.data.plan").value(plan.getTier()))
                .andExpect(jsonPath("$.data.remainingDays").value(30));

        List<Subscription> periods = subscriptionRepository.findByUserIdAndStatusAndEndAtAfterOrderByStartAtAsc(
                user.getId(), Subscription.Status.ACTIVE, requestedAt);
        assertEquals(1, periods.size());
        Subscription period = periods.get(0);
        assertEquals(30, ChronoUnit.DAYS.between(period.getStartAt(), period.getEndAt()));
        assertEquals(before, counts());

        // 그 회원이 보는 내 구독 상태도 구독 중이다
        mvc.perform(get("/api/v1/my/subscription/status").header("Authorization", bearer(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.active").value(true));
    }

    @Test
    @DisplayName("#204-S5 이미 구독 중이면 끝난 시각부터 이어 준다")
    void grantChainsAfterCurrentEnd() throws Exception {
        User user = saveUser(Role.USER);
        LocalDateTime now = LocalDateTime.now();
        Subscription current = saveSubscription(user, plan, now.minusDays(20), now.plusDays(10));

        mvc.perform(post(API).header("Authorization", bearer(admin)).contentType(MediaType.APPLICATION_JSON)
                        .content(grantBody(user.getEmail(), plan.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.remainingDays").value(40));

        List<Subscription> periods = subscriptionRepository.findByUserIdAndStatusAndEndAtAfterOrderByStartAtAsc(
                user.getId(), Subscription.Status.ACTIVE, now);
        assertEquals(2, periods.size());
        assertEquals(current.getEndAt(), periods.get(1).getStartAt());
        assertEquals(current.getEndAt().plusDays(30), periods.get(1).getEndAt());
    }

    @Test
    @DisplayName("#204-S6 지금 파는 플랜이 아니면 404이고 행이 생기지 않는다")
    void notCurrentPlanIs404() throws Exception {
        User user = saveUser(Role.USER);
        String tier = "OLD-" + UUID.randomUUID().toString().substring(0, 8);
        Plan oldVersion = savePlan(tier, 1);
        savePlan(tier, 2);
        long before = subscriptionRepository.count();

        mvc.perform(post(API).header("Authorization", bearer(admin)).contentType(MediaType.APPLICATION_JSON)
                        .content(grantBody(user.getEmail(), 999_999_999L)))
                .andExpect(status().isNotFound());
        mvc.perform(post(API).header("Authorization", bearer(admin)).contentType(MediaType.APPLICATION_JSON)
                        .content(grantBody(user.getEmail(), oldVersion.getId())))
                .andExpect(status().isNotFound());

        assertEquals(before, subscriptionRepository.count());
    }

    @Test
    @DisplayName("#204-S7 이메일이 비었거나 planId가 없으면 400이다")
    void invalidBodyIs400() throws Exception {
        mvc.perform(post(API).header("Authorization", bearer(admin)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"  \",\"planId\":" + plan.getId() + "}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post(API).header("Authorization", bearer(admin)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"a@example.com\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("#204-S8 구독을 빼면 끝나지 않은 기간이 모두 취소되고 끝난 기간·결제·크레딧은 그대로다")
    void revokeCancelsUnfinishedPeriods() throws Exception {
        User user = saveUser(Role.USER);
        LocalDateTime now = LocalDateTime.now();
        Subscription current = saveSubscription(user, plan, now.minusDays(5), now.plusDays(25));
        Subscription next = saveSubscription(user, plan, now.plusDays(25), now.plusDays(55));
        Subscription ended = saveSubscription(user, plan, now.minusDays(60), now.minusDays(30));
        Counts before = counts();

        mvc.perform(delete(API).param("email", user.getEmail()).header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.active").value(false))
                .andExpect(jsonPath("$.data.plan").doesNotExist());

        assertEquals(Subscription.Status.CANCELLED, subscriptionRepository.findById(current.getId()).orElseThrow().getStatus());
        assertEquals(Subscription.Status.CANCELLED, subscriptionRepository.findById(next.getId()).orElseThrow().getStatus());
        assertEquals(Subscription.Status.ACTIVE, subscriptionRepository.findById(ended.getId()).orElseThrow().getStatus());
        assertTrue(subscriptionRepository.existsById(current.getId()));
        assertEquals(before, counts());
    }

    @Test
    @DisplayName("#204-S9 뺄 구독이 없어도 200이고 미구독이다")
    void revokeWithoutSubscriptionIsOk() throws Exception {
        User user = saveUser(Role.USER);
        long before = subscriptionRepository.count();

        mvc.perform(delete(API).param("email", user.getEmail()).header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.eligible").value(true))
                .andExpect(jsonPath("$.data.active").value(false));

        assertEquals(before, subscriptionRepository.count());
    }

    @Test
    @DisplayName("#204-S10 일반 회원은 403, 비로그인은 401이다")
    void onlyAdminCanUse() throws Exception {
        User user = saveUser(Role.USER);
        String body = grantBody(user.getEmail(), plan.getId());

        mvc.perform(get(API).param("email", user.getEmail()).header("Authorization", bearer(user)))
                .andExpect(status().isForbidden());
        mvc.perform(post(API).header("Authorization", bearer(user)).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isForbidden());
        mvc.perform(delete(API).param("email", user.getEmail()).header("Authorization", bearer(user)))
                .andExpect(status().isForbidden());

        mvc.perform(get(API).param("email", user.getEmail())).andExpect(status().isUnauthorized());
        mvc.perform(post(API).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isUnauthorized());
        mvc.perform(delete(API).param("email", user.getEmail())).andExpect(status().isUnauthorized());
        assertEquals(0, subscriptionRepository.findByUserIdAndStatusAndEndAtAfterOrderByStartAtAsc(
                user.getId(), Subscription.Status.ACTIVE, LocalDateTime.now().minusYears(1)).size());
    }

    private record Counts(long payments, long wallets, long ledgers) {}

    private Counts counts() {
        return new Counts(paymentRepository.count(), creditWalletRepository.count(), creditLedgerRepository.count());
    }
}
