package com.testmoa.backend.service.admin;

import com.testmoa.backend.dto.response.AdminPaymentRefundResponse;
import com.testmoa.backend.dto.response.AdminStuckRefundResponse;

import java.util.List;

public interface AdminPaymentRefundService {

    /** PG 현금 결제 한 건을 전액 환불하고 그 구독을 해제한다 */
    AdminPaymentRefundResponse refund(Long adminId, Long paymentId);

    /** 기준 시간(payment.stuck-minutes)보다 오래 환불 중으로 남은 결제(#281) */
    List<AdminStuckRefundResponse> findStuck();

    /**
     * 멈춘 환불을 정리한다(#281). PG는 부르지 않고 운영자가 확인한 결과를 받는다.
     * canceled=true면 ③만 실행하고, false면 환불 중이던 결제를 REFUND_FAILED로 돌려 다시 환불할 수 있게 한다.
     */
    AdminPaymentRefundResponse resolve(Long adminId, Long paymentId, boolean canceled);
}
