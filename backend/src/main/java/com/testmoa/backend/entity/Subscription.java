package com.testmoa.backend.entity;

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
    // 구독 상태
    public enum Status {
        ACTIVE,     // 구독 중(아직 시작 전인 미리 결제 기간도 ACTIVE)
        CANCELLED   // 환불로 취소됨
    }

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

    // 구독 상태. 만들 때 ACTIVE, 환불하면 CANCELLED. 기간이 지난 것은 날짜로 알 수 있어 상태로 바꾸지 않는다
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    // 이 구독을 부여한 운영자의 회원 id. 결제로 생긴 구독과 옛 행은 null(#276). 연관 관계는 걸지 않는다
    private Long grantedBy;

    // 부여 사유(200자 이하). 운영자가 부여한 구독만 있다
    @Column(length = 200)
    private String grantReason;

    // 이 구독을 해제한 운영자의 회원 id. 환불로 취소됐거나 해제하지 않았으면 null
    private Long revokedBy;

    // 해제 사유(200자 이하)
    @Column(length = 200)
    private String revokeReason;

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
     * @param grantedBy   부여한 운영자의 회원 id. 결제로 만들면 null
     * @param grantReason 부여 사유. 결제로 만들면 null
     *
     * 상태는 밖에서 받지 않고 항상 ACTIVE로 시작한다. 환불하면 CANCELLED로 바꾼다.
     */
    @Builder
    public Subscription(
            User user,
            Plan plan,
            LocalDateTime startAt,
            LocalDateTime endAt,
            Long grantedBy,
            String grantReason
    ){
        this.user = user;
        this.plan = plan;
        this.startAt = startAt;
        this.endAt = endAt;
        this.grantedBy = grantedBy;
        this.grantReason = grantReason;
        this.status = Status.ACTIVE;
    }

    /**
     * 이 이용 기간을 취소한다. 행은 지우지 않고 상태만 CANCELLED로 바꾼다.
     * 환불(결제 취소)과 운영자가 시연용으로 구독을 빼는 경우(#204)가 같이 쓴다.
     */
    public void cancel() {
        this.status = Status.CANCELLED;
    }

    /**
     * 운영자가 이 이용 기간을 해제한다(#276). 취소와 같고 해제한 운영자와 사유를 남긴다.
     *
     * @param adminId 해제한 운영자의 회원 id
     * @param reason  해제 사유
     */
    public void revoke(Long adminId, String reason) {
        this.status = Status.CANCELLED;
        this.revokedBy = adminId;
        this.revokeReason = reason;
    }
}
