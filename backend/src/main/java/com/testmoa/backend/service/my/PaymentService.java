package com.testmoa.backend.service.my;

import com.testmoa.backend.dto.request.PaymentRequest;
import com.testmoa.backend.dto.response.PaymentHistoryResponse;
import com.testmoa.backend.dto.response.PaymentResponse;

import java.util.List;

public interface PaymentService {
    /** 구독 결제 실행. 결제 한 건과 이용 기간 한 건이 짝으로 저장된다 */
    PaymentResponse pay(Long userId, PaymentRequest request);

    /** 내 결제 이력(최신순). 운영자는 빈 배열이다 */
    List<PaymentHistoryResponse> getPayments(Long userId);
}
