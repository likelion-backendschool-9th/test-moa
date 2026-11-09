package com.testmoa.backend.controller.developer;

import com.testmoa.backend.dto.request.ApplicantDecisionRequest;
import com.testmoa.backend.dto.response.ApplicantResponse;
import com.testmoa.backend.global.util.ApiResponse;
import com.testmoa.backend.service.ApplicationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 개발자의 테스터 관리. 로그인이 필요하고, 다른 회원의 모집은 없는 것처럼 404로 응답한다
 */
@RestController("developerApplicationController")
@RequestMapping("/api/v1/developer/recruitments")
@RequiredArgsConstructor
public class ApplicationController {
    private final ApplicationService applicationService;

    @Operation(summary = "지원 목록", description = "지원한 순서대로. 테스터는 닉네임만 주고, 피드백을 냈는지 함께 준다")
    @GetMapping("/{recruitmentId}/applications")
    public ApiResponse<List<ApplicantResponse>> findApplicants(@Parameter(hidden = true) @AuthenticationPrincipal Long userId,
                                                               @PathVariable Long recruitmentId) {
        return ApiResponse.ok(applicationService.findApplicants(userId, recruitmentId));
    }

    @Operation(summary = "지원자 확정·거절", description = "고른 지원을 한 번에 확정(confirmed)하거나 거절(rejected)한다. "
            + "선발형 구독 모집의 모집 기간에만 할 수 있고(아니면 409), 지원 상태가 아닌 지원이 섞이면 400이고 아무것도 바꾸지 않는다")
    @PatchMapping("/{recruitmentId}/applications")
    public ApiResponse<Void> decide(@Parameter(hidden = true) @AuthenticationPrincipal Long userId,
                                    @PathVariable Long recruitmentId,
                                    @Valid @RequestBody ApplicantDecisionRequest request) {
        applicationService.decide(userId, recruitmentId, request);
        return ApiResponse.ok();
    }
}
