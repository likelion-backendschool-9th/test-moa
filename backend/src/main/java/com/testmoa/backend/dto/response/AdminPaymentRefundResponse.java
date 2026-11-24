package com.testmoa.backend.dto.response;

import com.testmoa.backend.entity.Payment;

import java.time.LocalDateTime;

/** 운영자 결제 환불 결과(#275). 환불되지 않은 채 끝난 정리(#281)는 refundedAt이 null이다. 시각은 전역 직렬화 설정이 오프셋을 붙여 준다 */
public record AdminPaymentRefundResponse(Long paymentId, Payment.Status status, LocalDateTime refundedAt) {
}
