package com.testmoa.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 제재 해제(#86). 사유는 필수다(허위 신고 등)
 */
public record SanctionReleaseRequest(
        @NotBlank(message = "해제 사유를 적어 주세요")
        @Size(max = 1000, message = "해제 사유는 1,000자까지 적을 수 있어요")
        String reason
) {}
