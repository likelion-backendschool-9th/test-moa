package com.testmoa.backend.controller.admin;

import com.testmoa.backend.entity.PaymentAttempt;
import com.testmoa.backend.entity.Plan;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.PaymentProvider;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.security.JwtProvider;
import com.testmoa.backend.global.security.Role;
import com.testmoa.backend.repository.PaymentAttemptRepository;
import com.testmoa.backend.repository.PlanRepository;
import com.testmoa.backend.repository.UserRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 운영자 멈춘 결제 시도 조회(#274-S6). 기준 시간(기본 15분)보다 오래된 APPROVING과 NEEDS_REVIEW만 나온다.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AdminPaymentAttemptControllerTest {

    private static final String API = "/api/v1/admin/payment-attempts/stuck";

    @Autowired MockMvc mvc;
    @Autowired JwtProvider jwtProvider;
    @Autowired UserRepository userRepository;
    @Autowired PlanRepository planRepository;
    @Autowired PaymentAttemptRepository paymentAttemptRepository;
    @Autowired JdbcTemplate jdbc;
    @Autowired EntityManager em;

    private User admin;
    private User member;
    private Plan plan;

    @BeforeEach
    void setUp() {
        admin = saveUser(Role.ADMIN);
        member = saveUser(Role.USER);
        plan = planRepository.save(Plan.builder()
                .tier("PRO-" + UUID.randomUUID().toString().substring(0, 8)).cashPrice(10000).creditPrice(9000).periodDays(30).version(1).build());
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

    /** 시도를 만들고 상태와 마지막 변경 시각을 정한다 */
    private PaymentAttempt attempt(String state, int minutesAgo) {
        PaymentAttempt attempt = paymentAttemptRepository.save(PaymentAttempt.builder()
                .user(member).plan(plan).provider(PaymentProvider.KAKAO_PAY)
                .orderId("MOA" + UUID.randomUUID().toString().replace("-", "")).amount(10000).pgTransactionId("T-" + state).build());
        em.flush();
        jdbc.update("update payment_attempts set status = ?, updated_at = ? where id = ?",
                state, LocalDateTime.now().minusMinutes(minutesAgo), attempt.getId());
        em.clear();
        return attempt;
    }

    @Test
    @DisplayName("#274-S6 운영자는 기준 시간보다 오래된 APPROVING과 NEEDS_REVIEW만 최근 것부터 본다")
    void adminSeesOnlyStuckAttempts() throws Exception {
        PaymentAttempt oldApproving = attempt("APPROVING", 60);
        PaymentAttempt review = attempt("NEEDS_REVIEW", 5);
        attempt("APPROVING", 1);
        attempt("APPROVED", 120);
        attempt("CANCELED", 120);

        mvc.perform(get(API).header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].attemptId").value(review.getId()))
                .andExpect(jsonPath("$.data[0].status").value("NEEDS_REVIEW"))
                .andExpect(jsonPath("$.data[0].userEmail").value(member.getEmail()))
                .andExpect(jsonPath("$.data[0].pgTransactionId").value("T-NEEDS_REVIEW"))
                .andExpect(jsonPath("$.data[1].attemptId").value(oldApproving.getId()))
                .andExpect(jsonPath("$.data[1].status").value("APPROVING"));
    }

    @Test
    @DisplayName("#274-S6 일반 회원은 403이고 토큰이 없으면 401이다")
    void onlyAdminCanRead() throws Exception {
        mvc.perform(get(API).header("Authorization", bearer(member))).andExpect(status().isForbidden());
        mvc.perform(get(API)).andExpect(status().isUnauthorized());
    }
}
