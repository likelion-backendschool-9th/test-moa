package com.testmoa.backend.entity;

import com.testmoa.backend.entity.enums.PaymentProvider;
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
    // 결제 방식
    public enum Method {
        CASH,   // 현금
        CREDIT  // 크레딧
    }

    // 결제 상태
    public enum Status {
        COMPLETED,      // 완료
        REFUNDING,      // 환불 진행 중(PG 취소 호출 중)
        REFUNDED,       // 환불
        REFUND_FAILED   // 환불 실패(PG가 취소를 거절해 되돌림). 다시 환불할 수 있다
    }

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
    private Method method;

    // 현금 결제를 맡은 결제 대행사. 크레딧 결제와 PG 연동 전의 현금 결제는 null이다(기존 행이 있어 null을 허용한다)
    @Enumerated(EnumType.STRING)
    private PaymentProvider provider;

    // 결제 대행사의 거래 식별자(카카오페이 tid, 토스 paymentKey). 크레딧 결제는 null이다
    @Column(length = 200)
    private String pgTransactionId;

    // 결제 금액
    @Column(nullable = false)
    private Integer amount;

    // 결제 일시
    @Column(nullable = false)
    private LocalDateTime paidAt;

    // 결제 상태(COMPLETED, REFUNDING, REFUNDED, REFUND_FAILED)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    // 환불한 운영자의 회원 id. 환불하지 않았거나 옛 행은 null(#276). 연관 관계는 걸지 않는다
    private Long refundedBy;

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
     * @param provider      현금 결제를 맡은 결제 대행사(크레딧이면 null)
     * @param pgTransactionId 결제 대행사의 거래 식별자(크레딧이면 null)
     * @param amount        결제 금액
     * @param paidAt        결제 일시
     *
     * 상태는 밖에서 받지 않고 항상 COMPLETED로 시작한다. 환불하면 REFUNDED로 바꾼다.
     */
    @Builder
    public Payment(
            Subscription subscription,
            Method method,
            PaymentProvider provider,
            String pgTransactionId,
            Integer amount,
            LocalDateTime paidAt
    ){
        this.subscription = subscription;
        this.method = method;
        this.provider = provider;
        this.pgTransactionId = pgTransactionId;
        this.amount = amount;
        this.paidAt = paidAt;
        this.status = Status.COMPLETED;
    }

    /** 환불할 수 있는 상태인가. 완료됐거나 환불이 거절돼 되돌아온 결제다 */
    public boolean isRefundable() {
        return status == Status.COMPLETED || status == Status.REFUND_FAILED;
    }

    /** PG 현금 결제인가. 크레딧 결제와 PG 연동 전의 현금 결제는 PG 취소를 할 수 없다 */
    public boolean isPgPayment() {
        return method == Method.CASH && provider != null && pgTransactionId != null;
    }

    /** 환불을 시작한다. 이미 환불했거나 진행 중이면 예외 */
    public void startRefund() {
        if (!isRefundable()) {
            throw new IllegalStateException("환불할 수 없는 상태: " + status);
        }
        this.status = Status.REFUNDING;
    }

    /** PG 취소가 끝나 환불을 마친다. 환불한 운영자의 회원 id를 남긴다 */
    public void refund(Long adminId) {
        this.status = Status.REFUNDED;
        this.refundedBy = adminId;
    }

    /** PG가 취소를 거절해 환불을 되돌린다 */
    public void failRefund() {
        this.status = Status.REFUND_FAILED;
    }
}
