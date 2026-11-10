package com.testmoa.backend.dto.response;

import com.testmoa.backend.entity.Payment;
import com.testmoa.backend.entity.enums.PaymentProvider;

import java.time.LocalDateTime;

/** 결제 이력 한 건. plan은 산 플랜의 tier이고, provider는 현금 결제를 맡은 결제 대행사다(크레딧·예전 현금 결제는 null) */
public record PaymentHistoryResponse(
        Long paymentId,
        String plan,
        Payment.Method method,
        PaymentProvider provider,
        int amount,
        Payment.Status status,
        LocalDateTime paidAt,
        PaymentResponse.Period period
) {
    public static PaymentHistoryResponse of(Payment payment) {
        return new PaymentHistoryResponse(
                payment.getId(), payment.getSubscription().getPlan().getTier(), payment.getMethod(), payment.getProvider(),
                payment.getAmount(), payment.getStatus(), payment.getPaidAt(),
                new PaymentResponse.Period(payment.getSubscription().getStartAt(), payment.getSubscription().getEndAt())
        );
    }
}
