package com.testmoa.backend.controller;

import com.testmoa.backend.dto.response.CheckoutResponse;
import com.testmoa.backend.dto.response.PayableCreditsResponse;
import com.testmoa.backend.dto.response.SubscriptionResponse;
import com.testmoa.backend.global.util.ApiResponse;
import com.testmoa.backend.service.SubscriptionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 내 구독 상태와 결제 가능 크레딧. 회원 id는 토큰에서 꺼낸다.
 */
@RestController
@RequestMapping("/api/v1/my")
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    public SubscriptionController(SubscriptionService subscriptionService) {
        this.subscriptionService = subscriptionService;
    }

    @Operation(summary = "내 구독 상태", description = "구독 화면과 마이페이지 대시보드가 같은 값을 쓴다")
    @GetMapping({"/subscription/status", "/profile/subscription"})
    public ApiResponse<SubscriptionResponse> getStatus(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId
    ) {
        return ApiResponse.ok(subscriptionService.getStatus(userId));
    }

    @Operation(summary = "구독 결제에 쓸 수 있는 크레딧", description = "이벤트 + 적립, 출금 처리 중은 제외")
    @GetMapping("/subscription/payable-credits")
    public ApiResponse<PayableCreditsResponse> getPayableCredits(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId
    ) {
        return ApiResponse.ok(subscriptionService.getPayableCredits(userId));
    }

    @Operation(summary = "구독 결제 화면 조회", description = "고른 플랜의 크레딧 결제 가능 여부와 이번 결제의 이용 기간. 조회만 한다")
    @GetMapping("/subscription/checkout")
    public ApiResponse<CheckoutResponse> getCheckout(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
            @RequestParam Long planId
    ) {
        return ApiResponse.ok(subscriptionService.getCheckout(userId, planId));
    }
}
