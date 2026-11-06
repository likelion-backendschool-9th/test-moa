package com.testmoa.backend.service.impl;

import com.testmoa.backend.domain.dto.response.FollowupQuestionsResponse;
import com.testmoa.backend.global.client.AnalysisClient;
import com.testmoa.backend.global.client.AnalysisClient.FollowupRequest;
import com.testmoa.backend.service.FollowupQuestionLimiter;
import com.testmoa.backend.service.FollowupQuestionService;
import com.testmoa.backend.service.FollowupRequestReader;
import com.testmoa.backend.service.SubscriptionChecker;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

// 분석 서버를 기다리는 동안 DB 연결을 잡지 않도록 이 서비스에는 트랜잭션을 두지 않음. 조회와 요청 만들기는 FollowupRequestReader의 짧은 읽기 트랜잭션에서 끝냄
@Service
@RequiredArgsConstructor
public class FollowupQuestionServiceImpl implements FollowupQuestionService {

    private final FollowupRequestReader followupRequestReader;
    private final SubscriptionChecker subscriptionChecker;
    private final FollowupQuestionLimiter followupQuestionLimiter;
    private final AnalysisClient analysisClient;

    /**
     * 다른 회원 프로젝트의 리뷰는 없는 리뷰와 같이 404. 질문을 받지 못하면 쓴 횟수를 되돌림
     */
    @Override
    public FollowupQuestionsResponse recommend(Long userId, Long feedbackId) {
        subscriptionChecker.require(userId);

        FollowupRequest request = followupRequestReader.read(userId, feedbackId);

        LocalDate countedOn = followupQuestionLimiter.acquire(userId);
        try {
            return new FollowupQuestionsResponse(analysisClient.suggestFollowupQuestions(request));
        } catch (RuntimeException e) {
            followupQuestionLimiter.release(userId, countedOn);
            throw e;
        }
    }
}
