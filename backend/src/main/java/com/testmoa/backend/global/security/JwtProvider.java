package com.testmoa.backend.global.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;

/**
 * access 토큰 발급. 검증은 SecurityConfig의 JwtDecoder가 요청마다 한다.
 * 토큰에는 회원 id(sub)와 로그인 세션 id(sid)만 넣는다. 권한·상태·구독·세션은 요청마다 DB에서 읽어서, 바뀌면 바로 반영된다
 */
@Component
public class JwtProvider {
    private final JwtEncoder jwtEncoder;
    private final Duration accessTokenTtl;

    public JwtProvider(JwtEncoder jwtEncoder, @Value("${jwt.access-token-ttl}") Duration accessTokenTtl) {
        this.jwtEncoder = jwtEncoder;
        this.accessTokenTtl = accessTokenTtl;
    }

    public static final String SESSION_CLAIM = "sid";

    /** 로그인·갱신에서 쓴다. 로그아웃해서 세션이 끝나면 이 토큰도 401이 된다 */
    public String createAccessToken(Long userId, String sessionId) {
        Instant now = Instant.now();
        JwtClaimsSet.Builder claims = JwtClaimsSet.builder()
                .subject(String.valueOf(userId))
                .issuedAt(now)
                .expiresAt(now.plus(accessTokenTtl));
        if (sessionId != null) claims.claim(SESSION_CLAIM, sessionId);
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();

        return jwtEncoder.encode(JwtEncoderParameters.from(header, claims.build())).getTokenValue();
    }

    /**
     * 세션 없는 토큰. 테스트에서 회원 토큰을 바로 만들 때 쓴다.
     * ponytail: sid가 없는 토큰은 세션 확인을 건너뛴다. 로그인·갱신은 늘 sid를 넣어서 서비스 토큰에는 영향이 없다.
     * 팀 테스트가 세션 있는 토큰으로 옮겨 가면 지운다
     */
    public String createAccessToken(Long userId) {
        return createAccessToken(userId, null);
    }

    public Duration getAccessTokenTtl() {
        return accessTokenTtl;
    }
}
