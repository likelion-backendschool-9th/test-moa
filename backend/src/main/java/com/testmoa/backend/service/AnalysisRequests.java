package com.testmoa.backend.service;

import com.testmoa.backend.entity.Feedback;
import com.testmoa.backend.entity.Project;
import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.TestItem;
import com.testmoa.backend.global.client.AnalysisClient;
import com.testmoa.backend.global.client.AnalysisClient.Context;
import com.testmoa.backend.global.client.AnalysisClient.FeedbackItem;

/**
 * 분석 서버 요청에 담는 모집글 정보(context)와 리뷰(feedback). 후속 질문(#109)과 리뷰 묶기(#107)가 함께 씀.
 * 분석 서버의 글자 수에 맞춰 자르고, 프로젝트·참가·테스트 항목을 읽으므로 읽기 트랜잭션 안에서 부름
 */
final class AnalysisRequests {
    private AnalysisRequests() {}

    static Context context(Recruitment recruitment) {
        Project project = recruitment.getProject();
        return new Context(
                AnalysisClient.cut(project.getTitle(), AnalysisClient.TITLE_MAX),
                AnalysisClient.cut(project.getDescription(), AnalysisClient.DESCRIPTION_MAX),
                AnalysisClient.cut(recruitment.getTitle(), AnalysisClient.TITLE_MAX),
                AnalysisClient.cut(recruitment.getDescription(), AnalysisClient.DESCRIPTION_MAX),
                recruitment.getVersion());
    }

    // userId는 리뷰를 쓴 테스터(참가한 회원). 기타 의견은 testItemTitle이 null
    static FeedbackItem feedbackItem(Feedback feedback) {
        TestItem testItem = feedback.getTestItem();
        return new FeedbackItem(
                feedback.getId(),
                feedback.getRegister().getUser().getId(),
                AnalysisClient.cut(feedback.getContent(), AnalysisClient.CONTENT_MAX),
                testItem == null ? null : AnalysisClient.cut(testItem.getTitle(), AnalysisClient.TITLE_MAX));
    }
}
