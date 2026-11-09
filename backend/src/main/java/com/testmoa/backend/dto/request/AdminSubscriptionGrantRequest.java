package com.testmoa.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** 운영자가 결제 없이 구독을 줄 때의 요청. 플랜이 지금 파는 플랜인지는 서비스에서 본다 */
public record AdminSubscriptionGrantRequest(
        @NotBlank(message = "이메일을 입력해 주세요")
        String email,
        @NotNull(message = "플랜을 골라 주세요")
        Long planId
) {}
