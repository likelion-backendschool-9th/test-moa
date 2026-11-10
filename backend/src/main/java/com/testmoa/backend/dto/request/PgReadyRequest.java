package com.testmoa.backend.dto.request;

import com.testmoa.backend.entity.enums.PaymentProvider;
import jakarta.validation.constraints.NotNull;

/** 현금 결제 준비 요청. 플랜이 지금 파는 플랜인지, 결제 대행사를 쓸 수 있는지는 서비스에서 본다 */
public record PgReadyRequest(
        @NotNull(message = "플랜을 골라 주세요")
        Long planId,

        @NotNull(message = "결제 대행사를 골라 주세요")
        PaymentProvider provider
) {}
