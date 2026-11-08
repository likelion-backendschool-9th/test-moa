package com.testmoa.backend.service;

import com.testmoa.backend.dto.request.FeedbackSubmitRequest;
import com.testmoa.backend.dto.response.ParticipationResponse;

public interface ParticipationService {
    /**
     * 내 참여 상세(#118). 없거나 다른 회원의 참가는 NOT_FOUND
     */
    ParticipationResponse find(Long userId, Long registerId);

    /**
     * 항목별 피드백을 한 번에 제출한다(#118). 모든 행에 같은 제출 시각을 넣는다.
     * 확정이 아니면 PARTICIPATION_NOT_CONFIRMED, 제출 마감이 지났으면 FEEDBACK_DEADLINE_PASSED,
     * 이미 냈으면 FEEDBACK_ALREADY_SUBMITTED, 필수 항목이 비었거나 아무것도 적지 않았으면 INVALID_INPUT
     */
    ParticipationResponse submitFeedback(Long userId, Long registerId, FeedbackSubmitRequest request);
}
