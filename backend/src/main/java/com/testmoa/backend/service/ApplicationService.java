package com.testmoa.backend.service;

import com.testmoa.backend.dto.response.ApplicationResponse;

public interface ApplicationService {
    /**
     * 테스터가 모집에 지원한다(#114). 선착순은 바로 확정하고 기본 보상을 고정한다.
     * 없거나 취소된 모집 NOT_FOUND, 마감 RECRUITMENT_CLOSED, 자기 모집 OWN_RECRUITMENT, 이미 지원 ALREADY_APPLIED
     */
    ApplicationResponse apply(Long userId, Long recruitmentId);
}
