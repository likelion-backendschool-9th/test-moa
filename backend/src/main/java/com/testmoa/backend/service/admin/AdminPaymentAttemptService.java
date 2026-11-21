package com.testmoa.backend.service.admin;

import com.testmoa.backend.dto.response.AdminPaymentAttemptResponse;

import java.util.List;

/** 운영자가 PG 승인 뒤 끝나지 않은 결제 시도를 조회하는 서비스(#274) */
public interface AdminPaymentAttemptService {
    /** 기준 시간보다 오래 승인 중이거나 취소까지 실패한 시도를 최근 것부터 돌려준다 */
    List<AdminPaymentAttemptResponse> findStuck();
}
