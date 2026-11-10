package com.testmoa.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 현금 결제 승인 요청. 결제창에서 돌아온 값을 그대로 받는다.
 * 카카오페이는 pgToken, 토스는 paymentKey와 amount가 있어야 하고, 어느 쪽인지는 시도의 결제 대행사로 정한다
 */
public record PgApproveRequest(
        @NotBlank(message = "주문번호가 필요해요")
        @Size(max = 64, message = "주문번호가 너무 길어요")
        String orderId,

        @Size(max = 200, message = "승인 토큰이 너무 길어요")
        String pgToken,

        @Size(max = 200, message = "paymentKey가 너무 길어요")
        String paymentKey,

        Integer amount
) {}
