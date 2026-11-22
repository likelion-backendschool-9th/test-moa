package com.testmoa.backend.controller.admin;

import com.testmoa.backend.dto.request.AdminRefundResolveRequest;
import com.testmoa.backend.dto.response.AdminPaymentRefundResponse;
import com.testmoa.backend.dto.response.AdminStuckRefundResponse;
import com.testmoa.backend.global.util.ApiResponse;
import com.testmoa.backend.service.admin.AdminPaymentRefundService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

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

    @Operation(summary = "멈춘 환불 조회",
            description = "기준 시간(payment.stuck-minutes)보다 오래 환불 중으로 남은 결제를 최근 것부터 본다. PG는 취소했는데 우리 쪽 저장이 실패한 건이다")
    @GetMapping("/stuck-refunds")
    public ApiResponse<List<AdminStuckRefundResponse>> findStuck() {
        return ApiResponse.ok(refundService.findStuck());
    }

    @Operation(summary = "멈춘 환불 정리",
            description = "PG를 부르지 않고 운영자가 PG에서 확인한 결과를 받는다. canceled=true면 결제를 환불됨으로, 구독을 해제로 바꾸고 false면 환불 실패로 돌려 다시 환불할 수 있게 한다. 오래 멈춘 환불 중이거나 환불 실패인 결제만 된다")
    @PostMapping("/{paymentId}/refund/resolve")
    public ApiResponse<AdminPaymentRefundResponse> resolve(
            @Parameter(hidden = true) @AuthenticationPrincipal Long adminId,
            @PathVariable Long paymentId,
            @Valid @RequestBody AdminRefundResolveRequest request
    ) {
        return ApiResponse.ok(refundService.resolve(adminId, paymentId, request.canceled()));
    }
}
