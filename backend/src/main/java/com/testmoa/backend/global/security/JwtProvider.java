package com.testmoa.backend.global.security;

import com.testmoa.backend.global.security.OAuthClient.OAuthProfile;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Optional;

/**
 * access 토큰과 소셜 가입 토큰 발급. access 토큰 검증은 SecurityConfig의 JwtDecoder가 요청마다 한다.
 * 토큰에는 회원 id(sub)와 로그인 세션 id(sid)만 넣는다. 권한·상태·구독·세션은 요청마다 DB에서 읽어서, 바뀌면 바로 반영된다
 */
@Component
public class JwtProvider {
    private final JwtEncoder jwtEncoder;
    private final JwtDecoder jwtDecoder;
    private final Duration accessTokenTtl;

    public JwtProvider(JwtEncoder jwtEncoder, JwtDecoder jwtDecoder, @Value("${jwt.access-token-ttl}") Duration accessTokenTtl) {
        this.jwtEncoder = jwtEncoder;
        this.jwtDecoder = jwtDecoder;
        this.accessTokenTtl = accessTokenTtl;
    }

    // 소셜 가입 토큰: 처음 소셜 로그인한 사람이 이름을 입력하는 동안 제공자 정보를 들고 있는다
    private static final String PURPOSE_CLAIM = "purpose";
    private static final String SIGNUP_PURPOSE = "oauth-signup";
    private static final Duration SIGNUP_TOKEN_TTL = Duration.ofMinutes(10);
    private static final String RESTORE_PURPOSE = "withdrawal-restore";

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

    /**
     * 소셜 가입 토큰. 서명돼 있어서 프론트가 내용을 바꿀 수 없다.
     * 회원 id(sub)가 없어서 access 토큰으로 쓰면 401이고, access 토큰에는 purpose가 없어서 가입 토큰으로 쓸 수 없다
     */
    public String createSignupToken(OAuthProfile profile) {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .claim(PURPOSE_CLAIM, SIGNUP_PURPOSE)
                .claim("provider", profile.provider().name())
                .claim("providerCode", profile.providerCode())
                .claim("email", profile.email())
                .claim("nickname", profile.nickname() == null ? "" : profile.nickname())
                .issuedAt(now)
                .expiresAt(now.plus(SIGNUP_TOKEN_TTL))
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

    /** 소셜 가입 토큰을 읽는다. 서명이 틀렸거나 만료됐거나 가입 토큰이 아니면 빈 값. 확인된 이메일로만 만들어서 emailVerified는 true다 */
    public Optional<OAuthProfile> readSignupToken(String token) {
        try {
            Jwt jwt = jwtDecoder.decode(token);
            if (!SIGNUP_PURPOSE.equals(jwt.getClaimAsString(PURPOSE_CLAIM))) return Optional.empty();
            return Optional.of(new OAuthProfile(
                    Provider.valueOf(jwt.getClaimAsString("provider")),
                    jwt.getClaimAsString("providerCode"),
                    jwt.getClaimAsString("email"),
                    true,
                    jwt.getClaimAsString("nickname")));
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    /**
     * 탈퇴 되돌리기 토큰(#84). 탈퇴 유예 회원이 로그인에 성공하면 준다. 회원 id를 sub가 아닌 uid에 넣어 access 토큰으로 쓸 수 없다.
     * 탈퇴 신청 일시(wat)를 넣어 그 탈퇴에만 쓴다. 되돌린 뒤 다시 탈퇴하면 일시가 달라져 예전 토큰은 못 쓴다
     */
    public String createRestoreToken(Long userId, LocalDateTime withdrawnAt) {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .claim(PURPOSE_CLAIM, RESTORE_PURPOSE)
                .claim("uid", userId.toString())
                .claim("wat", withdrawnAt.toString())
                .issuedAt(now)
                .expiresAt(now.plus(SIGNUP_TOKEN_TTL))
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

    public record RestoreToken(Long userId, String withdrawnAt) {}

    /** 되돌리기 토큰의 회원 id와 탈퇴 신청 일시. 서명이 틀렸거나 만료됐거나 되돌리기 토큰이 아니면 빈 값 */
    public Optional<RestoreToken> readRestoreToken(String token) {
        try {
            Jwt jwt = jwtDecoder.decode(token);
            if (!RESTORE_PURPOSE.equals(jwt.getClaimAsString(PURPOSE_CLAIM))) return Optional.empty();
            return Optional.of(new RestoreToken(Long.valueOf(jwt.getClaimAsString("uid")), jwt.getClaimAsString("wat")));
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    public Duration getAccessTokenTtl() {
        return accessTokenTtl;
    }
}
