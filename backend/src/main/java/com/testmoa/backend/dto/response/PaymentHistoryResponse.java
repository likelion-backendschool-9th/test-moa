package com.testmoa.backend.dto.response;

import com.testmoa.backend.entity.Payment;

import java.time.LocalDateTime;

/** 결제 이력 한 건. plan은 산 플랜의 tier다 */
public record PaymentHistoryResponse(
        Long paymentId,
        String plan,
        Payment.Method method,
        int amount,
        Payment.Status status,
        LocalDateTime paidAt,
        PaymentResponse.Period period
) {
    public static PaymentHistoryResponse of(Payment payment) {
        return new PaymentHistoryResponse(
                payment.getId(), payment.getSubscription().getPlan().getTier(), payment.getMethod(),
                payment.getAmount(), payment.getStatus(), payment.getPaidAt(),
                new PaymentResponse.Period(payment.getSubscription().getStartAt(), payment.getSubscription().getEndAt())
        );
    }
}
