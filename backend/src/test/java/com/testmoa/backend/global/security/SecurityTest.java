package com.testmoa.backend.global.security;

import com.testmoa.backend.entity.User;
import com.testmoa.backend.repository.UserRepository;
import com.testmoa.backend.entity.enums.UserStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 토큰 검사와 권한 규칙. 아직 로그인이 필요한 API가 없어서 없는 주소로 확인한다:
 * 인증을 통과하면 404, 막히면 401·403이 나온다
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class SecurityTest {

    @Autowired MockMvc mvc;
    @Autowired JwtProvider jwtProvider;
    @Autowired JwtEncoder jwtEncoder;
    @Autowired UserRepository userRepository;

    private Long saveUser(Role role, UserStatus status) {
        User user = User.builder()
                .nickname("t" + UUID.randomUUID().toString().substring(0, 8))
                .email(UUID.randomUUID() + "@example.com")
                .role(role)
                .status(status)
                .build();
        return userRepository.save(user).getId();
    }

    private ResultActions call(String path, String token) throws Exception {
        return mvc.perform(get(path).header("Authorization", "Bearer " + token));
    }

    @Test
    @DisplayName("#79-S3 공개 주소는 토큰 없이 열린다")
    void 공개_주소는_토큰_없이_열린다() throws Exception {
        // 공개 주소 중 GET으로 바로 200이 나오는 곳이 API 문서뿐이라 이 주소로 확인한다
        mvc.perform(get("/v3/api-docs")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("#79-S3 토큰이 없으면 401")
    void 토큰이_없으면_401() throws Exception {
        mvc.perform(get("/api/anything"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
    }

    @Test
    @DisplayName("#79-S6 회원 토큰이면 통과한다")
    void 회원_토큰이면_통과한다() throws Exception {
        String token = jwtProvider.createAccessToken(saveUser(Role.USER, UserStatus.ACTIVE));
        call("/api/anything", token).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("#79-S5 일반 회원은 운영자 주소에서 403")
    void 일반_회원은_운영자_주소에서_403() throws Exception {
        String token = jwtProvider.createAccessToken(saveUser(Role.USER, UserStatus.ACTIVE));
        call("/api/admin/anything", token)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
    }

    @Test
    @DisplayName("#79-S5 운영자는 운영자 주소를 통과한다")
    void 운영자는_운영자_주소를_통과한다() throws Exception {
        String token = jwtProvider.createAccessToken(saveUser(Role.ADMIN, UserStatus.ACTIVE));
        call("/api/admin/anything", token).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("#79-S4 정지된 회원의 토큰은 401")
    void 정지된_회원의_토큰은_401() throws Exception {
        String token = jwtProvider.createAccessToken(saveUser(Role.USER, UserStatus.SUSPENDED));
        call("/api/anything", token).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("#79-S4 없는 회원의 토큰은 401")
    void 없는_회원의_토큰은_401() throws Exception {
        call("/api/anything", jwtProvider.createAccessToken(Long.MAX_VALUE)).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("#79-S4 위조된 토큰은 401")
    void 위조된_토큰은_401() throws Exception {
        String token = jwtProvider.createAccessToken(saveUser(Role.USER, UserStatus.ACTIVE));
        call("/api/anything", token.substring(0, token.length() - 2) + "xx").andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("#79-S4 만료된 토큰은 401")
    void 만료된_토큰은_401() throws Exception {
        Long userId = saveUser(Role.USER, UserStatus.ACTIVE);
        Instant past = Instant.now().minusSeconds(3600);
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject(String.valueOf(userId))
                .issuedAt(past)
                .expiresAt(past.plusSeconds(600))
                .build();
        String token = jwtEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                .getTokenValue();

        call("/api/anything", token).andExpect(status().isUnauthorized());
    }
}
