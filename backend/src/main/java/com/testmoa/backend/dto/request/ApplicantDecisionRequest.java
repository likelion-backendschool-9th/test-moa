package com.testmoa.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.util.List;

/**
 * 지원자 여러 명을 한 번에 확정하거나 거절한다
 */
public record ApplicantDecisionRequest(
        @NotEmpty(message = "지원자를 골라 주세요")
        List<@NotNull(message = "지원자를 골라 주세요") Long> registerIds,

        @NotBlank(message = "확정이나 거절을 골라 주세요")
        @Pattern(regexp = "^$|^(confirmed|rejected)$", message = "확정이나 거절을 골라 주세요")
        String status
) {}
