package com.testmoa.backend.service.my;

import com.testmoa.backend.dto.request.PgApproveRequest;
import com.testmoa.backend.dto.request.PgReadyRequest;
import com.testmoa.backend.dto.response.PaymentResponse;
import com.testmoa.backend.dto.response.PgReadyResponse;

/** 구독 현금 결제(카카오페이·토스 테스트). 준비 → PG 결제창 → 승인 두 단계로 나눈다 */
public interface PgPaymentService {
    /** 결제 준비. 서버가 금액을 정해 결제 시도를 저장하고 PG 결제창 정보를 돌려준다 */
    PgReadyResponse ready(Long userId, PgReadyRequest request);

    /** 결제 승인. PG 승인을 부르고 성공하면 결제 한 건과 이용 기간 한 건을 저장한다 */
    PaymentResponse approve(Long userId, PgApproveRequest request);
}
