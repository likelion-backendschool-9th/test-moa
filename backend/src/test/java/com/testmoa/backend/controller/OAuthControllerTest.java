package com.testmoa.backend.controller;

import com.jayway.jsonpath.JsonPath;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.repository.AccountRepository;
import com.testmoa.backend.repository.UserRepository;
import com.testmoa.backend.global.security.Provider;
import com.testmoa.backend.global.security.Role;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.security.JwtProvider;
import com.testmoa.backend.global.security.OAuthClient;
import com.testmoa.backend.global.security.OAuthClient.OAuthProfile;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 소셜 로그인·가입·연동. 제공자와의 통신(OAuthClient)만 가짜로 바꾸고, 제공자가 돌려준 code마다 정해 둔 회원 정보를 준다
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class OAuthControllerTest {

    @Autowired MockMvc mvc;
    @Autowired UserRepository userRepository;
    @Autowired AccountRepository accountRepository;
    @Autowired JwtProvider jwtProvider;
    @MockitoBean OAuthClient oauthClient;

    private final String suffix = UUID.randomUUID().toString().substring(0, 8);
    private final String email = "social" + suffix + "@example.com";

    // code를 보내면 제공자가 이 회원 정보를 돌려준 것으로 한다
    private void provider(String code, Provider provider, String providerCode, String email, boolean verified, String nickname) {
        given(oauthClient.fetchProfile(eq(provider), eq(code), anyString()))
                .willReturn(new OAuthProfile(provider, providerCode, email, verified, nickname));
    }

    private ResultActions oauthLogin(String provider, String code) throws Exception {
        return postJson("/api/auth/oauth/" + provider, """
                {"code":"%s","redirectUri":"http://localhost:3000/auth/callback/%s"}""".formatted(code, provider));
    }

    private ResultActions oauthSignup(String signupToken, String name) throws Exception {
        return postJson("/api/auth/oauth/signup", """
                {"signupToken":"%s","name":"%s"}""".formatted(signupToken, name));
    }

    private ResultActions postJson(String path, String json) throws Exception {
        return mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private ResultActions me(String accessToken) throws Exception {
        return mvc.perform(get("/api/users/me").header("Authorization", "Bearer " + accessToken));
    }

    private static String field(ResultActions result, String path) throws Exception {
        return JsonPath.read(result.andReturn().getResponse().getContentAsString(), path);
    }

    // 처음 온 사람을 가입시키고 access 토큰을 돌려준다
    private String signUpWithGithub(String code, String githubId, String login) throws Exception {
        provider(code, Provider.GITHUB, githubId, email, true, login);
        String signupToken = field(oauthLogin("github", code), "$.data.signupToken");
        return field(oauthSignup(signupToken, "김소셜").andExpect(status().isCreated()), "$.data.accessToken");
    }

    private User saveEmailUser(String email, UserStatus status) {
        return userRepository.save(User.builder()
                .name("김이메일").nickname("이메일" + UUID.randomUUID().toString().substring(0, 8)).email(email)
                .role(Role.USER).status(status).build());
    }

    @Test
    @DisplayName("#83-S1·S2 처음 온 사람은 이름을 입력해 가입하고, 다음부터는 바로 로그인된다")
    void 처음_온_사람은_이름을_입력해_가입하고_다음부터는_바로_로그인된다() throws Exception {
        provider("first", Provider.GITHUB, "gh-" + suffix, email, true, "moa-" + suffix);

        oauthLogin("github", "first")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.signupRequired").value(true))
                .andExpect(jsonPath("$.data.tokens").doesNotExist())
                .andExpect(jsonPath("$.data.email").value(email))
                .andExpect(jsonPath("$.data.nickname").value("moa" + suffix)); // 규칙에 없는 '-'는 뺀다
        String signupToken = field(oauthLogin("github", "first"), "$.data.signupToken");

        String access = field(oauthSignup(signupToken, "김소셜").andExpect(status().isCreated()), "$.data.accessToken");
        me(access).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("김소셜"))
                .andExpect(jsonPath("$.data.nickname").value("moa" + suffix));

        // 같은 GitHub 계정으로 다시 오면 바로 로그인
        provider("again", Provider.GITHUB, "gh-" + suffix, email, true, "moa-" + suffix);
        oauthLogin("github", "again")
                .andExpect(jsonPath("$.data.signupRequired").value(false))
                .andExpect(jsonPath("$.data.tokens.accessToken").isNotEmpty());
    }

    @Test
    @DisplayName("#83-S2 이름은 필수이고, 제공자 이름이 겹치거나 닉네임 규칙에 맞지 않으면 다른 닉네임을 쓴다")
    void 이름은_필수이고_닉네임이_겹치면_숫자를_붙인다() throws Exception {
        saveEmailUser("taken" + email, UserStatus.ACTIVE);
        String taken = userRepository.findByEmail("taken" + email).orElseThrow().getNickname();
        provider("dup", Provider.GOOGLE, "g-" + suffix, email, true, taken);
        ResultActions first = oauthLogin("google", "dup");
        String signupToken = field(first, "$.data.signupToken");
        String shown = field(first, "$.data.nickname"); // 이름 입력 화면에 보이는 닉네임

        oauthSignup(signupToken, " ").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.fields.name").value("이름을 입력해 주세요"));

        String access = field(oauthSignup(signupToken, "김소셜"), "$.data.accessToken");
        String nickname = field(me(access), "$.data.nickname");
        assertThat(nickname).startsWith(taken).hasSize(taken.length() + 4).isNotEqualTo(taken);
        // 화면에 보인 닉네임 그대로 가입된다
        assertThat(nickname).isEqualTo(shown);

        // 닉네임으로 쓸 글자가 하나도 없으면 "회원"에서 시작한다
        provider("emoji", Provider.GOOGLE, "g2-" + suffix, "emoji" + email, true, "🙂 !!");
        assertThat(field(oauthLogin("google", "emoji"), "$.data.nickname")).startsWith("회원");
    }

    @Test
    @DisplayName("#83-S3 제공자가 확인한 이메일과 같은 소셜 회원에 연동해 로그인하고, 확인되지 않은 이메일로는 연동하지 않는다")
    void 확인된_이메일이_같은_소셜_회원에_연동한다() throws Exception {
        // 구글로 가입한 회원(비밀번호 없음)
        provider("google", Provider.GOOGLE, "g-" + suffix, email, true, "구글");
        String signupToken = field(oauthLogin("google", "google"), "$.data.signupToken");
        String access = field(oauthSignup(signupToken, "김소셜"), "$.data.accessToken");
        Integer userId = JsonPath.read(me(access).andReturn().getResponse().getContentAsString(), "$.data.id");

        provider("unverified", Provider.GITHUB, "gh-" + suffix, email, false, "moa");
        oauthLogin("github", "unverified").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("OAUTH_EMAIL_REQUIRED"));
        assertThat(accountRepository.findByUserId(userId.longValue())).extracting("provider").containsExactly(Provider.GOOGLE);

        // 같은 이메일의 GitHub으로 오면 그 회원에 연동해 로그인
        provider("verified", Provider.GITHUB, "gh-" + suffix, email.toUpperCase(), true, "moa");
        String viaGithub = field(oauthLogin("github", "verified").andExpect(jsonPath("$.data.signupRequired").value(false)),
                "$.data.tokens.accessToken");
        me(viaGithub).andExpect(jsonPath("$.data.id").value(userId));
        assertThat(accountRepository.findByUserId(userId.longValue())).extracting("provider")
                .containsExactlyInAnyOrder(Provider.GOOGLE, Provider.GITHUB);

        // 같은 이메일의 다른 GitHub 계정은 제공자마다 하나라 연동하지 않는다
        provider("other", Provider.GITHUB, "gh-other-" + suffix, email, true, "moa");
        oauthLogin("github", "other").andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("PROVIDER_ALREADY_LINKED"));
    }

    @Test
    @DisplayName("#83-S13 이메일 가입(비밀번호가 있는) 회원에는 같은 이메일이어도 자동 연동하지 않는다")
    void 이메일_가입_회원에는_자동_연동하지_않는다() throws Exception {
        // 이메일 인증이 없어서, 남이 이 이메일로 먼저 가입해 두었을 수 있다
        postJson("/api/auth/signup", """
                {"name":"김이메일","nickname":"이메일%s","email":"%s","password":"moa2026pw"}""".formatted(suffix, email))
                .andExpect(status().isCreated());
        User user = userRepository.findByEmail(email).orElseThrow();

        provider("google", Provider.GOOGLE, "g-" + suffix, email, true, "구글");
        oauthLogin("google", "google").andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("EMAIL_ACCOUNT_EXISTS"))
                .andExpect(jsonPath("$.data").doesNotExist());
        assertThat(accountRepository.findByUserId(user.getId())).extracting("provider").containsExactly(Provider.LOCAL);
    }

    @Test
    @DisplayName("#83-S4 로그인한 회원이 소셜 계정을 연동·해제하고, 마지막 로그인 방법은 해제할 수 없다")
    void 소셜_계정을_연동하고_해제한다() throws Exception {
        String access = signUpWithGithub("signup", "gh-" + suffix, "moa" + suffix);

        mvc.perform(delete("/api/users/me/accounts/github").header("Authorization", "Bearer " + access))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("LAST_LOGIN_METHOD"));

        provider("link", Provider.GOOGLE, "g-" + suffix, "other" + email, true, "구글");
        mvc.perform(post("/api/users/me/accounts/google").header("Authorization", "Bearer " + access)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"link\",\"redirectUri\":\"http://localhost:3000/auth/callback/google\"}"))
                .andExpect(status().isOk());
        // 연동한 구글로도 같은 회원으로 로그인된다
        String viaGoogle = field(oauthLogin("google", "link"), "$.data.tokens.accessToken");
        assertThat(field(me(viaGoogle), "$.data.email")).isEqualTo(email);

        mvc.perform(delete("/api/users/me/accounts/github").header("Authorization", "Bearer " + access))
                .andExpect(status().isOk());
        provider("gone", Provider.GITHUB, "gh-" + suffix, email, true, "moa");
        // 해제한 GitHub 계정은 연동이 없어져서, 이메일이 같은 회원에 다시 연동된다
        oauthLogin("github", "gone").andExpect(jsonPath("$.data.signupRequired").value(false));

        mvc.perform(post("/api/users/me/accounts/kakao").header("Authorization", "Bearer " + access)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"x\",\"redirectUri\":\"x\"}"))
                .andExpect(status().isNotFound());
        mvc.perform(delete("/api/users/me/accounts/google")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("#83-S5 다른 회원에 이미 연동된 소셜 계정은 연동할 수 없다")
    void 다른_회원에_연동된_계정은_연동할_수_없다() throws Exception {
        signUpWithGithub("owner", "gh-" + suffix, "moa" + suffix);
        User other = saveEmailUser("other" + email, UserStatus.ACTIVE);

        // 다른 회원이 같은 GitHub 계정을 연동하려 한다
        String token = jwtProvider.createAccessToken(other.getId());
        provider("steal", Provider.GITHUB, "gh-" + suffix, email, true, "moa");
        mvc.perform(post("/api/users/me/accounts/github").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"steal\",\"redirectUri\":\"http://localhost:3000/auth/callback/github\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("ACCOUNT_ALREADY_LINKED"));
    }

    @Test
    @DisplayName("#83-S6 가입 토큰은 위조하거나 access 토큰으로 바꿔 쓸 수 없다")
    void 가입_토큰은_바꿔_쓸_수_없다() throws Exception {
        provider("first", Provider.GITHUB, "gh-" + suffix, email, true, "moa");
        String signupToken = field(oauthLogin("github", "first"), "$.data.signupToken");

        // 가입 토큰을 로그인 토큰처럼 쓰면 401
        me(signupToken).andExpect(status().isUnauthorized());
        // 서명을 바꾸면 401
        oauthSignup(signupToken.substring(0, signupToken.length() - 2) + "xx", "김소셜")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("INVALID_SIGNUP_TOKEN"));
        // 로그인 토큰을 가입 토큰으로 쓰면 401
        String access = signUpWithGithub("first", "gh-" + suffix, "moa");
        oauthSignup(access, "김소셜").andExpect(status().isUnauthorized());
        // 이미 가입에 쓴 가입 토큰을 다시 쓰면 409
        oauthSignup(signupToken, "김소셜").andExpect(status().isConflict());
    }

    @Test
    @DisplayName("#83-S7 정지된 회원은 소셜 로그인도 막힌다")
    void 정지된_회원은_소셜_로그인도_막힌다() throws Exception {
        User user = saveEmailUser(email, UserStatus.ACTIVE);
        provider("link", Provider.GOOGLE, "g-" + suffix, email, true, "구글");
        oauthLogin("google", "link").andExpect(status().isOk());

        ReflectionTestUtils.setField(user, "status", UserStatus.SUSPENDED);
        userRepository.saveAndFlush(user);
        oauthLogin("google", "link").andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("SUSPENDED"));
    }

    @Test
    @DisplayName("#83-S8 동의 화면 주소에는 앱 id·돌아올 주소·state가 들어간다")
    void 동의_화면_주소() {
        OAuthClient real = new OAuthClient("google-id", "g-secret", "github-id", "gh-secret");

        assertThat(real.authorizeUrl(Provider.GITHUB, "http://localhost:3000/auth/callback/github", "abc"))
                .startsWith("https://github.com/login/oauth/authorize?")
                .contains("client_id=github-id", "redirect_uri=http://localhost:3000/auth/callback/github", "state=abc", "scope=read:user%20user:email");
        assertThat(real.authorizeUrl(Provider.GOOGLE, "http://localhost:3000/auth/callback/google", "abc"))
                .startsWith("https://accounts.google.com/o/oauth2/v2/auth?")
                .contains("client_id=google-id", "scope=openid%20email%20profile")
                .doesNotContain("secret");
    }
}
