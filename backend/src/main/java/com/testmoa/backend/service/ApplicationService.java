package com.testmoa.backend.service;

import com.testmoa.backend.dto.request.ApplicantDecisionRequest;
import com.testmoa.backend.dto.response.ApplicantResponse;
import com.testmoa.backend.dto.response.ApplicationResponse;

import java.util.List;

public interface ApplicationService {
    /**
     * 테스터가 모집에 지원한다(#114). 선착순은 바로 확정하고 기본 보상을 고정한다.
     * 없거나 취소된 모집 NOT_FOUND, 마감 RECRUITMENT_CLOSED, 자기 모집 OWN_RECRUITMENT, 이미 지원 ALREADY_APPLIED
     */
    ApplicationResponse apply(Long userId, Long recruitmentId);

    /**
     * 개발자가 내 모집의 지원 목록을 본다. 다른 회원의 모집은 NOT_FOUND
     */
    List<ApplicantResponse> findApplicants(Long userId, Long recruitmentId);

    /**
     * 개발자가 지원자를 확정하거나 거절한다. 확정하면 보상을 고정한다.
     * 선발형 구독 모집의 모집 기간이 아니면 APPLICANTS_NOT_SELECTABLE, 지원 상태가 아니거나 이 모집의 지원이 아니면 INVALID_INPUT
     */
    void decide(Long userId, Long recruitmentId, ApplicantDecisionRequest request);
}
