package com.testmoa.backend.domain.entity;

import com.testmoa.backend.global.common.PaymentMethod;
import com.testmoa.backend.global.common.PaymentStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity(name = "payments")
@Getter
@ToString
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Payment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 결제 대상 구독
    @ToString.Exclude
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private Subscription subscription;

    // 결제 방식(CASH, CREDIT)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentMethod method;

    // 결제 금액
    @Column(nullable = false)
    private Integer amount;

    // 결제 일시
    @Column(nullable = false)
    private LocalDateTime paidAt;

    // 결제 상태(COMPLETED, REFUNDED)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentStatus status;

    // 생성 일시. 저장 시 자동 기록
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // 수정 일시. 저장, 수정 시 자동 기록
    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    /**
     * 구독 결제 시 새로운 Payment 엔티티 생성하기 위해 사용하는 빌더 생성자.
     *
     * @param subscription  결제 대상 구독
     * @param method        결제 방식
     * @param amount        결제 금액
     * @param paidAt        결제 일시
     * @param status        결제 상태
     */
    @Builder
    public Payment(
            Subscription subscription,
            PaymentMethod method,
            Integer amount,
            LocalDateTime paidAt,
            PaymentStatus status
    ){
        this.subscription = subscription;
        this.method = method;
        this.amount = amount;
        this.paidAt = paidAt;
        this.status = status;
    }
}
