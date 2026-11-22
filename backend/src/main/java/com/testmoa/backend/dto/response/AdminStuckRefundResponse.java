package com.testmoa.backend.dto.response;

import com.testmoa.backend.entity.Payment;
import com.testmoa.backend.entity.enums.PaymentProvider;

import java.time.LocalDateTime;

/**
 * 오래 멈춘 환불 중 결제(#281). 이메일은 운영자가 회원을 찾는 용도이고,
 * PG 거래 식별자는 PG 가맹점 화면에서 취소 여부를 확인할 때 쓴다.
 */
public record AdminStuckRefundResponse(
        Long paymentId,
        PaymentProvider provider,
        Integer amount,
        String status,
        String userEmail,
        String pgTransactionId,
        LocalDateTime updatedAt
) {
    public static AdminStuckRefundResponse of(Payment payment) {
        return new AdminStuckRefundResponse(
                payment.getId(), payment.getProvider(), payment.getAmount(), payment.getStatus().name(),
                payment.getSubscription().getUser().getEmail(), payment.getPgTransactionId(), payment.getUpdatedAt());
    }
}
