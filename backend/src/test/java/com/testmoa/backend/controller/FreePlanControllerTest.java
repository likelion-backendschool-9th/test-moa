package com.testmoa.backend.controller;

import com.testmoa.backend.entity.Plan;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.security.JwtProvider;
import com.testmoa.backend.global.security.Role;
import com.testmoa.backend.repository.FreePlanRepository;
import com.testmoa.backend.repository.PlanRepository;
import com.testmoa.backend.repository.UserRepository;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.hasItem;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 무료 플랜 조건 조회·저장(#203). 조회는 로그인 없이, 저장은 운영자만 한다.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class FreePlanControllerTest {

    private static final String FREE = "/api/v1/plans/free";
    private static final String ADMIN_FREE = "/api/v1/admin/plans/free";

    @Autowired MockMvc mvc;
    @Autowired JwtProvider jwtProvider;
    @Autowired UserRepository userRepository;
    @Autowired PlanRepository planRepository;
    @Autowired FreePlanRepository freePlanRepository;

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

    private String body(String tier, String... benefits) {
        String list = benefits.length == 0 ? "[]" : "[\"" + String.join("\",\"", benefits) + "\"]";
        return "{\"tier\":\"" + tier + "\",\"benefits\":" + list + "}";
    }

    @Test
    @DisplayName("#203-S1 행이 없으면 로그인 없이 읽어도 200이고 이름 FREE, 빈 혜택이다")
    void emptyWhenNoRow() throws Exception {
        mvc.perform(get(FREE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.tier").value("FREE"))
                .andExpect(jsonPath("$.data.benefits", hasSize(0)));
    }

    @Test
    @DisplayName("#203-S2 운영자가 처음 저장하면 행이 만들어지고 조회에 반영된다")
    void adminCreatesThenReadable() throws Exception {
        String admin = bearer(saveUser(Role.ADMIN));

        mvc.perform(put(ADMIN_FREE).header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("  FREE  ", "선착순 자동 확정", "기본 보상")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.tier").value("FREE"))
                .andExpect(jsonPath("$.data.benefits[0]").value("선착순 자동 확정"))
                .andExpect(jsonPath("$.data.benefits[1]").value("기본 보상"));

        assertEquals(1, freePlanRepository.count());
        mvc.perform(get(FREE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.tier").value("FREE"))
                .andExpect(jsonPath("$.data.benefits", hasSize(2)))
                .andExpect(jsonPath("$.data.benefits[1]").value("기본 보상"));
    }

    @Test
    @DisplayName("#203-S3 다시 저장하면 같은 행이 고쳐지고 혜택을 비우면 빈 배열이다")
    void adminUpdatesSameRow() throws Exception {
        String admin = bearer(saveUser(Role.ADMIN));
        mvc.perform(put(ADMIN_FREE).header("Authorization", admin)
                .contentType(MediaType.APPLICATION_JSON).content(body("FREE", "기본 보상")));

        mvc.perform(put(ADMIN_FREE).header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON).content(body("무료", "선착순 자동 확정")))
                .andExpect(status().isOk());
        assertEquals(1, freePlanRepository.count());
        mvc.perform(get(FREE))
                .andExpect(jsonPath("$.data.tier").value("무료"))
                .andExpect(jsonPath("$.data.benefits", hasSize(1)))
                .andExpect(jsonPath("$.data.benefits[0]").value("선착순 자동 확정"));

        mvc.perform(put(ADMIN_FREE).header("Authorization", admin)
                .contentType(MediaType.APPLICATION_JSON).content(body("FREE")));
        mvc.perform(get(FREE))
                .andExpect(jsonPath("$.data.benefits", hasSize(0)));
        assertEquals(1, freePlanRepository.count());
    }

    @Test
    @DisplayName("#203-S4 잘못된 값은 400이고 저장된 값은 그대로다")
    void invalidInputIsRejected() throws Exception {
        String admin = bearer(saveUser(Role.ADMIN));
        mvc.perform(put(ADMIN_FREE).header("Authorization", admin)
                .contentType(MediaType.APPLICATION_JSON).content(body("FREE", "기본 보상")));

        String longTier = "가".repeat(256);
        String longBenefit = "가".repeat(101);
        List<String> bodies = List.of(
                "{\"tier\":\"\",\"benefits\":[]}",
                "{\"tier\":\"   \",\"benefits\":[]}",
                "{\"tier\":null,\"benefits\":[]}",
                body(longTier),
                body("FREE", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"),
                body("FREE", " "),
                body("FREE", longBenefit),
                body("FREE", "선택, 정렬"));
        for (String invalid : bodies) {
            mvc.perform(put(ADMIN_FREE).header("Authorization", admin)
                            .contentType(MediaType.APPLICATION_JSON).content(invalid))
                    .andExpect(status().isBadRequest());
        }

        mvc.perform(get(FREE))
                .andExpect(jsonPath("$.data.tier").value("FREE"))
                .andExpect(jsonPath("$.data.benefits", hasSize(1)))
                .andExpect(jsonPath("$.data.benefits[0]").value("기본 보상"));
    }

    @Test
    @DisplayName("#203-S5 토큰이 없으면 401, 일반 회원이면 403이고 값은 안 바뀐다. 조회는 둘 다 열려 있다")
    void onlyAdminCanSave() throws Exception {
        String user = bearer(saveUser(Role.USER));

        mvc.perform(put(ADMIN_FREE).contentType(MediaType.APPLICATION_JSON).content(body("FREE", "기본 보상")))
                .andExpect(status().isUnauthorized());
        mvc.perform(put(ADMIN_FREE).header("Authorization", user)
                        .contentType(MediaType.APPLICATION_JSON).content(body("FREE", "기본 보상")))
                .andExpect(status().isForbidden());

        assertEquals(0, freePlanRepository.count());
        mvc.perform(get(FREE)).andExpect(status().isOk());
        mvc.perform(get(FREE).header("Authorization", user)).andExpect(status().isOk());
    }

    @Test
    @DisplayName("#203-S6 무료 플랜을 저장해도 구독 플랜 목록·내 구독 상태가 그대로다")
    void freePlanDoesNotTouchSubscription() throws Exception {
        String tier = "구독-" + UUID.randomUUID().toString().substring(0, 8);
        planRepository.save(Plan.builder().tier(tier).cashPrice(10000).creditPrice(9000)
                .periodDays(30).version(1).description("지원자 중 직접 선정").build());
        User member = saveUser(Role.USER);
        String bearer = bearer(member);

        String plansBefore = mvc.perform(get("/api/v1/plans")).andReturn().getResponse().getContentAsString();
        String statusBefore = mvc.perform(get("/api/v1/my/subscription/status").header("Authorization", bearer))
                .andReturn().getResponse().getContentAsString();
        Long planId = planRepository.findCurrentPlans().stream()
                .filter(plan -> plan.getTier().equals(tier)).findFirst().orElseThrow().getId();
        String creditsBefore = mvc.perform(get("/api/v1/my/subscription/payable-credits").header("Authorization", bearer))
                .andReturn().getResponse().getContentAsString();
        String checkoutBefore = mvc.perform(get("/api/v1/my/subscription/checkout").param("planId", String.valueOf(planId))
                        .header("Authorization", bearer))
                .andReturn().getResponse().getContentAsString();

        mvc.perform(put(ADMIN_FREE).header("Authorization", bearer(saveUser(Role.ADMIN)))
                .contentType(MediaType.APPLICATION_JSON).content(body("FREE-" + tier, "기본 보상")));

        mvc.perform(get("/api/v1/plans"))
                .andExpect(status().isOk())
                .andExpect(content().string(plansBefore))
                .andExpect(jsonPath("$.data[*].tier", hasItem(tier)))
                .andExpect(jsonPath("$.data[*].tier", not(hasItem("FREE-" + tier))));
        mvc.perform(get("/api/v1/my/subscription/status").header("Authorization", bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.active").value(false))
                .andExpect(content().string(statusBefore));
        mvc.perform(get("/api/v1/my/subscription/payable-credits").header("Authorization", bearer))
                .andExpect(status().isOk())
                .andExpect(content().string(creditsBefore));
        // 결제 화면 조회도 같다. 이용 기간의 시작이 요청 시각이라 응답 전체가 아니라 플랜과 결제 수단별 값을 비교한다
        mvc.perform(get("/api/v1/my/subscription/checkout").param("planId", String.valueOf(planId))
                        .header("Authorization", bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.plan.id").value(planId))
                .andExpect(jsonPath("$.data.active").value(false))
                .andExpect(jsonPath("$.data.payableCredits").value(JsonPath.<Integer>read(checkoutBefore, "$.data.payableCredits")))
                .andExpect(jsonPath("$.data.credit.affordable").value(JsonPath.<Boolean>read(checkoutBefore, "$.data.credit.affordable")));
    }
}
