package com.testmoa.backend.service.impl;

import com.testmoa.backend.domain.dto.response.FollowupQuestionsResponse;
import com.testmoa.backend.domain.entity.Feedback;
import com.testmoa.backend.domain.repository.FeedbackRepository;
import com.testmoa.backend.global.client.AnalysisClient;
import com.testmoa.backend.global.client.AnalysisClient.FollowupRequest;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.service.FollowupQuestionLimiter;
import com.testmoa.backend.service.FollowupQuestionService;
import com.testmoa.backend.service.SubscriptionChecker;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

// 분석 서버를 기다리는 동안 DB 연결을 잡지 않도록 트랜잭션을 두지 않음. 조회는 repository가 각자 짧게 함
@Service
@RequiredArgsConstructor
public class FollowupQuestionServiceImpl implements FollowupQuestionService {

    private final FeedbackRepository feedbackRepository;
    private final SubscriptionChecker subscriptionChecker;
    private final FollowupQuestionLimiter followupQuestionLimiter;
    private final AnalysisClient analysisClient;

    /**
     * 다른 회원 프로젝트의 리뷰는 없는 리뷰와 같이 404. 질문을 받지 못하면 쓴 횟수를 되돌림
     */
    @Override
    public FollowupQuestionsResponse recommend(Long userId, Long feedbackId) {
        subscriptionChecker.require(userId);

        Feedback feedback = feedbackRepository.findWithRecruitmentById(feedbackId)
                .filter(found -> found.getRegister().getRecruitment().getProject().getUser().getId().equals(userId))
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        FollowupRequest request = FollowupRequest.from(feedback);

        LocalDate countedOn = followupQuestionLimiter.acquire(userId);
        try {
            return new FollowupQuestionsResponse(analysisClient.suggestFollowupQuestions(request));
        } catch (RuntimeException e) {
            followupQuestionLimiter.release(userId, countedOn);
            throw e;
        }
    }
}
