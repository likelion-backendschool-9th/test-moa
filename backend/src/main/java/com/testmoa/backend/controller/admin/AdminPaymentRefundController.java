package com.testmoa.backend.controller.admin;

import com.testmoa.backend.dto.response.AdminPaymentRefundResponse;
import com.testmoa.backend.global.util.ApiResponse;
import com.testmoa.backend.service.admin.AdminPaymentRefundService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 운영자 결제 환불(#275). /api/v1/admin/** 은 SecurityConfig가 ADMIN만 허용한다.
 */
@RestController
@RequestMapping("/api/v1/admin/payments")
public class AdminPaymentRefundController {

    private final AdminPaymentRefundService refundService;

    public AdminPaymentRefundController(AdminPaymentRefundService refundService) {
        this.refundService = refundService;
    }

    @Operation(summary = "결제 환불",
            description = "카카오페이·토스페이로 결제한 건을 전액 환불하고 그 결제로 생긴 구독을 해제한다. 이미 환불했거나 진행 중이면 409")
    @PostMapping("/{paymentId}/refund")
    public ApiResponse<AdminPaymentRefundResponse> refund(
            @Parameter(hidden = true) @AuthenticationPrincipal Long adminId,
            @PathVariable Long paymentId
    ) {
        return ApiResponse.ok(refundService.refund(adminId, paymentId));
    }
}
