package com.testmoa.backend.service;

import com.testmoa.backend.dto.response.RecruitmentCancelResponse;

public interface RecruitmentCancelService {
    /**
     * 개발자가 자기 모집을 취소한다(#116). 없거나 다른 회원의 모집은 NOT_FOUND,
     * 지금 취소할 수 없는 모집은 RECRUITMENT_NOT_CANCELLABLE, 테스트 중인데 사유가 없으면 INVALID_INPUT
     *
     * @param reason 취소 사유. 테스트 중일 때만 필수이고 모집 중이면 저장하지 않는다
     */
    RecruitmentCancelResponse cancel(Long userId, Long recruitmentId, String reason);
}
