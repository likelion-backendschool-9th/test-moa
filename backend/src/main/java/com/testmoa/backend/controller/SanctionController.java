package com.testmoa.backend.controller;

import com.testmoa.backend.dto.response.MySanctionResponse;
import com.testmoa.backend.global.util.ApiResponse;
import com.testmoa.backend.service.SanctionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 내가 받은 경고·정지(#86). 마이페이지에서 사유·기간·막힌 기능을 본다
 */
@RestController
@RequestMapping("/api/v1/sanctions")
@RequiredArgsConstructor
public class SanctionController {
    private final SanctionService sanctionService;

    @Operation(summary = "내 제재", description = "최근 순. 제재한 운영자, 신고자, 증거는 없다")
    @GetMapping("/me")
    public ApiResponse<List<MySanctionResponse>> mine(@Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(sanctionService.getMine(userId));
    }
}
