package com.testmoa.backend.controller.admin;

import com.testmoa.backend.dto.request.AdminSubscriptionGrantRequest;
import com.testmoa.backend.dto.response.AdminSubscriptionResponse;
import com.testmoa.backend.global.util.ApiResponse;
import com.testmoa.backend.service.admin.AdminSubscriptionService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * 운영자 구독 부여·해제(#204). 시연·확인용이라 결제와 크레딧은 건드리지 않는다.
 * /api/v1/admin/** 은 SecurityConfig가 ADMIN만 허용한다.
 */
@RestController
@RequestMapping("/api/v1/admin/subscriptions")
public class AdminSubscriptionController {

    private final AdminSubscriptionService subscriptionService;

    public AdminSubscriptionController(AdminSubscriptionService subscriptionService) {
        this.subscriptionService = subscriptionService;
    }

    @Operation(summary = "회원 구독 상태 조회", description = "이메일로 회원의 이름·이메일과 구독 상태를 본다. 없는 이메일은 404")
    @GetMapping
    public ApiResponse<AdminSubscriptionResponse> find(@RequestParam String email) {
        return ApiResponse.ok(subscriptionService.find(email));
    }

    @Operation(summary = "구독 부여", description = "결제 없이 구독 기간을 만든다. 구독 중이면 끝난 시각부터 이어진다. 운영자 계정은 403")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<AdminSubscriptionResponse> grant(@Valid @RequestBody AdminSubscriptionGrantRequest request) {
        return ApiResponse.ok(subscriptionService.grant(request));
    }

    @Operation(summary = "구독 해제", description = "끝나지 않은 구독 기간을 모두 취소한다(CANCELLED). 뺄 구독이 없어도 같은 결과다")
    @DeleteMapping
    public ApiResponse<AdminSubscriptionResponse> revoke(@RequestParam String email) {
        return ApiResponse.ok(subscriptionService.revoke(email));
    }
}
