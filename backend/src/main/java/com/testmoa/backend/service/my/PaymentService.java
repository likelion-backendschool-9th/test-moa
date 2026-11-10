package com.testmoa.backend.service.my;

import com.testmoa.backend.dto.request.PaymentRequest;
import com.testmoa.backend.dto.response.PaymentHistoryResponse;
import com.testmoa.backend.dto.response.PaymentResponse;
import com.testmoa.backend.entity.Plan;
import com.testmoa.backend.entity.enums.PaymentProvider;

import java.util.List;

public interface PaymentService {
    /** 크레딧 구독 결제 실행. 결제 한 건과 이용 기간 한 건이 짝으로 저장된다. 현금은 PG 승인을 거쳐야 해서 400이다 */
    PaymentResponse pay(Long userId, PaymentRequest request);

    /**
     * PG가 승인한 현금 결제를 저장한다. 결제 한 건과 이용 기간 한 건이 짝으로 저장되고 지갑은 바뀌지 않는다.
     * 호출하는 쪽의 트랜잭션에 합류해서, 시도 상태 변경과 함께 커밋·롤백된다.
     */
    PaymentResponse completePgPayment(Long userId, Plan plan, PaymentProvider provider, String pgTransactionId, int amount);

    /** 내 결제 이력(최신순). 운영자는 빈 배열이다 */
    List<PaymentHistoryResponse> getPayments(Long userId);
}
