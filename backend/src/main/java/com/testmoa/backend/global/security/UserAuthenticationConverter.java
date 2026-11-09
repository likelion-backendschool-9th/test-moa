package com.testmoa.backend.global.security;

import com.testmoa.backend.dto.AuthenticatedUser;
import com.testmoa.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 서명·만료 검사를 통과한 토큰을 로그인 정보로 바꾼다.
 * 토큰에서 회원 id를 꺼내고, 인증할 수 있는 회원인지는 UserService에 묻는다.
 * 없거나 정지·탈퇴한 회원, 로그아웃한 로그인 세션(sid)이면 401로 막고, 있으면 권한(ROLE_USER, ROLE_ADMIN)을 붙인다.
 *
 * 컨트롤러에서는 회원 id를 이렇게 받는다: @AuthenticationPrincipal Long userId
 */
@Component
@RequiredArgsConstructor
public class UserAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {
    private final UserService userService;

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        Long userId = parseUserId(jwt.getSubject());
        AuthenticatedUser user = userService.findAuthenticatable(userId, jwt.getClaimAsString(JwtProvider.SESSION_CLAIM))
                .orElseThrow(() -> new InvalidBearerTokenException("사용할 수 없는 계정"));

        UsernamePasswordAuthenticationToken token = new UsernamePasswordAuthenticationToken(
                user.userId(), jwt, List.of(new SimpleGrantedAuthority("ROLE_" + user.role().name())));
        // credentials는 인증이 끝나면 Spring Security가 지운다. 로그인 세션 id(sid)가 필요한 곳은 details의 JWT를 읽는다
        token.setDetails(jwt);
        return token;
    }

    private Long parseUserId(String subject) {
        try {
            return Long.valueOf(subject);
        } catch (NumberFormatException e) {
            throw new InvalidBearerTokenException("회원 id가 없는 토큰");
        }
    }
}
