package com.testmoa.backend.controller;

import com.testmoa.backend.domain.dto.request.CashoutCreateRequest;
import com.testmoa.backend.domain.dto.response.CashoutResponse;
import com.testmoa.backend.domain.dto.response.CreditBalanceResponse;
import com.testmoa.backend.domain.dto.response.CreditLedgerResponse;
import com.testmoa.backend.global.common.ApiResponse;
import com.testmoa.backend.global.common.LedgerFlow;
import com.testmoa.backend.service.CreditService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 크레딧 잔액·내역·출금. 인증이 붙기 전까지 userId 경로로 대상 회원을 가리킨다.
 */
@RestController
@RequestMapping("/api/users/{userId}/credits")
public class CreditController {

    private final CreditService creditService;

    public CreditController(CreditService creditService) {
        this.creditService = creditService;
    }

    @Operation(summary = "크레딧 잔액 조회")
    @GetMapping
    public ApiResponse<CreditBalanceResponse> getBalance(@PathVariable Long userId) {
        return ApiResponse.ok(creditService.getBalance(userId));
    }

    @Operation(summary = "크레딧 내역 조회")
    @GetMapping("/ledgers")
    public ApiResponse<List<CreditLedgerResponse>> getLedgers(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "all") String type
    ) {
        return ApiResponse.ok(creditService.getLedgers(userId, LedgerFlow.fromQuery(type)));
    }

    @Operation(summary = "출금 내역 조회")
    @GetMapping("/cashouts")
    public ApiResponse<List<CashoutResponse>> getCashouts(@PathVariable Long userId) {
        return ApiResponse.ok(creditService.getCashouts(userId));
    }

    @Operation(summary = "출금 신청")
    @PostMapping("/cashouts")
    public ApiResponse<CashoutResponse> requestCashout(
            @PathVariable Long userId,
            @Valid @RequestBody CashoutCreateRequest request
    ) {
        return ApiResponse.ok(creditService.requestCashout(userId, request));
    }
}
