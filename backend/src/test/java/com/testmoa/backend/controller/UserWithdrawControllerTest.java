package com.testmoa.backend.controller;

import com.jayway.jsonpath.JsonPath;
import com.testmoa.backend.global.security.OAuthClient.OAuthProfile;
import com.testmoa.backend.entity.Account;
import com.testmoa.backend.entity.Cashout;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.global.security.JwtProvider;
import com.testmoa.backend.global.security.Provider;
import com.testmoa.backend.global.security.Role;
import com.testmoa.backend.repository.AccountRepository;
import com.testmoa.backend.repository.RefreshTokenRepository;
import com.testmoa.backend.repository.UserRepository;
import com.testmoa.backend.service.AuthService;
import com.testmoa.backend.service.UserService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 회원 탈퇴(#84). 30일 유예, 되돌리기, 파기. 가입·로그인은 실제 API로 한다
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class UserWithdrawControllerTest {

    @Autowired MockMvc mvc;
    @Autowired UserRepository userRepository;
    @Autowired AccountRepository accountRepository;
    @Autowired RefreshTokenRepository refreshTokenRepository;
    @Autowired UserService userService;
    @Autowired AuthService authService;
    @Autowired EntityManager em;
    @Autowired JwtProvider jwtProvider;

    private final String suffix = UUID.randomUUID().toString().substring(0, 8);
    private final String email = "bye" + suffix + "@example.com";
    private static final String PASSWORD = "moa2026pw";

    private ResultActions postJson(String path, String json) throws Exception {
        return mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private ResultActions signup() throws Exception {
        return postJson("/api/auth/signup", """
                {"name":"김탈퇴","nickname":"탈퇴%s","email":"%s","password":"%s"}""".formatted(suffix, email, PASSWORD));
    }

    private ResultActions login() throws Exception {
        return postJson("/api/auth/login", """
                {"email":"%s","password":"%s"}""".formatted(email, PASSWORD));
    }

    private static String field(ResultActions result, String path) throws Exception {
        return JsonPath.read(result.andReturn().getResponse().getContentAsString(), path);
    }

    private ResultActions withdraw(String access, String json) throws Exception {
        return mvc.perform(delete("/api/users/me").header("Authorization", "Bearer " + access)
                .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private User me() {
        em.flush();
        em.clear();
        return userRepository.findByEmail(email).orElseThrow();
    }

    // 가입·로그인 뒤 탈퇴까지 하고 회원을 돌려준다
    private User signupAndWithdraw() throws Exception {
        signup().andExpect(status().isCreated());
        String access = field(login().andExpect(status().isOk()), "$.data.accessToken");
        withdraw(access, """
                {"password":"%s"}""".formatted(PASSWORD)).andExpect(status().isOk());
        return me();
    }

    @Test
    @DisplayName("#84-S14 비밀번호를 확인하고 탈퇴하면 탈퇴 유예가 되고 모든 기기의 로그인이 끊긴다")
    void 탈퇴하면_유예가_되고_로그인이_끊긴다() throws Exception {
        signup().andExpect(status().isCreated());
        ResultActions first = login().andExpect(status().isOk());
        String access = field(first, "$.data.accessToken");
        String otherRefresh = field(login(), "$.data.refreshToken");

        withdraw(access, """
                {"password":"틀린비번1234"}""").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.fields.password").value("비밀번호가 맞지 않아요"));
        withdraw(access, """
                {"password":"%s"}""".formatted(PASSWORD)).andExpect(status().isOk());

        User user = me();
        assertThat(user.getStatus()).isEqualTo(UserStatus.WITHDRAWN);
        assertThat(user.getWithdrawnAt()).isNotNull();
        mvc.perform(get("/api/users/me").header("Authorization", "Bearer " + access)).andExpect(status().isUnauthorized());
        postJson("/api/auth/refresh", """
                {"refreshToken":"%s"}""".formatted(otherRefresh)).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("#84-S15 소셜로만 가입한 회원은 확인 문구로 탈퇴한다")
    void 소셜_회원은_확인_문구로_탈퇴한다() throws Exception {
        User user = userRepository.save(User.builder().name("소셜").nickname("소셜" + suffix).email(email)
                .role(Role.USER).status(UserStatus.ACTIVE).build());
        accountRepository.save(Account.builder().user(user).provider(Provider.GITHUB).providerCode("gh" + suffix).build());
        String access = authService.oauthLogin(new OAuthProfile(Provider.GITHUB, "gh" + suffix, email, true, "x"))
                .tokens().accessToken();

        withdraw(access, """
                {"confirmText":"탈퇴"}""").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.fields.confirmText").exists());
        withdraw(access, """
                {"confirmText":" 탈퇴합니다 "}""").andExpect(status().isOk());
        assertThat(me().getStatus()).isEqualTo(UserStatus.WITHDRAWN);
    }

    @Test
    @DisplayName("#84-S16 출금 처리 중인 요청이 있으면 탈퇴할 수 없다")
    void 출금_처리_중이면_탈퇴_못_한다() throws Exception {
        signup().andExpect(status().isCreated());
        String access = field(login(), "$.data.accessToken");
        em.persist(Cashout.builder().user(userRepository.findByEmail(email).orElseThrow())
                .amount(10000).bank("모아은행").accountNumber("1234567890").accountHolder("김탈퇴").build());

        withdraw(access, """
                {"password":"%s"}""".formatted(PASSWORD)).andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("CASHOUT_IN_PROGRESS"));
        assertThat(me().getStatus()).isEqualTo(UserStatus.ACTIVE);
    }

    @Test
    @DisplayName("#84-S17 유예 기간에 로그인하면 되돌리기 안내를 받고, 되돌리면 그대로 다시 쓴다")
    void 유예_기간에_되돌린다() throws Exception {
        signupAndWithdraw();

        ResultActions pending = login().andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("WITHDRAWAL_PENDING"))
                // 시간대가 붙어 있어 브라우저가 날짜를 어긋나게 읽지 않는다 (예: 2026-12-10T01:20:00.123456Z)
                .andExpect(jsonPath("$.error.fields.purgeAt").value(org.hamcrest.Matchers.matchesPattern(".*(Z|[+-]\\d{2}:\\d{2})$")))
                .andExpect(jsonPath("$.error.fields.nickname").value("탈퇴" + suffix));
        String restoreToken = field(pending, "$.error.fields.restoreToken");

        // 되돌리기 토큰은 access 토큰으로 쓸 수 없다
        mvc.perform(get("/api/users/me").header("Authorization", "Bearer " + restoreToken)).andExpect(status().isUnauthorized());
        postJson("/api/auth/restore", """
                {"restoreToken":"nope"}""").andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("INVALID_RESTORE_TOKEN"));

        String access = field(postJson("/api/auth/restore", """
                {"restoreToken":"%s"}""".formatted(restoreToken)).andExpect(status().isOk()), "$.data.accessToken");
        mvc.perform(get("/api/users/me").header("Authorization", "Bearer " + access)).andExpect(status().isOk());
        User user = me();
        assertThat(user.getStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(user.getWithdrawnAt()).isNull();
        // 이미 되돌린 토큰은 다시 쓸 수 없다
        postJson("/api/auth/restore", """
                {"restoreToken":"%s"}""".formatted(restoreToken)).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("#84-S18 유예 회원은 소셜 로그인에서도 되돌리기 안내를 받는다")
    void 소셜_로그인도_되돌리기_안내() throws Exception {
        User user = signupAndWithdraw();
        accountRepository.save(Account.builder().user(user).provider(Provider.GOOGLE).providerCode("g" + suffix).build());

        assertThatThrownBy(() -> authService.oauthLogin(new OAuthProfile(Provider.GOOGLE, "g" + suffix, email, true, "x")))
                .isInstanceOfSatisfying(BusinessException.class, e -> {
                    assertThat(e.getErrorCode()).isEqualTo(ErrorCode.WITHDRAWAL_PENDING);
                    assertThat(e.getFields()).containsKey("restoreToken");
                });
    }

    @Test
    @DisplayName("#84-S19 유예 기간에는 같은 이메일로 가입할 수 없다")
    void 유예_기간에는_같은_이메일로_가입_못_한다() throws Exception {
        signupAndWithdraw();
        postJson("/api/auth/signup", """
                {"name":"새사람","nickname":"새%s","email":"%s","password":"%s"}""".formatted(suffix, email, PASSWORD))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("EMAIL_TAKEN"));
    }

    @Test
    @DisplayName("#84-S20 30일이 지나면 개인정보와 로그인 계정을 파기하고, 같은 이메일로 다시 가입할 수 있다")
    void 삼십일_뒤_파기() throws Exception {
        User user = signupAndWithdraw();
        Long id = user.getId();
        LocalDateTime withdrawnAt = user.getWithdrawnAt();

        // 29일째에는 파기하지 않는다
        assertThat(userService.purgeWithdrawnBefore(withdrawnAt.minusDays(1))).isZero();
        assertThat(userService.purgeWithdrawnBefore(withdrawnAt.plusSeconds(1))).isPositive();
        em.flush();
        em.clear();

        User purged = userRepository.findById(id).orElseThrow();
        assertThat(purged.getStatus()).isEqualTo(UserStatus.DELETED);
        assertThat(purged.getName()).isNull();
        assertThat(purged.getEmail()).isEqualTo("deleted-" + id + "@withdrawn");
        assertThat(purged.getNickname()).isEqualTo("탈퇴한 회원#" + id);
        assertThat(accountRepository.findByUserId(id)).isEmpty();

        login().andExpect(status().isUnauthorized());
        signup().andExpect(status().isCreated());
    }

    @Test
    @DisplayName("#84-S27 30일이 지나면 파기 작업 전이라도 로그인·되돌리기를 할 수 없다")
    void 삼십일이_지나면_되돌릴_수_없다() throws Exception {
        signupAndWithdraw();
        String restoreToken = field(login().andExpect(status().isForbidden()), "$.error.fields.restoreToken");

        User user = me();
        ReflectionTestUtils.setField(user, "withdrawnAt", user.getWithdrawnAt().minusDays(31));
        userRepository.saveAndFlush(user);
        // 토큰의 탈퇴 일시도 옮긴 일시와 같게 해서, 기한 검사만 남긴다
        String expiredToken = jwtProvider.createRestoreToken(user.getId(), user.getWithdrawnAt());

        login().andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("INVALID_CREDENTIALS"));
        postJson("/api/auth/restore", """
                {"restoreToken":"%s"}""".formatted(expiredToken)).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("INVALID_RESTORE_TOKEN"));
        postJson("/api/auth/restore", """
                {"restoreToken":"%s"}""".formatted(restoreToken)).andExpect(status().isUnauthorized());
        assertThat(me().getStatus()).isEqualTo(UserStatus.WITHDRAWN);
    }

    @Test
    @DisplayName("#84-S28 되돌린 뒤 다시 탈퇴하면 예전 되돌리기 토큰은 쓸 수 없다")
    void 다시_탈퇴하면_예전_토큰은_못_쓴다() throws Exception {
        signupAndWithdraw();
        String oldToken = field(login(), "$.error.fields.restoreToken");
        String access = field(postJson("/api/auth/restore", """
                {"restoreToken":"%s"}""".formatted(oldToken)).andExpect(status().isOk()), "$.data.accessToken");

        withdraw(access, """
                {"password":"%s"}""".formatted(PASSWORD)).andExpect(status().isOk());
        postJson("/api/auth/restore", """
                {"restoreToken":"%s"}""".formatted(oldToken)).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("INVALID_RESTORE_TOKEN"));
        assertThat(me().getStatus()).isEqualTo(UserStatus.WITHDRAWN);

        // 새로 로그인해 받은 토큰으로는 되돌린다
        String newToken = field(login(), "$.error.fields.restoreToken");
        postJson("/api/auth/restore", """
                {"restoreToken":"%s"}""".formatted(newToken)).andExpect(status().isOk());
    }

    @Test
    @DisplayName("#84-S29 파기한 회원의 이메일 주소로는 가입할 수 없어, 파기가 가입 이메일과 겹치지 않는다")
    void 파기_이메일로는_가입_못_한다() throws Exception {
        postJson("/api/auth/signup", """
                {"name":"흉내","nickname":"흉내%s","email":"deleted-1@withdrawn","password":"%s"}""".formatted(suffix, PASSWORD))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.fields.email").exists());
    }
}
