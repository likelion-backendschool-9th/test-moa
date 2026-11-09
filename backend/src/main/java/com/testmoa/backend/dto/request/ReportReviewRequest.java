package com.testmoa.backend.dto.request;

import com.testmoa.backend.entity.enums.ReportStatus;
import jakarta.validation.constraints.NotNull;

/**
 * 운영자 신고 판정(#85). 기각(REJECTED) 또는 인정(ACCEPTED)
 */
public record ReportReviewRequest(
        @NotNull(message = "처리 결과를 골라 주세요")
        ReportStatus result
) {}
