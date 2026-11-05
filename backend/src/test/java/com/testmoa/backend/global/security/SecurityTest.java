package com.testmoa.backend.global.security;

import com.testmoa.backend.domain.entity.User;
import com.testmoa.backend.domain.repository.UserRepository;
import com.testmoa.backend.global.common.Role;
import com.testmoa.backend.global.common.UserStatus;
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
    void 공개_주소는_토큰_없이_열린다() throws Exception {
        mvc.perform(get("/api/samples")).andExpect(status().isOk());
    }

    @Test
    void 토큰이_없으면_401() throws Exception {
        mvc.perform(get("/api/anything"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
    }

    @Test
    void 회원_토큰이면_통과한다() throws Exception {
        String token = jwtProvider.createAccessToken(saveUser(Role.USER, UserStatus.ACTIVE));
        call("/api/anything", token).andExpect(status().isNotFound());
    }

    @Test
    void 일반_회원은_운영자_주소에서_403() throws Exception {
        String token = jwtProvider.createAccessToken(saveUser(Role.USER, UserStatus.ACTIVE));
        call("/api/admin/anything", token)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
    }

    @Test
    void 운영자는_운영자_주소를_통과한다() throws Exception {
        String token = jwtProvider.createAccessToken(saveUser(Role.ADMIN, UserStatus.ACTIVE));
        call("/api/admin/anything", token).andExpect(status().isNotFound());
    }

    @Test
    void 정지된_회원의_토큰은_401() throws Exception {
        String token = jwtProvider.createAccessToken(saveUser(Role.USER, UserStatus.SUSPENDED));
        call("/api/anything", token).andExpect(status().isUnauthorized());
    }

    @Test
    void 없는_회원의_토큰은_401() throws Exception {
        call("/api/anything", jwtProvider.createAccessToken(Long.MAX_VALUE)).andExpect(status().isUnauthorized());
    }

    @Test
    void 위조된_토큰은_401() throws Exception {
        String token = jwtProvider.createAccessToken(saveUser(Role.USER, UserStatus.ACTIVE));
        call("/api/anything", token.substring(0, token.length() - 2) + "xx").andExpect(status().isUnauthorized());
    }

    @Test
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
