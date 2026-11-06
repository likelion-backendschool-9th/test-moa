package com.testmoa.backend.service;

import com.testmoa.backend.dto.response.FollowupQuestionsResponse;

/**
 * AI 후속 질문 추천
 */
public interface FollowupQuestionService {
    // 내 프로젝트의 리뷰 하나로 테스터에게 보낼 질문을 추천받음. 구독자만, 하루 3번까지
    FollowupQuestionsResponse recommend(Long userId, Long feedbackId);
}
