package com.testmoa.backend.controller;

import com.jayway.jsonpath.JsonPath;
import com.testmoa.backend.entity.CreditWallet;
import com.testmoa.backend.entity.Plan;
import com.testmoa.backend.entity.Subscription;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.security.JwtProvider;
import com.testmoa.backend.global.security.Role;
import com.testmoa.backend.repository.CreditWalletRepository;
import com.testmoa.backend.repository.PlanRepository;
import com.testmoa.backend.repository.SubscriptionRepository;
import com.testmoa.backend.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 내 구독 상태·결제 가능 크레딧은 토큰의 회원만 본다. 플랜 목록은 로그인 없이 읽는다.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class SubscriptionControllerAuthTest {

    @Autowired MockMvc mvc;
    @Autowired JwtProvider jwtProvider;
    @Autowired UserRepository userRepository;
    @Autowired PlanRepository planRepository;
    @Autowired SubscriptionRepository subscriptionRepository;
    @Autowired CreditWalletRepository creditWalletRepository;

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

    @Test
    @DisplayName("#69-S10 토큰 없이 내 구독 상태·결제 가능 크레딧은 401, 플랜 목록은 200")
    void loginRequiredExceptPlanList() throws Exception {
        mvc.perform(get("/api/v1/my/subscription/status")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/my/subscription/payable-credits")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/my/profile/subscription")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/plans"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("#69-S9 운영자는 eligible=false이고 구독 상태·결제 가능 크레딧이 없다")
    void adminIsNotEligible() throws Exception {
        String admin = bearer(saveUser(Role.ADMIN));

        mvc.perform(get("/api/v1/my/subscription/status").header("Authorization", admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.eligible").value(false))
                .andExpect(jsonPath("$.data.active").doesNotExist());
        mvc.perform(get("/api/v1/my/subscription/payable-credits").header("Authorization", admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.eligible").value(false))
                .andExpect(jsonPath("$.data.payableCredits").doesNotExist());
    }

    @Test
    @DisplayName("#69-S3·S15 구독하지 않은 회원은 active=false이고 마이페이지 구독 상태도 같은 값이다")
    void notSubscribedAndProfileSame() throws Exception {
        String member = bearer(saveUser(Role.USER));

        String status = mvc.perform(get("/api/v1/my/subscription/status").header("Authorization", member))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.eligible").value(true))
                .andExpect(jsonPath("$.data.active").value(false))
                .andReturn().getResponse().getContentAsString();
        String profile = mvc.perform(get("/api/v1/my/profile/subscription").header("Authorization", member))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertEquals(status, profile);
    }

    @Test
    @DisplayName("#69-S4·S15 구독 중인 회원은 플랜 id·등급·만료일이 나오고 마이페이지 구독 상태도 같은 값이다")
    void subscribedAndProfileSame() throws Exception {
        User user = saveUser(Role.USER);
        Plan plan = planRepository.save(Plan.builder()
                .tier("구독-" + UUID.randomUUID().toString().substring(0, 8))
                .cashPrice(10000).creditPrice(9000).periodDays(30).version(1).build());
        LocalDateTime now = LocalDateTime.now();
        subscriptionRepository.save(Subscription.builder()
                .user(user).plan(plan).startAt(now.minusDays(10)).endAt(now.plusDays(20)).build());
        String member = bearer(user);

        String status = mvc.perform(get("/api/v1/my/subscription/status").header("Authorization", member))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.active").value(true))
                .andExpect(jsonPath("$.data.planId").value(plan.getId()))
                .andExpect(jsonPath("$.data.plan").value(plan.getTier()))
                .andExpect(jsonPath("$.data.remainingDays").value(20))
                .andReturn().getResponse().getContentAsString();
        String profile = mvc.perform(get("/api/v1/my/profile/subscription").header("Authorization", member))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertEquals(status, profile);
    }

    @Test
    @DisplayName("#69-S8 결제 가능 크레딧은 이벤트 + 적립이고 출금 처리 중은 뺀다")
    void payableCreditsExcludeLocked() throws Exception {
        User user = saveUser(Role.USER);
        CreditWallet wallet = CreditWallet.builder().user(user).build();
        wallet.grantEvent(3000);
        wallet.grantEarned(7000);
        wallet.lockForCashout(1000);
        creditWalletRepository.save(wallet);

        mvc.perform(get("/api/v1/my/subscription/payable-credits").header("Authorization", bearer(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.eligible").value(true))
                .andExpect(jsonPath("$.data.payableCredits").value(9000));
        mvc.perform(get("/api/v1/my/subscription/payable-credits").header("Authorization", bearer(saveUser(Role.USER))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.payableCredits").value(0));
    }

    private Plan savePlan() {
        return planRepository.save(Plan.builder()
                .tier("구독-" + UUID.randomUUID().toString().substring(0, 8))
                .cashPrice(10000).creditPrice(9000).periodDays(30).version(1).build());
    }

    private Subscription savePeriod(User user, Plan plan, LocalDateTime start, LocalDateTime end) {
        return subscriptionRepository.save(Subscription.builder()
                .user(user).plan(plan).startAt(start).endAt(end).build());
    }

    private String read(String url, String authorization) throws Exception {
        return mvc.perform(get(url).header("Authorization", authorization))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
    }

    /** /api/users/me의 subscription과 /api/v1/my/subscription/status가 같은 구독 여부·플랜·만료일을 준다 */
    private void assertMeAndStatusAgree(User user) throws Exception {
        String member = bearer(user);
        String me = read("/api/users/me", member);
        String status = read("/api/v1/my/subscription/status", member);

        assertEquals((Object) JsonPath.read(status, "$.data.active"), JsonPath.read(me, "$.data.subscription.active"));
        assertEquals((Object) JsonPath.read(status, "$.data.plan"), JsonPath.read(me, "$.data.subscription.plan"));
        assertEquals((Object) JsonPath.read(status, "$.data.endAt"), JsonPath.read(me, "$.data.subscription.endAt"));
    }

    @Test
    @DisplayName("#69-S16 미리 결제해 이어 붙은 기간에서도 /users/me와 /status의 만료일이 같다")
    void meAndStatusAgreeOnChainedPeriods() throws Exception {
        User user = saveUser(Role.USER);
        Plan plan = savePlan();
        LocalDateTime now = LocalDateTime.now();
        savePeriod(user, plan, now.minusDays(10), now.plusDays(20));
        savePeriod(user, plan, now.plusDays(20), now.plusDays(50));
        savePeriod(user, plan, now.plusDays(55), now.plusDays(85));

        assertMeAndStatusAgree(user);

        String status = read("/api/v1/my/subscription/status", bearer(user));
        assertEquals(50, (int) JsonPath.read(status, "$.data.remainingDays"));
    }

    @Test
    @DisplayName("#69-S16 취소된 기간이 있어도 /users/me와 /status의 만료일이 같다")
    void meAndStatusAgreeWithCancelledPeriod() throws Exception {
        User user = saveUser(Role.USER);
        Plan plan = savePlan();
        LocalDateTime now = LocalDateTime.now();
        savePeriod(user, plan, now.minusDays(10), now.plusDays(20));
        Subscription cancelled = savePeriod(user, plan, now.plusDays(20), now.plusDays(50));
        ReflectionTestUtils.setField(cancelled, "status", Subscription.Status.CANCELLED);
        subscriptionRepository.saveAndFlush(cancelled);

        assertMeAndStatusAgree(user);

        String status = read("/api/v1/my/subscription/status", bearer(user));
        assertEquals(20, (int) JsonPath.read(status, "$.data.remainingDays"));
    }

    @Test
    @DisplayName("#69-S16 기간이 끝났거나 시작 전이면 /users/me와 /status 둘 다 구독 중이 아니다")
    void meAndStatusAgreeWhenNotActive() throws Exception {
        User ended = saveUser(Role.USER);
        User upcoming = saveUser(Role.USER);
        Plan plan = savePlan();
        LocalDateTime now = LocalDateTime.now();
        savePeriod(ended, plan, now.minusDays(40), now.minusDays(10));
        savePeriod(upcoming, plan, now.plusDays(10), now.plusDays(40));

        for (User user : new User[]{ended, upcoming}) {
            assertMeAndStatusAgree(user);
            String status = read("/api/v1/my/subscription/status", bearer(user));
            assertEquals(false, JsonPath.read(status, "$.data.active"));
            assertNull(JsonPath.read(status, "$.data.endAt"));
        }
    }

    @Test
    @DisplayName("#69-S16 운영자는 /users/me의 subscription이 null이고 /status는 eligible=false다")
    void meAndStatusForAdmin() throws Exception {
        String admin = bearer(saveUser(Role.ADMIN));

        String me = read("/api/users/me", admin);
        String status = read("/api/v1/my/subscription/status", admin);

        assertNull(JsonPath.read(me, "$.data.subscription"));
        assertEquals(false, JsonPath.read(status, "$.data.eligible"));
    }
}
