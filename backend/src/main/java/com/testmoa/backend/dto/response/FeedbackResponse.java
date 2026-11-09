package com.testmoa.backend.dto.response;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 피드백 탭의 피드백 한 건. 테스터는 닉네임만 보여 준다
 *
 * @param registerId 피드백을 작성한 참가 id
 * @param testItemId 대상 테스트 항목. 기타 의견은 null
 * @param status     submitted(72시간 신고 대기), reported, rewarded, excluded
 */
public record FeedbackResponse(
        Long feedbackId,
        Long registerId,
        String nickname,
        Long testItemId,
        String content,
        List<String> imageUrls,
        LocalDateTime submittedAt,
        String status,
        boolean recommended
) {}
