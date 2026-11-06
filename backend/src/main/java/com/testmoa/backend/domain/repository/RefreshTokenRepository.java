package com.testmoa.backend.domain.repository;

import com.testmoa.backend.domain.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    // refresh 토큰은 해시로만 저장하므로 받은 토큰을 해시해서 찾는다
    Optional<RefreshToken> findByTokenHash(String tokenHash);

    // 세션 id가 없는 옛 행을 로그아웃할 때 그 토큰만 버린다
    void deleteByTokenHash(String tokenHash);

    // 로그아웃: 그 로그인 세션의 토큰을 모두 버린다
    void deleteBySessionId(String sessionId);

    // 갱신할 때 같은 세션의 이미 쓴 토큰을 정리한다. 방금 쓴 토큰 하나만 남겨 그 토큰으로도 로그아웃할 수 있게 한다
    void deleteBySessionIdAndUsedAtIsNotNull(String sessionId);

    // access 토큰의 세션이 아직 살아 있는지(로그아웃하지 않았고 만료되지 않은 토큰이 있는지)
    boolean existsBySessionIdAndExpiresAtAfter(String sessionId, LocalDateTime now);
}
