package com.testmoa.backend.global.security;

import com.testmoa.backend.domain.entity.User;
import com.testmoa.backend.domain.repository.UserRepository;
import com.testmoa.backend.global.common.UserStatus;
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
 * 요청마다 회원을 한 번 읽어서, 정지·탈퇴했거나 없는 회원이면 401로 막고 권한(ROLE_USER, ROLE_ADMIN)을 붙인다.
 *
 * 컨트롤러에서는 회원 id를 이렇게 받는다: @AuthenticationPrincipal Long userId
 */
@Component
@RequiredArgsConstructor
public class UserAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {
    private final UserRepository userRepository;

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        Long userId = parseUserId(jwt.getSubject());
        User user = userRepository.findById(userId)
                .filter(found -> found.getStatus() == UserStatus.ACTIVE)
                .orElseThrow(() -> new InvalidBearerTokenException("사용할 수 없는 계정"));

        return new UsernamePasswordAuthenticationToken(
                userId, jwt, List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())));
    }

    private Long parseUserId(String subject) {
        try {
            return Long.valueOf(subject);
        } catch (NumberFormatException e) {
            throw new InvalidBearerTokenException("회원 id가 없는 토큰");
        }
    }
}
