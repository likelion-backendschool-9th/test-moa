package com.testmoa.backend.dto.request;

import com.testmoa.backend.entity.Payment;
import jakarta.validation.constraints.NotNull;

/** 구독 결제 요청. 플랜이 지금 파는 플랜인지는 서비스에서 본다 */
public record PaymentRequest(
        @NotNull(message = "플랜을 골라 주세요")
        Long planId,

        @NotNull(message = "결제 수단을 골라 주세요")
        Payment.Method method
) {}
