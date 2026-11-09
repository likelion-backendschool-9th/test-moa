package com.testmoa.backend.controller.admin;

import com.testmoa.backend.dto.request.ReportReviewRequest;
import com.testmoa.backend.dto.response.AdminReportResponse;
import com.testmoa.backend.entity.enums.ReportTargetType;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.global.util.ApiResponse;
import com.testmoa.backend.service.admin.AdminReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 운영자 신고 검토(#85). 운영자만 부를 수 있다(SecurityConfig /api/v1/admin/**)
 */
@RestController
@RequestMapping("/api/v1/admin/reports")
@RequiredArgsConstructor
public class AdminReportController {
    private final AdminReportService adminReportService;

    @Operation(summary = "운영자 신고 목록", description = "status: PENDING(검토 대기, 기본·오래된 순) 또는 DONE(처리 완료·최근 처리 순). targetType으로 대상 종류를 거른다")
    @GetMapping
    public ApiResponse<List<AdminReportResponse>> list(@RequestParam(defaultValue = "PENDING") String status,
                                                       @RequestParam(required = false) ReportTargetType targetType) {
        if (!"PENDING".equals(status) && !"DONE".equals(status)) {
            String message = "status는 PENDING이나 DONE이에요";
            throw new BusinessException(ErrorCode.INVALID_INPUT, message, Map.of("status", message));
        }
        return ApiResponse.ok(adminReportService.list("DONE".equals(status), targetType));
    }

    @Operation(summary = "운영자 신고 상세", description = "대상 내용(피드백 원문 등)과 증거")
    @GetMapping("/{reportId}")
    public ApiResponse<AdminReportResponse> get(@PathVariable Long reportId) {
        return ApiResponse.ok(adminReportService.get(reportId));
    }

    @Operation(summary = "신고 판정", description = "result: REJECTED(기각) 또는 ACCEPTED(인정). 한 번만 할 수 있다(409)")
    @PostMapping("/{reportId}/review")
    public ApiResponse<AdminReportResponse> review(@Parameter(hidden = true) @AuthenticationPrincipal Long adminId,
                                                   @PathVariable Long reportId,
                                                   @Valid @RequestBody ReportReviewRequest request) {
        return ApiResponse.ok(adminReportService.review(adminId, reportId, request.result()));
    }
}
