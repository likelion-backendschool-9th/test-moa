package com.testmoa.backend.domain.entity;

import com.testmoa.backend.global.common.SubscriptionStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity(name = "subscriptions")
@Getter
@ToString
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Subscription {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 구독자
    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private User user;

    // 구독 플랜
    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private Plan plan;

    // 구독 시작 일시
    @Column(nullable = false)
    private LocalDateTime startAt;

    // 구독 만료 일시
    @Column(nullable = false)
    private LocalDateTime endAt;

    // 구독 상태(ACTIVE, EXPIRED, CANCELLED)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SubscriptionStatus status;

    // 생성 일시. 저장 시 자동 기록
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // 수정 일시. 저장, 수정 시 자동 기록
    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    /**
     * 플랜 구독 시 새로운 Subscription 엔티티 생성하기 위해 사용하는 빌더 생성자.
     *
     * @param user      구독자
     * @param plan      구독 플랜
     * @param startAt   구독 시작 일시
     * @param endAt     구독 만료 일시
     * @param status    구독 상태
     */
    @Builder
    public Subscription(
            User user,
            Plan plan,
            LocalDateTime startAt,
            LocalDateTime endAt,
            SubscriptionStatus status
    ){
        this.user = user;
        this.plan = plan;
        this.startAt = startAt;
        this.endAt = endAt;
        this.status = status;
    }
}
