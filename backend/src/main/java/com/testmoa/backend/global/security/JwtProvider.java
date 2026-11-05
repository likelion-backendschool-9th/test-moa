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
 * 토큰에는 회원 id(sub)만 넣는다. 권한·상태·구독은 요청마다 DB에서 읽어서, 바뀌면 바로 반영된다
 */
@Component
public class JwtProvider {
    private final JwtEncoder jwtEncoder;
    private final Duration accessTokenTtl;

    public JwtProvider(JwtEncoder jwtEncoder, @Value("${jwt.access-token-ttl}") Duration accessTokenTtl) {
        this.jwtEncoder = jwtEncoder;
        this.accessTokenTtl = accessTokenTtl;
    }

    public String createAccessToken(Long userId) {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject(String.valueOf(userId))
                .issuedAt(now)
                .expiresAt(now.plus(accessTokenTtl))
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();

        return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

    public Duration getAccessTokenTtl() {
        return accessTokenTtl;
    }
}
