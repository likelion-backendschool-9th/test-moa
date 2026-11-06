package com.testmoa.backend.controller;

import com.testmoa.backend.dto.request.CashoutCreateRequest;
import com.testmoa.backend.dto.response.CashoutResponse;
import com.testmoa.backend.dto.response.CreditBalanceResponse;
import com.testmoa.backend.dto.response.CreditLedgerResponse;
import com.testmoa.backend.global.util.ApiResponse;
import com.testmoa.backend.entity.enums.LedgerFlow;
import com.testmoa.backend.service.CreditService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 내 크레딧 잔액·내역·출금. 회원 id는 토큰에서 꺼낸다.
 */
@RestController
@RequestMapping("/api/v1/my/credits")
public class CreditController {

    private final CreditService creditService;

    public CreditController(CreditService creditService) {
        this.creditService = creditService;
    }

    @Operation(summary = "크레딧 잔액 조회")
    @GetMapping
    public ApiResponse<CreditBalanceResponse> getBalance(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId
    ) {
        return ApiResponse.ok(creditService.getBalance(userId));
    }

    @Operation(summary = "크레딧 내역 조회")
    @GetMapping("/ledger")
    public ApiResponse<List<CreditLedgerResponse>> getLedgers(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
            @RequestParam(defaultValue = "all") String type
    ) {
        return ApiResponse.ok(creditService.getLedgers(userId, LedgerFlow.fromQuery(type)));
    }

    @Operation(summary = "출금 내역 조회")
    @GetMapping("/withdrawals")
    public ApiResponse<List<CashoutResponse>> getCashouts(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId
    ) {
        return ApiResponse.ok(creditService.getCashouts(userId));
    }

    @Operation(summary = "출금 신청")
    @PostMapping("/withdrawals")
    public ApiResponse<CashoutResponse> requestCashout(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
            @Valid @RequestBody CashoutCreateRequest request
    ) {
        return ApiResponse.ok(creditService.requestCashout(userId, request));
    }
}
