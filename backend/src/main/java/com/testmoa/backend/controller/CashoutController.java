package com.testmoa.backend.controller;

import com.testmoa.backend.dto.request.CashoutCreateRequest;
import com.testmoa.backend.dto.response.CashoutResponse;
import com.testmoa.backend.global.util.ApiResponse;
import com.testmoa.backend.service.CashoutService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 내 출금 신청·내역. 회원 id는 토큰에서 꺼낸다.
 * 운영자용 {@code admin.CashoutController}와 클래스 이름이 같아서, 운영자 쪽이 빈 이름을 따로 가진다.
 */
@RestController
@RequestMapping("/api/v1/my/credits/withdrawals")
public class CashoutController {

    private final CashoutService cashoutService;

    public CashoutController(CashoutService cashoutService) {
        this.cashoutService = cashoutService;
    }

    @Operation(summary = "출금 내역 조회")
    @GetMapping
    public ApiResponse<List<CashoutResponse>> getCashouts(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId
    ) {
        return ApiResponse.ok(cashoutService.getCashouts(userId));
    }

    @Operation(summary = "출금 신청")
    @PostMapping
    public ApiResponse<CashoutResponse> requestCashout(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
            @Valid @RequestBody CashoutCreateRequest request
    ) {
        return ApiResponse.ok(cashoutService.requestCashout(userId, request));
    }
}
