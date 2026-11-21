package com.testmoa.backend.service.admin;

import com.testmoa.backend.dto.response.AdminPaymentRefundResponse;

public interface AdminPaymentRefundService {

    /** PG 현금 결제 한 건을 전액 환불하고 그 구독을 해제한다 */
    AdminPaymentRefundResponse refund(Long paymentId);
}
