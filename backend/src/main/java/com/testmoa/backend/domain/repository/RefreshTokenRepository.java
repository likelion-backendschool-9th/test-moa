package com.testmoa.backend.domain.repository;

import com.testmoa.backend.domain.entity.RefreshToken;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    // 받은 토큰(해시)이 속한 로그인 세션 id. 엔티티를 읽지 않아서 뒤의 잠금 조회가 DB의 최신 값을 읽는다
    @Query("select r.sessionId from refresh_tokens r where r.tokenHash = :tokenHash")
    Optional<String> findSessionIdByTokenHash(String tokenHash);

    // 그 세션의 토큰 행을 모두 잠그고 읽는다(select ... for update). 같은 세션의 갱신·로그아웃은 한 번에 하나씩 처리된다
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    List<RefreshToken> findBySessionIdOrderByIdAsc(String sessionId);

    // 세션 id가 없는 옛 행을 로그아웃할 때 그 토큰만 버린다
    void deleteByTokenHash(String tokenHash);

    // 로그아웃: 그 로그인 세션의 토큰을 모두 버린다
    void deleteBySessionId(String sessionId);

    // access 토큰의 세션이 아직 살아 있는지(로그아웃하지 않았고 만료되지 않은 토큰이 있는지)
    boolean existsBySessionIdAndExpiresAtAfter(String sessionId, LocalDateTime now);
}
