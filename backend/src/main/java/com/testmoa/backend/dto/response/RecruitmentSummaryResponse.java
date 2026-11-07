package com.testmoa.backend.dto.response;

import com.testmoa.backend.entity.Recruitment;

import java.time.LocalDateTime;

/**
 * 프로젝트 화면의 모집글 한 줄. status는 프론트 상태 이름(recruiting, testing, closed, cancelled)이다.
 * cancelReason·cancelledAt은 취소한 모집에만 있다(#116). 테스트 전 취소는 사유가 null이다
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
        LocalDateTime cancelledAt
) {
    public static RecruitmentSummaryResponse of(Recruitment recruitment, String status, String selectionMode, String softwareType, long confirmedCount) {
        return new RecruitmentSummaryResponse(recruitment.getId(), recruitment.getTitle(), recruitment.getDescription(), status,
                selectionMode, softwareType, recruitment.getRecruitDeadline(), recruitment.getFeedbackDeadline(), confirmedCount,
                recruitment.getCreatedAt(), recruitment.getCancelReason(), recruitment.getCancelledAt());
    }
}
