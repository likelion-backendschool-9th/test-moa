package com.testmoa.backend.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.testmoa.backend.entity.enums.PaymentProvider;

/**
 * 현금 결제 준비 결과. 카카오페이는 결제창 주소 둘, 토스는 브라우저가 결제창을 여는 값을 채우고 쓰지 않는 값은 내려가지 않는다.
 * 시크릿 키는 어디에도 없다
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record PgReadyResponse(
        String orderId,
        PaymentProvider provider,
        int amount,
        String orderName,
        String redirectUrl,
        String mobileRedirectUrl,
        String clientKey,
        String customerKey,
        String successUrl,
        String failUrl
) {}
