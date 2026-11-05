package com.testmoa.backend.domain.repository;

import com.testmoa.backend.domain.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    // refresh 토큰은 해시로만 저장하므로 받은 토큰을 해시해서 찾는다
    Optional<RefreshToken> findByTokenHash(String tokenHash);

    // 로그아웃할 때 그 토큰만 버린다
    void deleteByTokenHash(String tokenHash);
}
