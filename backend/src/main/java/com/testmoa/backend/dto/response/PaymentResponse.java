package com.testmoa.backend.dto.response;

import com.testmoa.backend.entity.Payment;

import java.time.LocalDateTime;

/** 구독 결제 결과. 시각은 서버 시간대의 값이다 */
public record PaymentResponse(
        Long paymentId,
        Payment.Method method,
        int amount,
        LocalDateTime paidAt,
        Period period,
        int payableCredits
) {
    public record Period(LocalDateTime startAt, LocalDateTime endAt) {
    }

    public static PaymentResponse of(Payment payment, int payableCredits) {
        return new PaymentResponse(
                payment.getId(), payment.getMethod(), payment.getAmount(), payment.getPaidAt(),
                new Period(payment.getSubscription().getStartAt(), payment.getSubscription().getEndAt()),
                payableCredits
        );
    }
}
