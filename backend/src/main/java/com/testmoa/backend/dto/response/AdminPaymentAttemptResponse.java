package com.testmoa.backend.dto.response;

import com.testmoa.backend.entity.PaymentAttempt;
import com.testmoa.backend.entity.enums.PaymentProvider;

import java.time.LocalDateTime;

/**
 * 운영자가 점검할 결제 시도(#274). PG가 승인했는데 우리 쪽이 끝내지 못한 건이다.
 * 이메일은 운영자가 회원을 찾는 용도이고, PG 거래 식별자는 직접 취소할 때 쓴다.
 */
public record AdminPaymentAttemptResponse(
        Long attemptId,
        String orderId,
        PaymentProvider provider,
        Integer amount,
        String status,
        String userEmail,
        String pgTransactionId,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static AdminPaymentAttemptResponse of(PaymentAttempt attempt) {
        return new AdminPaymentAttemptResponse(
                attempt.getId(), attempt.getOrderId(), attempt.getProvider(), attempt.getAmount(),
                attempt.getStatus().name(), attempt.getUser().getEmail(), attempt.getPgTransactionId(),
                attempt.getCreatedAt(), attempt.getUpdatedAt());
    }
}
