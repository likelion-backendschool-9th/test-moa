package com.testmoa.backend.controller.admin;

import com.testmoa.backend.dto.request.CashoutRejectRequest;
import com.testmoa.backend.dto.response.AdminCashoutResponse;
import com.testmoa.backend.global.util.ApiResponse;
import com.testmoa.backend.entity.enums.CashoutTab;
import com.testmoa.backend.service.AdminCashoutService;
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
 * 운영자 출금 처리. /api/admin/** 은 SecurityConfig가 ADMIN만 허용한다.
 */
@RestController
@RequestMapping("/api/admin/cashouts")
public class CashoutController {

    private final AdminCashoutService adminCashoutService;

    public CashoutController(AdminCashoutService adminCashoutService) {
        this.adminCashoutService = adminCashoutService;
    }

    @Operation(summary = "출금 요청 목록 (처리 대기·처리 완료)")
    @GetMapping
    public ApiResponse<List<AdminCashoutResponse>> getCashouts(@RequestParam(defaultValue = "pending") String tab) {
        return ApiResponse.ok(adminCashoutService.getCashouts(CashoutTab.fromQuery(tab)));
    }

    @Operation(summary = "출금 요청 상세")
    @GetMapping("/{id}")
    public ApiResponse<AdminCashoutResponse> getCashout(@PathVariable Long id) {
        return ApiResponse.ok(adminCashoutService.getCashout(id));
    }

    @Operation(summary = "출금 지급 완료 처리")
    @PostMapping("/{id}/pay")
    public ApiResponse<AdminCashoutResponse> pay(@PathVariable Long id) {
        return ApiResponse.ok(adminCashoutService.pay(id));
    }

    @Operation(summary = "출금 반려 처리")
    @PostMapping("/{id}/reject")
    public ApiResponse<AdminCashoutResponse> reject(
            @PathVariable Long id,
            @Valid @RequestBody CashoutRejectRequest request
    ) {
        return ApiResponse.ok(adminCashoutService.reject(id, request));
    }
}
