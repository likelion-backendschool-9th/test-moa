package com.testmoa.backend.controller;

import com.testmoa.backend.domain.entity.Account;
import com.testmoa.backend.domain.entity.Plan;
import com.testmoa.backend.domain.entity.Subscription;
import com.testmoa.backend.domain.entity.User;
import com.testmoa.backend.global.common.Provider;
import com.testmoa.backend.global.common.Role;
import com.testmoa.backend.global.common.SubscriptionStatus;
import com.testmoa.backend.global.common.UserStatus;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.security.JwtProvider;
import com.testmoa.backend.service.SubscriptionChecker;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.hamcrest.Matchers.contains;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 내 정보와 구독 여부. 구독 행은 결제 기능 대신 직접 넣는다
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class UserControllerTest {

    @Autowired MockMvc mvc;
    @Autowired EntityManager em;
    @Autowired JwtProvider jwtProvider;
    @Autowired SubscriptionChecker subscriptionChecker;

    private User saveUser(Role role) {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        User user = User.builder().name("김모아").nickname("모아" + suffix).email(suffix + "@example.com")
                .role(role).status(UserStatus.ACTIVE).build();
        em.persist(user);
        em.persist(Account.builder().user(user).provider(Provider.LOCAL).password("hash").build());
        return user;
    }

    private void subscribe(User user, SubscriptionStatus status, LocalDateTime startAt, LocalDateTime endAt) {
        Plan plan = Plan.builder().tier("구독").cashPrice(10000).creditPrice(9000).monthlyRecruitLimit(30)
                .version(1).periodDays(30).build();
        em.persist(plan);
        Subscription subscription = Subscription.builder().user(user).plan(plan).startAt(startAt).endAt(endAt).build();
        em.persist(subscription);
        // 구독은 항상 ACTIVE로 만들어진다. 환불 메서드가 아직 없어 다른 상태는 DB에서 바꾼다
        if (status != SubscriptionStatus.ACTIVE) {
            em.flush();
            em.createQuery("update subscriptions s set s.status = :status where s.id = :id")
                    .setParameter("status", status).setParameter("id", subscription.getId()).executeUpdate();
        }
    }

    private ResultActions me(User user) throws Exception {
        return mvc.perform(get("/api/users/me").header("Authorization", "Bearer " + jwtProvider.createAccessToken(user.getId())));
    }

    @Test

    @DisplayName("#81-S1 구독하지 않은 회원의 내 정보")
    void 구독하지_않은_회원() throws Exception {
        User user = saveUser(Role.USER);

        me(user).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.nickname").value(user.getNickname()))
                .andExpect(jsonPath("$.data.providers", contains("LOCAL")))
                .andExpect(jsonPath("$.data.hasPassword").value(true))
                .andExpect(jsonPath("$.data.subscription.active").value(false))
                .andExpect(jsonPath("$.data.subscription.endAt").doesNotExist());
        assertThatThrownBy(() -> subscriptionChecker.require(user.getId()))
                .isInstanceOf(BusinessException.class).hasMessage("구독한 회원만 쓸 수 있어요");
    }

    @Test

    @DisplayName("#81-S2 구독 중인 회원")
    void 구독_중인_회원() throws Exception {
        User user = saveUser(Role.USER);
        subscribe(user, SubscriptionStatus.ACTIVE, LocalDateTime.now().minusDays(1), LocalDateTime.now().plusDays(29));

        me(user).andExpect(jsonPath("$.data.subscription.active").value(true))
                .andExpect(jsonPath("$.data.subscription.plan").value("구독"))
                .andExpect(jsonPath("$.data.subscription.endAt").exists());
        assertThatNoException().isThrownBy(() -> subscriptionChecker.require(user.getId()));
    }

    @Test

    @DisplayName("#81-S3 기간이 끝난 구독은 상태가 ACTIVE여도 구독이 아니다")
    void 기간이_끝난_구독은_상태가_ACTIVE여도_구독이_아니다() throws Exception {
        User user = saveUser(Role.USER);
        subscribe(user, SubscriptionStatus.ACTIVE, LocalDateTime.now().minusDays(31), LocalDateTime.now().minusDays(1));

        me(user).andExpect(jsonPath("$.data.subscription.active").value(false));
    }

    @Test

    @DisplayName("#81-S3 해지한 구독은 구독이 아니다")
    void 해지한_구독은_구독이_아니다() throws Exception {
        User user = saveUser(Role.USER);
        subscribe(user, SubscriptionStatus.CANCELLED, LocalDateTime.now().minusDays(1), LocalDateTime.now().plusDays(29));

        me(user).andExpect(jsonPath("$.data.subscription.active").value(false));
    }

    @Test

    @DisplayName("#81-S4 운영자는 구독 정보가 없다")
    void 운영자는_구독_정보가_없다() throws Exception {
        me(saveUser(Role.ADMIN))
                .andExpect(jsonPath("$.data.role").value("ADMIN"))
                .andExpect(jsonPath("$.data.subscription").doesNotExist());
    }

    @Test

    @DisplayName("#79-S3 토큰이 없으면 401")
    void 토큰이_없으면_401() throws Exception {
        mvc.perform(get("/api/users/me")).andExpect(status().isUnauthorized());
    }
}
