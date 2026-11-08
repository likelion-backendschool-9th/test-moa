package com.testmoa.backend.dto.response;

import java.time.LocalDateTime;

/**
 * 테스터 관리 탭의 지원 한 줄. 테스터는 닉네임만 보여 준다
 *
 * @param status            applied, confirmed, rejected, cancelled
 * @param feedbackSubmitted 피드백을 하나라도 냈는지. 제출 현황(제출함·미제출·미완료)은 마감일과 함께 프론트가 정한다
 */
public record ApplicantResponse(
        Long registerId,
        String nickname,
        String status,
        LocalDateTime appliedAt,
        boolean feedbackSubmitted
) {}
