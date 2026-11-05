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

    // 이 결제로 산 이용 기간. 결제 1건 = 구독 1건이라 구독 1 : 결제 1
    @ToString.Exclude
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false, unique = true)
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
     * @param subscription  이 결제로 산 이용 기간(구독)
     * @param method        결제 방식
     * @param amount        결제 금액
     * @param paidAt        결제 일시
     *
     * 상태는 밖에서 받지 않고 항상 COMPLETED로 시작한다. 환불하면 REFUNDED로 바꾼다.
     */
    @Builder
    public Payment(
            Subscription subscription,
            PaymentMethod method,
            Integer amount,
            LocalDateTime paidAt
    ){
        this.subscription = subscription;
        this.method = method;
        this.amount = amount;
        this.paidAt = paidAt;
        this.status = PaymentStatus.COMPLETED;
    }
}
