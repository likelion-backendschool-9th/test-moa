package com.testmoa.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 피드백 신고
 */
public record FeedbackReportRequest(
        @NotBlank(message = "신고 사유를 적어 주세요")
        @Size(max = 500, message = "신고 사유는 500자까지 적을 수 있어요")
        String reason
) {}
