package com.testmoa.backend.controller;

import com.jayway.jsonpath.JsonPath;
import com.testmoa.backend.entity.Account;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.security.JwtProvider;
import com.testmoa.backend.global.security.Provider;
import com.testmoa.backend.global.security.Role;
import com.testmoa.backend.repository.AccountRepository;
import com.testmoa.backend.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 내 정보 수정과 비밀번호 변경(#84). 가입·로그인은 실제 API로 해서 비밀번호 암호화와 로그인 세션까지 함께 확인한다
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class UserProfileControllerTest {

    @Autowired MockMvc mvc;
    @Autowired UserRepository userRepository;
    @Autowired AccountRepository accountRepository;
    @Autowired JwtProvider jwtProvider;

    private final String suffix = UUID.randomUUID().toString().substring(0, 8);
    private final String email = "moa" + suffix + "@example.com";
    private static final String PASSWORD = "moa2026pw";

    private ResultActions postJson(String path, String json) throws Exception {
        return mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private ResultActions patchJson(String path, String accessToken, String json) throws Exception {
        return mvc.perform(patch(path).header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private ResultActions login(String password) throws Exception {
        return postJson("/api/auth/login", """
                {"email":"%s","password":"%s"}""".formatted(email, password));
    }

    private static String field(ResultActions result, String path) throws Exception {
        return JsonPath.read(result.andReturn().getResponse().getContentAsString(), path);
    }

    // 이메일로 가입하고 로그인해서 토큰 응답을 돌려준다
    private ResultActions signUpAndLogin() throws Exception {
        postJson("/api/auth/signup", """
                {"name":"김모아","nickname":"모아%s","email":"%s","password":"%s"}""".formatted(suffix, email, PASSWORD))
                .andExpect(status().isCreated());
        return login(PASSWORD).andExpect(status().isOk());
    }

    private ResultActions changePassword(String accessToken, String json) throws Exception {
        return patchJson("/api/users/me/password", accessToken, json);
    }

    private ResultActions me(String accessToken) throws Exception {
        return mvc.perform(get("/api/users/me").header("Authorization", "Bearer " + accessToken));
    }

    @Test
    @DisplayName("#84-S9 이름·닉네임을 바꾸고, 다른 회원의 닉네임이나 규칙에 맞지 않는 값은 막는다")
    void 이름_닉네임을_바꾼다() throws Exception {
        String access = field(signUpAndLogin(), "$.data.accessToken");
        userRepository.save(User.builder().name("남").nickname("남의" + suffix).email("other" + suffix + "@example.com")
                .role(Role.USER).status(UserStatus.ACTIVE).build());

        patchJson("/api/users/me", access, """
                {"name":" 이재용 ","nickname":"새닉%s"}""".formatted(suffix))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("이재용"))
                .andExpect(jsonPath("$.data.nickname").value("새닉" + suffix));
        me(access).andExpect(jsonPath("$.data.name").value("이재용"))
                .andExpect(jsonPath("$.data.nickname").value("새닉" + suffix));

        // 내 닉네임을 그대로 두면 통과한다
        patchJson("/api/users/me", access, """
                {"name":"이재용","nickname":"새닉%s"}""".formatted(suffix)).andExpect(status().isOk());

        patchJson("/api/users/me", access, """
                {"name":"이재용","nickname":"남의%s"}""".formatted(suffix))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("NICKNAME_TAKEN"))
                .andExpect(jsonPath("$.error.fields.nickname").value("이미 쓰고 있는 닉네임이에요"));

        patchJson("/api/users/me", access, """
                {"name":"","nickname":"공백 닉네임"}""")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.fields.name").value("이름을 입력해 주세요"))
                .andExpect(jsonPath("$.error.fields.nickname").value("닉네임은 한글·영문·숫자 1~39자예요"));
    }

    @Test
    @DisplayName("#84-S10 비밀번호를 바꾸면 새 비밀번호로만 로그인되고, 지금 기기 말고 다른 기기의 로그인은 끊긴다")
    void 비밀번호를_바꾸면_다른_기기의_로그인이_끊긴다() throws Exception {
        ResultActions here = signUpAndLogin();
        ResultActions other = login(PASSWORD).andExpect(status().isOk());

        changePassword(field(here, "$.data.accessToken"), """
                {"currentPassword":"%s","newPassword":"newMoa2026"}""".formatted(PASSWORD))
                .andExpect(status().isOk());

        login(PASSWORD).andExpect(status().isUnauthorized());
        login("newMoa2026").andExpect(status().isOk());

        // 바꾼 기기는 그대로, 다른 기기는 access·refresh 모두 막힌다
        me(field(here, "$.data.accessToken")).andExpect(status().isOk());
        postJson("/api/auth/refresh", """
                {"refreshToken":"%s"}""".formatted(field(here, "$.data.refreshToken"))).andExpect(status().isOk());
        me(field(other, "$.data.accessToken")).andExpect(status().isUnauthorized());
        postJson("/api/auth/refresh", """
                {"refreshToken":"%s"}""".formatted(field(other, "$.data.refreshToken"))).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("#84-S11 현재 비밀번호가 틀리거나 새 비밀번호가 지금과 같으면 바꾸지 않는다")
    void 현재_비밀번호가_틀리면_바꾸지_않는다() throws Exception {
        String access = field(signUpAndLogin(), "$.data.accessToken");

        changePassword(access, """
                {"newPassword":"newMoa2026"}""")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.fields.currentPassword").value("현재 비밀번호가 맞지 않아요"));
        changePassword(access, """
                {"currentPassword":"wrong2026pw","newPassword":"newMoa2026"}""")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.fields.currentPassword").value("현재 비밀번호가 맞지 않아요"));
        changePassword(access, """
                {"currentPassword":"%s","newPassword":"%s"}""".formatted(PASSWORD, PASSWORD))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.fields.newPassword").value("지금 쓰는 비밀번호와 달라야 해요"));
        changePassword(access, """
                {"currentPassword":"%s","newPassword":"short"}""".formatted(PASSWORD))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.fields.newPassword").value("영문·숫자·특수문자로, 영문과 숫자를 섞어 8~64자로 써 주세요"));

        login(PASSWORD).andExpect(status().isOk());
    }

    @Test
    @DisplayName("#84-S12 소셜로만 가입한 회원은 현재 비밀번호 없이 비밀번호를 만들고, 그 뒤 이메일로도 로그인한다")
    void 소셜_회원은_비밀번호를_만든다() throws Exception {
        User user = userRepository.save(User.builder().name("김소셜").nickname("소셜" + suffix).email(email)
                .role(Role.USER).status(UserStatus.ACTIVE).build());
        accountRepository.save(Account.builder().user(user).provider(Provider.GITHUB).providerCode("gh-" + suffix).build());
        String access = jwtProvider.createAccessToken(user.getId());
        me(access).andExpect(jsonPath("$.data.hasPassword").value(false));

        changePassword(access, """
                {"newPassword":"newMoa2026"}""").andExpect(status().isOk());

        me(access).andExpect(jsonPath("$.data.hasPassword").value(true))
                .andExpect(jsonPath("$.data.providers", containsInAnyOrder("GITHUB", "LOCAL")));
        login("newMoa2026").andExpect(status().isOk());
    }

    @Test
    @DisplayName("#84-S13 로그인하지 않으면 두 API 모두 401")
    void 로그인하지_않으면_401() throws Exception {
        mvc.perform(patch("/api/users/me").contentType(MediaType.APPLICATION_JSON).content("""
                {"name":"이재용","nickname":"닉네임"}""")).andExpect(status().isUnauthorized());
        mvc.perform(patch("/api/users/me/password").contentType(MediaType.APPLICATION_JSON).content("""
                {"newPassword":"newMoa2026"}""")).andExpect(status().isUnauthorized());
    }
}
