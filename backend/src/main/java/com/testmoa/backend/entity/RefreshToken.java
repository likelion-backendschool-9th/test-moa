package com.testmoa.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * 발급한 refresh 토큰. 원문은 저장하지 않고 SHA-256 해시만 저장해서, DB가 새도 토큰으로 쓸 수 없다.
 * 한 번의 로그인이 하나의 세션(sessionId)이고, 갱신할 때마다 같은 세션의 새 토큰을 만든다(rotation).
 * 쓴 토큰은 바로 지우지 않고 usedAt을 남겨, 그 토큰으로 로그아웃해도 세션을 찾아 통째로 끝낼 수 있게 한다
 */
@Entity(name = "refresh_tokens")
@Table(indexes = @Index(columnList = "session_id"))
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

    // 로그인 세션 id(UUID). 같은 로그인에서 갱신으로 이어진 토큰은 같은 값이다. access 토큰의 sid와 같다
    // 이 컬럼 전의 행은 비어 있을 수 있어 DB에서는 null을 허용한다(새 행은 늘 채운다)
    @Column(length = 36)
    private String sessionId;

    // 갱신에 쓴 일시. 쓰지 않았으면 null. 쓴 토큰으로는 다시 갱신할 수 없다
    private LocalDateTime usedAt;

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
     * @param sessionId 로그인 세션 id
     * @param tokenHash 토큰 원문의 SHA-256 해시
     * @param expiresAt 만료 일시
     */
    @Builder
    public RefreshToken(User user, String sessionId, String tokenHash, LocalDateTime expiresAt) {
        this.user = user;
        this.sessionId = sessionId;
        this.tokenHash = tokenHash;
        this.expiresAt = expiresAt;
    }

    public boolean isExpired(LocalDateTime now) {
        return !expiresAt.isAfter(now);
    }

    public boolean isUsed() {
        return usedAt != null;
    }

    public void markUsed(LocalDateTime now) {
        this.usedAt = now;
    }
}
