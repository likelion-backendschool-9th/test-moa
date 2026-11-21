package com.testmoa.backend.controller.admin;

import com.testmoa.backend.dto.response.AdminPaymentAttemptResponse;
import com.testmoa.backend.global.util.ApiResponse;
import com.testmoa.backend.service.admin.AdminPaymentAttemptService;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 운영자 결제 시도 점검(#274). /api/v1/admin/** 은 SecurityConfig가 ADMIN만 허용한다.
 */
@RestController
@RequestMapping("/api/v1/admin/payment-attempts")
public class AdminPaymentAttemptController {

    private final AdminPaymentAttemptService paymentAttemptService;

    public AdminPaymentAttemptController(AdminPaymentAttemptService paymentAttemptService) {
        this.paymentAttemptService = paymentAttemptService;
    }

    @Operation(summary = "멈춘 결제 시도 조회",
            description = "PG가 승인했는데 끝나지 않은 시도. 기준 시간(payment.stuck-minutes)보다 오래 승인 중이거나 취소까지 실패한 건을 최근 것부터 본다")
    @GetMapping("/stuck")
    public ApiResponse<List<AdminPaymentAttemptResponse>> findStuck() {
        return ApiResponse.ok(paymentAttemptService.findStuck());
    }
}
