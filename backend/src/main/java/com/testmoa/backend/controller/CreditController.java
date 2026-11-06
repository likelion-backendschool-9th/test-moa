package com.testmoa.backend.controller;

import com.testmoa.backend.domain.dto.response.CreditBalanceResponse;
import com.testmoa.backend.domain.dto.response.CreditLedgerResponse;
import com.testmoa.backend.global.common.ApiResponse;
import com.testmoa.backend.global.common.LedgerFlow;
import com.testmoa.backend.service.CreditService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 내 크레딧 잔액·내역. 회원 id는 토큰에서 꺼낸다.
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
}
