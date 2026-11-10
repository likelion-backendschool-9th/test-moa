package com.testmoa.backend.entity;

import com.testmoa.backend.entity.enums.PaymentProvider;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * 결제 대행사(PG)로 하는 현금 결제 시도 한 번. 결제 준비에서 만들고, 승인이 끝나면 결제·구독이 따로 저장된다.
 * 금액은 준비할 때 서버가 정한 값이다. 승인할 때는 이 값만 쓴다.
 */
@Entity
@Table(name = "payment_attempts")
@Getter
@ToString
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PaymentAttempt {
    /** 이 시간이 지난 PENDING 시도는 승인할 수 없다. 토스는 결제 요청 뒤 10분 안에 승인해야 한다 */
    public static final java.time.Duration VALID_FOR = java.time.Duration.ofMinutes(10);

    public enum Status {
        PENDING,    // 결제 준비를 마치고 결제창 결과를 기다림
        APPROVING,  // 승인 요청을 받아 PG 승인을 부르는 중(또는 PG 승인 뒤 저장이 실패해 멈춤)
        APPROVED,   // 승인하고 결제·구독까지 저장함
        FAILED      // PG가 승인을 거절함
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private User user;

    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private Plan plan;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentProvider provider;

    // 우리가 만든 주문번호. PG에 그대로 넘기고 돌아올 때 이 값으로 시도를 찾는다
    @Column(nullable = false, unique = true, length = 64)
    private String orderId;

    // 서버가 정한 현금 금액
    @Column(nullable = false)
    private Integer amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    // 카카오페이는 준비 때 받은 tid, 토스는 승인 때 쓴 paymentKey
    @Column(length = 200)
    private String pgTransactionId;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @Builder
    public PaymentAttempt(User user, Plan plan, PaymentProvider provider, String orderId, Integer amount, String pgTransactionId) {
        this.user = user;
        this.plan = plan;
        this.provider = provider;
        this.orderId = orderId;
        this.amount = amount;
        this.pgTransactionId = pgTransactionId;
        this.status = Status.PENDING;
    }

    /** 승인할 수 있는 시도인지. 아니면 409를 던진다(이미 처리했거나 만료됨) */
    public void requireApprovable(LocalDateTime now) {
        if (status != Status.PENDING || createdAt.plus(VALID_FOR).isBefore(now)) {
            throw new BusinessException(ErrorCode.PAYMENT_NOT_APPROVABLE);
        }
    }

    /** 승인을 시작한다. 이 상태로 바뀐 시도는 다른 요청이 다시 승인하지 못한다 */
    public void startApproving() {
        this.status = Status.APPROVING;
    }

    /** PG 승인이 끝나고 결제·구독을 저장했다 */
    public void approve(String pgTransactionId) {
        this.status = Status.APPROVED;
        this.pgTransactionId = pgTransactionId;
    }

    /** PG가 승인을 거절했다 */
    public void fail() {
        this.status = Status.FAILED;
    }
}
