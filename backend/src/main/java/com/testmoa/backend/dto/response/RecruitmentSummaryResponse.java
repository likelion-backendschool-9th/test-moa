package com.testmoa.backend.dto.response;

import com.testmoa.backend.entity.Recruitment;

import java.time.LocalDateTime;

/**
 * 프로젝트 화면의 모집글 한 줄. status는 프론트 상태 이름(recruiting, testing, closed, cancelled)이다.
 * cancelReason·cancelledAt은 취소한 모집에만 있다(#116). 테스트 전 취소는 사유가 null이다
 *
 * @param subscription  구독 모집 여부
 * @param version       프로젝트 안 모집글 버전
 * @param feedbackCount 제출된 피드백 수
 * @param analyzedAt    마지막 AI 리뷰 분석 완료 일시. 분석한 적이 없으면 null
 */
public record RecruitmentSummaryResponse(
        Long id,
        String title,
        String description,
        String status,
        String selectionMode,
        String softwareType,
        LocalDateTime recruitDeadline,
        LocalDateTime submitDeadline,
        long confirmedCount,
        LocalDateTime createdAt,
        String cancelReason,
        LocalDateTime cancelledAt,
        boolean subscription,
        int version,
        long feedbackCount,
        LocalDateTime analyzedAt
) {
    public static RecruitmentSummaryResponse of(Recruitment recruitment, String status, String selectionMode, String softwareType,
                                                long confirmedCount, long feedbackCount) {
        return new RecruitmentSummaryResponse(recruitment.getId(), recruitment.getTitle(), recruitment.getDescription(), status,
                selectionMode, softwareType, recruitment.getRecruitDeadline(), recruitment.getFeedbackDeadline(), confirmedCount,
                recruitment.getCreatedAt(), recruitment.getCancelReason(), recruitment.getCancelledAt(),
                recruitment.isSubscription(), recruitment.getVersion(), feedbackCount, recruitment.getAnalyzedAt());
    }
}
