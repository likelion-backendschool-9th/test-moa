package com.testmoa.backend.dto.response;

import java.time.LocalDateTime;

/**
 * AI 분석 그룹에 든 리뷰 한 건. 테스터는 닉네임만 보여 준다
 *
 * @param testItemTitle  대상 테스트 항목 이름. 기타 의견은 null
 * @param representative 그룹을 대표하는 리뷰인지
 */
public record GroupReviewResponse(
        Long feedbackId,
        String nickname,
        String testItemTitle,
        String content,
        LocalDateTime submittedAt,
        boolean representative
) {}
