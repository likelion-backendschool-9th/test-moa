package com.testmoa.backend.controller;

import com.jayway.jsonpath.JsonPath;
import com.testmoa.backend.domain.entity.User;
import com.testmoa.backend.domain.repository.UserRepository;
import com.testmoa.backend.global.common.UserStatus;
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

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 가입·로그인·갱신·로그아웃. 실제 DB(로컬 5433, CI Postgres)에 쓰고 테스트마다 되돌린다
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AuthControllerTest {

    @Autowired MockMvc mvc;
    @Autowired UserRepository userRepository;

    private final String suffix = UUID.randomUUID().toString().substring(0, 8);
    private final String email = "moa" + suffix + "@example.com";
    private final String nickname = "모아" + suffix;

    private ResultActions postJson(String path, String json) throws Exception {
        return mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private ResultActions signup(String email, String nickname) throws Exception {
        return postJson("/api/auth/signup", """
                {"name":"김모아","nickname":"%s","email":"%s","password":"moa2026pw"}""".formatted(nickname, email));
    }

    private ResultActions login(String email, String password) throws Exception {
        return postJson("/api/auth/login", """
                {"email":"%s","password":"%s"}""".formatted(email, password));
    }

    private String field(ResultActions result, String path) throws Exception {
        return JsonPath.read(result.andReturn().getResponse().getContentAsString(), path);
    }

    @Test
    @DisplayName("#80-S1·S3 가입하면 로그인할 수 있고 access 토큰이 통한다")
    void 가입하면_로그인할_수_있고_access_토큰이_통한다() throws Exception {
        signup(email, nickname).andExpect(status().isCreated()).andExpect(jsonPath("$.success").value(true));

        ResultActions result = login(email.toUpperCase(), "moa2026pw")  // 이메일 대소문자는 가리지 않는다
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessTokenExpiresIn").value(1800))
                .andExpect(jsonPath("$.data.refreshTokenExpiresIn").value(1209600));

        // 인증을 통과하면 없는 주소라 404, 막히면 401
        mvc.perform(get("/api/anything").header("Authorization", "Bearer " + field(result, "$.data.accessToken")))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("#80-S2 이미 쓰는 이메일과 닉네임은 409")
    void 이미_쓰는_이메일과_닉네임은_409() throws Exception {
        signup(email, nickname);

        signup(email, "다른" + suffix).andExpect(status().isConflict()).andExpect(jsonPath("$.error.code").value("EMAIL_TAKEN"));
        signup("other" + email, nickname).andExpect(status().isConflict()).andExpect(jsonPath("$.error.code").value("NICKNAME_TAKEN"));
    }

    @Test
    @DisplayName("#80-S2 형식이 틀리면 칸별 문구를 준다")
    void 형식이_틀리면_칸별_문구를_준다() throws Exception {
        postJson("/api/auth/signup", """
                {"name":"","nickname":"윤슬!!","email":"moa","password":"abc"}""")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"))
                .andExpect(jsonPath("$.error.fields.name").value("이름을 입력해 주세요"))
                .andExpect(jsonPath("$.error.fields.nickname").value("닉네임은 한글·영문·숫자 1~39자예요"))
                .andExpect(jsonPath("$.error.fields.email").value("이메일 형식이 맞지 않아요"))
                .andExpect(jsonPath("$.error.fields.password").value("영문·숫자·특수문자로, 영문과 숫자를 섞어 8~64자로 써 주세요"));
    }

    @Test
    @DisplayName("#80-S4 틀린 비밀번호와 없는 이메일은 같은 401")
    void 틀린_비밀번호와_없는_이메일은_같은_401() throws Exception {
        signup(email, nickname);

        login(email, "wrong1234").andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("INVALID_CREDENTIALS"));
        login("nobody" + email, "moa2026pw").andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("INVALID_CREDENTIALS"));
    }

    @Test
    @DisplayName("#80-S8 BCrypt 한도(72바이트)를 넘는 비밀번호는 500이 아니라 칸별 400·같은 401이다")
    void 한글이_섞인_긴_비밀번호는_가입은_400_로그인은_401() throws Exception {
        String tooLong = "가".repeat(24) + "a1"; // 26자지만 UTF-8로 74바이트

        postJson("/api/auth/signup", """
                {"name":"김모아","nickname":"%s","email":"%s","password":"%s"}""".formatted(nickname, email, tooLong))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.fields.password").value("영문·숫자·특수문자로, 영문과 숫자를 섞어 8~64자로 써 주세요"));

        signup(email, nickname);
        login(email, tooLong).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("INVALID_CREDENTIALS"));
    }

    @Test
    @DisplayName("#80-S5 정지된 회원은 로그인할 수 없다")
    void 정지된_회원은_로그인할_수_없다() throws Exception {
        signup(email, nickname);
        User user = userRepository.findAll().stream().filter(found -> found.getEmail().equals(email)).findFirst().orElseThrow();
        ReflectionTestUtils.setField(user, "status", UserStatus.SUSPENDED); // 정지 기능은 운영자 회원 관리에서 만든다

        login(email, "moa2026pw").andExpect(status().isForbidden()).andExpect(jsonPath("$.error.code").value("SUSPENDED"));
    }

    @Test
    @DisplayName("#80-S9 로그아웃하면 그 로그인 세션이 끝나서, 로그아웃 전에 갱신으로 받은 토큰도 쓸 수 없다")
    void 로그아웃하면_로그아웃_전에_갱신한_토큰도_못_쓴다() throws Exception {
        signup(email, nickname);
        String r0 = field(login(email, "moa2026pw"), "$.data.refreshToken");
        String otherDevice = field(login(email, "moa2026pw"), "$.data.accessToken"); // 다른 기기의 로그인

        // 요청 A: R0로 갱신해 R1·A1을 받는다(브라우저에는 아직 도착하지 않은 응답)
        ResultActions refreshed = postJson("/api/auth/refresh", "{\"refreshToken\":\"" + r0 + "\"}").andExpect(status().isOk());
        String r1 = field(refreshed, "$.data.refreshToken");
        String a1 = field(refreshed, "$.data.accessToken");
        me(a1).andExpect(status().isOk());

        // 요청 B: 브라우저 쿠키에 남은 R0로 로그아웃한다
        postJson("/api/auth/logout", "{\"refreshToken\":\"" + r0 + "\"}").andExpect(status().isOk());

        // A의 늦은 응답이 쿠키에 R1·A1을 다시 넣어도 쓸 수 없다
        postJson("/api/auth/refresh", "{\"refreshToken\":\"" + r1 + "\"}").andExpect(status().isUnauthorized());
        me(a1).andExpect(status().isUnauthorized());

        // 다른 기기의 로그인은 그대로다
        me(otherDevice).andExpect(status().isOk());
    }

    @Test
    @DisplayName("#80-S10 여러 번 갱신한 뒤에도 처음 토큰으로 로그아웃하면 그 세션이 끝난다")
    void 여러_번_갱신한_뒤_처음_토큰으로_로그아웃해도_세션이_끝난다() throws Exception {
        signup(email, nickname);
        String r0 = field(login(email, "moa2026pw"), "$.data.refreshToken");

        // R0 → R1 → R2로 두 번 갱신한다(다른 탭·요청이 먼저 갱신한 상황)
        String r1 = field(postJson("/api/auth/refresh", "{\"refreshToken\":\"" + r0 + "\"}"), "$.data.refreshToken");
        ResultActions second = postJson("/api/auth/refresh", "{\"refreshToken\":\"" + r1 + "\"}").andExpect(status().isOk());
        String r2 = field(second, "$.data.refreshToken");
        String a2 = field(second, "$.data.accessToken");

        // R0를 담고 있던 늦은 로그아웃 요청
        postJson("/api/auth/logout", "{\"refreshToken\":\"" + r0 + "\"}").andExpect(status().isOk());

        postJson("/api/auth/refresh", "{\"refreshToken\":\"" + r2 + "\"}").andExpect(status().isUnauthorized());
        me(a2).andExpect(status().isUnauthorized());
    }

    private ResultActions me(String accessToken) throws Exception {
        return mvc.perform(get("/api/users/me").header("Authorization", "Bearer " + accessToken));
    }

    @Test
    @DisplayName("#80-S6·S7 refresh 토큰은 한 번만 쓸 수 있고 로그아웃하면 못 쓴다")
    void refresh_토큰은_한_번만_쓸_수_있고_로그아웃하면_못_쓴다() throws Exception {
        signup(email, nickname);
        String first = field(login(email, "moa2026pw"), "$.data.refreshToken");

        String second = field(postJson("/api/auth/refresh", "{\"refreshToken\":\"" + first + "\"}")
                .andExpect(status().isOk()), "$.data.refreshToken");

        postJson("/api/auth/refresh", "{\"refreshToken\":\"" + first + "\"}")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("INVALID_REFRESH_TOKEN"));

        postJson("/api/auth/logout", "{\"refreshToken\":\"" + second + "\"}").andExpect(status().isOk());
        postJson("/api/auth/refresh", "{\"refreshToken\":\"" + second + "\"}").andExpect(status().isUnauthorized());
    }
}
