package com.testmoa.backend.service;

import com.testmoa.backend.entity.Feedback;
import com.testmoa.backend.entity.Project;
import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.TestItem;
import com.testmoa.backend.repository.FeedbackRepository;
import com.testmoa.backend.global.client.AnalysisClient;
import com.testmoa.backend.global.client.AnalysisClient.Context;
import com.testmoa.backend.global.client.AnalysisClient.FeedbackItem;
import com.testmoa.backend.global.client.AnalysisClient.FollowupRequest;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 후속 질문 요청을 짧은 읽기 트랜잭션 안에서 만듦. 리뷰 조회·소유권 확인·엔티티 → 요청 변환을 여기서 끝내
 * 엔티티와 지연 로딩이 이 밖(분석 서버 호출)으로 나가지 않게 함
 */
@Component
@RequiredArgsConstructor
public class FollowupRequestReader {
    private final FeedbackRepository feedbackRepository;

    /**
     * 다른 회원 프로젝트의 리뷰는 없는 리뷰와 같이 404
     */
    @Transactional(readOnly = true)
    public FollowupRequest read(Long userId, Long feedbackId) {
        Feedback feedback = feedbackRepository.findWithRecruitmentById(feedbackId)
                .filter(found -> found.getRegister().getRecruitment().getProject().getUser().getId().equals(userId))
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        return toRequest(feedback);
    }

    // 분석 서버의 글자 수에 맞춰 자름
    private static FollowupRequest toRequest(Feedback feedback) {
        Recruitment recruitment = feedback.getRegister().getRecruitment();
        Project project = recruitment.getProject();
        TestItem testItem = feedback.getTestItem();

        return new FollowupRequest(
                new Context(
                        AnalysisClient.cut(project.getTitle(), AnalysisClient.TITLE_MAX),
                        AnalysisClient.cut(project.getDescription(), AnalysisClient.DESCRIPTION_MAX),
                        AnalysisClient.cut(recruitment.getTitle(), AnalysisClient.TITLE_MAX),
                        AnalysisClient.cut(recruitment.getDescription(), AnalysisClient.DESCRIPTION_MAX),
                        recruitment.getVersion()),
                new FeedbackItem(
                        feedback.getId(),
                        feedback.getRegister().getUser().getId(),
                        AnalysisClient.cut(feedback.getContent(), AnalysisClient.CONTENT_MAX),
                        testItem == null ? null : AnalysisClient.cut(testItem.getTitle(), AnalysisClient.TITLE_MAX)));
    }
}
