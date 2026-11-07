package com.testmoa.backend.controller.admin;

import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.security.JwtProvider;
import com.testmoa.backend.global.security.Role;
import com.testmoa.backend.repository.PlanRepository;
import com.testmoa.backend.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 플랜 등록은 운영자만 한다(#69-S14). 입력 검사(#69-S13)와 새 version(#69-S12)도 HTTP로 확인한다.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PlanControllerTest {

    private static final String URL = "/api/v1/admin/plans";

    @Autowired MockMvc mvc;
    @Autowired JwtProvider jwtProvider;
    @Autowired UserRepository userRepository;
    @Autowired PlanRepository planRepository;

    private String bearer(Role role) {
        User user = userRepository.save(User.builder()
                .name("한서윤")
                .nickname("t" + UUID.randomUUID().toString().substring(0, 8))
                .email(UUID.randomUUID() + "@example.com")
                .role(role)
                .status(UserStatus.ACTIVE)
                .build());
        return "Bearer " + jwtProvider.createAccessToken(user.getId());
    }

    private String body(String tier) {
        return "{\"tier\":\"" + tier + "\",\"cashPrice\":10000,\"creditPrice\":9000,\"periodDays\":30,"
                + "\"benefits\":[\"지원자 중 직접 선정\",\"기본 + 추가 보상\"]}";
    }

    @Test
    @DisplayName("#69-S14 토큰이 없으면 401, 일반 회원이면 403이고 플랜은 늘지 않는다")
    void onlyAdminCanRegister() throws Exception {
        long before = planRepository.count();

        mvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content(body("구독")))
                .andExpect(status().isUnauthorized());
        mvc.perform(post(URL).header("Authorization", bearer(Role.USER))
                        .contentType(MediaType.APPLICATION_JSON).content(body("구독")))
                .andExpect(status().isForbidden());

        assertEquals(before, planRepository.count());
    }

    @Test
    @DisplayName("#69-S12 운영자가 등록하면 201·version 1이고, 같은 등급을 다시 등록하면 version 2만 목록에 나온다")
    void registerAndRaiseVersion() throws Exception {
        String admin = bearer(Role.ADMIN);
        String tier = "구독-" + UUID.randomUUID().toString().substring(0, 8);

        mvc.perform(post(URL).header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON).content(body(tier)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.tier").value(tier))
                .andExpect(jsonPath("$.data.version").value(1))
                .andExpect(jsonPath("$.data.benefits[0]").value("지원자 중 직접 선정"))
                .andExpect(jsonPath("$.data.benefits[1]").value("기본 + 추가 보상"));
        mvc.perform(post(URL).header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON).content(body(tier)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.version").value(2));

        mvc.perform(get("/api/v1/plans"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.tier=='" + tier + "')].version").value(2));
    }

    @Test
    @DisplayName("#69-S13 등급이 비었거나 가격이 음수거나 기간이 1 미만이거나 혜택이 잘못되면 400이고 플랜은 늘지 않는다")
    void invalidBodyIsRejected() throws Exception {
        String admin = bearer(Role.ADMIN);
        long before = planRepository.count();
        String[] bodies = {
                "{\"tier\":\"  \",\"cashPrice\":10000,\"creditPrice\":9000,\"periodDays\":30}",
                "{\"cashPrice\":10000,\"creditPrice\":9000,\"periodDays\":30}",
                "{\"tier\":\"구독\",\"cashPrice\":-1,\"creditPrice\":9000,\"periodDays\":30}",
                "{\"tier\":\"구독\",\"cashPrice\":10000,\"creditPrice\":-1,\"periodDays\":30}",
                "{\"tier\":\"구독\",\"cashPrice\":10000,\"creditPrice\":9000,\"periodDays\":0}",
                "{\"tier\":\"구독\",\"cashPrice\":10000,\"creditPrice\":9000}",
                "{\"tier\":\"구독\",\"cashPrice\":10000,\"creditPrice\":9000,\"periodDays\":30,\"benefits\":[\"a, b\"]}",
                "{\"tier\":\"구독\",\"cashPrice\":10000,\"creditPrice\":9000,\"periodDays\":30,\"benefits\":[\"a\",\" \"]}",
                "{\"tier\":\"" + "가".repeat(256) + "\",\"cashPrice\":10000,\"creditPrice\":9000,\"periodDays\":30}"
        };

        for (String bad : bodies) {
            mvc.perform(post(URL).header("Authorization", admin)
                            .contentType(MediaType.APPLICATION_JSON).content(bad))
                    .andExpect(status().isBadRequest());
        }

        assertEquals(before, planRepository.count());
    }

    @Test
    @DisplayName("#69-S13 등급 이름은 255자까지 등록되고 256자부터는 400이다(500이 아니다)")
    void tierLengthLimit() throws Exception {
        String admin = bearer(Role.ADMIN);
        String max = "가".repeat(255);
        String tooLong = "가".repeat(256);
        long before = planRepository.count();

        mvc.perform(post(URL).header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON).content(body(tooLong)))
                .andExpect(status().isBadRequest());
        assertEquals(before, planRepository.count());

        mvc.perform(post(URL).header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON).content(body(max)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.version").value(1));
        assertEquals(before + 1, planRepository.count());
    }
}
