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

    // 이 기간을 산 당시의 플랜 행. 가격·한도는 이 행 기준이라 플랜 조건이 바뀌어도 옛 조건이 남는다
    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private Plan plan;

    // 이 이용 기간의 시작 일시. max(지금, CANCELLED가 아닌 행 중 가장 늦은 endAt)부터 이어진다
    @Column(nullable = false)
    private LocalDateTime startAt;

    // 이 이용 기간의 만료 일시(startAt + periodDays). 만들 때 정하고 고치지 않는다
    @Column(nullable = false)
    private LocalDateTime endAt;

    // 구독 상태. 만들 때 ACTIVE, 환불하면 CANCELLED. 기간이 지난 것은 날짜로 알 수 있어 EXPIRED로 바꾸지 않는다
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
     * @param plan      이 기간을 산 당시의 플랜 행
     * @param startAt   이 이용 기간의 시작 일시. max(지금, CANCELLED가 아닌 행 중 가장 늦은 endAt)
     * @param endAt     이 이용 기간의 만료 일시(startAt + periodDays). 만들 때 정하고 고치지 않는다
     *
     * 상태는 밖에서 받지 않고 항상 ACTIVE로 시작한다. 환불하면 CANCELLED로 바꾼다.
     */
    @Builder
    public Subscription(
            User user,
            Plan plan,
            LocalDateTime startAt,
            LocalDateTime endAt
    ){
        this.user = user;
        this.plan = plan;
        this.startAt = startAt;
        this.endAt = endAt;
        this.status = SubscriptionStatus.ACTIVE;
    }
}
