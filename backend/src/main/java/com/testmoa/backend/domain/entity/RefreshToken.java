package com.testmoa.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * 발급한 refresh 토큰. 원문은 저장하지 않고 SHA-256 해시만 저장해서, DB가 새도 토큰으로 쓸 수 없다.
 * 로그아웃하면 이 행을 지우고, 갱신할 때마다 지우고 새로 만든다(rotation)
 */
@Entity(name = "refresh_tokens")
@Getter
@ToString
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RefreshToken {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 토큰 주인
    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private User user;

    // 토큰 원문의 SHA-256 해시(16진수 64자)
    @Column(nullable = false, unique = true, length = 64)
    private String tokenHash;

    // 만료 일시
    @Column(nullable = false)
    private LocalDateTime expiresAt;

    // 생성 일시. 저장 시 자동 기록
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /**
     * 로그인·토큰 갱신 시 새로운 RefreshToken 엔티티 생성하기 위해 사용하는 빌더 생성자.
     *
     * @param user      토큰 주인
     * @param tokenHash 토큰 원문의 SHA-256 해시
     * @param expiresAt 만료 일시
     */
    @Builder
    public RefreshToken(User user, String tokenHash, LocalDateTime expiresAt) {
        this.user = user;
        this.tokenHash = tokenHash;
        this.expiresAt = expiresAt;
    }

    public boolean isExpired(LocalDateTime now) {
        return !expiresAt.isAfter(now);
    }
}
