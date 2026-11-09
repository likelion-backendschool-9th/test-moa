package com.testmoa.backend.controller.admin;

import com.testmoa.backend.dto.request.SanctionCreateRequest;
import com.testmoa.backend.dto.request.SanctionReleaseRequest;
import com.testmoa.backend.dto.response.AdminUserResponse;
import com.testmoa.backend.dto.response.SanctionResponse;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.global.util.ApiResponse;
import com.testmoa.backend.service.admin.AdminUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 운영자 회원 관리와 제재·해제(#86). 운영자만 부를 수 있다(SecurityConfig /api/v1/admin/**)
 */
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminUserController {
    private static final Set<String> FILTERS = Set.of("all", "sanctioned", "reported");

    private final AdminUserService adminUserService;

    @Operation(summary = "운영자 회원 목록", description = "q: 닉네임 일부. filter: all, sanctioned(제재 이력 있음), reported(검토 대기 신고 있음). 최근 가입 순, 실명·이메일 없음")
    @GetMapping("/users")
    public ApiResponse<List<AdminUserResponse>> list(@RequestParam(required = false) String q,
                                                     @RequestParam(defaultValue = "all") String filter) {
        if (!FILTERS.contains(filter)) {
            String message = "filter는 all, sanctioned, reported 중 하나예요";
            throw new BusinessException(ErrorCode.INVALID_INPUT, message, Map.of("filter", message));
        }
        return ApiResponse.ok(adminUserService.list(q, filter));
    }

    @Operation(summary = "운영자 회원 상세", description = "가린 실명·이메일, 지금 막힌 기능, 제재 이력, 받은 신고")
    @GetMapping("/users/{userId}")
    public ApiResponse<AdminUserResponse> get(@PathVariable Long userId) {
        return ApiResponse.ok(adminUserService.get(userId));
    }

    @Operation(summary = "제재", description = "type: WARNING(경고), SUSPENSION(기간 정지, days 1~3650), PERMANENT(영구 정지). 정지는 restrictions(LOGIN·APPLY·RECRUIT·FEEDBACK·CHAT)를 하나 이상")
    @PostMapping("/users/{userId}/sanctions")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<SanctionResponse> sanction(@Parameter(hidden = true) @AuthenticationPrincipal Long adminId,
                                                  @PathVariable Long userId,
                                                  @Valid @RequestBody SanctionCreateRequest request) {
        return ApiResponse.ok(adminUserService.sanction(adminId, userId, request));
    }

    @Operation(summary = "제재 해제", description = "지금 걸린 제재만 풀 수 있다(409). 해제 사유 필수")
    @PostMapping("/sanctions/{sanctionId}/release")
    public ApiResponse<SanctionResponse> release(@Parameter(hidden = true) @AuthenticationPrincipal Long adminId,
                                                 @PathVariable Long sanctionId,
                                                 @Valid @RequestBody SanctionReleaseRequest request) {
        return ApiResponse.ok(adminUserService.release(adminId, sanctionId, request.reason()));
    }
}
