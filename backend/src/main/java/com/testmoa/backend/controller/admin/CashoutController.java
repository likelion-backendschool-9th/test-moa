package com.testmoa.backend.controller.admin;

import com.testmoa.backend.dto.request.CashoutProcessRequest;
import com.testmoa.backend.dto.response.AdminCashoutResponse;
import com.testmoa.backend.global.util.ApiResponse;
import com.testmoa.backend.entity.enums.CashoutTab;
import com.testmoa.backend.service.admin.CashoutService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 운영자 출금 처리. /api/v1/admin/** 은 SecurityConfig가 ADMIN만 허용한다.
 * 회원용 {@code CashoutController}와 클래스 이름이 같아서 빈 이름을 따로 준다.
 */
@RestController("adminCashoutController")
@RequestMapping("/api/v1/admin/withdrawals")
public class CashoutController {

    private final CashoutService cashoutService;

    public CashoutController(CashoutService cashoutService) {
        this.cashoutService = cashoutService;
    }

    @Operation(summary = "출금 요청 목록 (처리 대기·처리 완료)")
    @GetMapping
    public ApiResponse<List<AdminCashoutResponse>> getCashouts(@RequestParam(defaultValue = "pending") String tab) {
        return ApiResponse.ok(cashoutService.getCashouts(CashoutTab.fromQuery(tab)));
    }

    @Operation(summary = "출금 요청 상세")
    @GetMapping("/{withdrawalKey}")
    public ApiResponse<AdminCashoutResponse> getCashout(@PathVariable Long withdrawalKey) {
        return ApiResponse.ok(cashoutService.getCashout(withdrawalKey));
    }

    @Operation(summary = "출금 요청 처리 (지급 완료·반려)")
    @PutMapping("/{withdrawalKey}")
    public ApiResponse<AdminCashoutResponse> process(
            @PathVariable Long withdrawalKey,
            @Valid @RequestBody CashoutProcessRequest request
    ) {
        return ApiResponse.ok(cashoutService.process(withdrawalKey, request));
    }
}
