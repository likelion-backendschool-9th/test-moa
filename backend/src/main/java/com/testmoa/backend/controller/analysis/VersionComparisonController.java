package com.testmoa.backend.controller.analysis;

import com.testmoa.backend.dto.request.VersionLinksUpdateRequest;
import com.testmoa.backend.dto.response.VersionComparisonResponse;
import com.testmoa.backend.global.util.ApiResponse;
import com.testmoa.backend.service.VersionComparisonService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * AI 버전 간 비교. 비교는 분석 서버가 하고, 요약만 저장하며 나머지는 그룹 코드로 계산함
 */
@RestController
@RequestMapping("/api/v1/developer/recruitments")
public class VersionComparisonController {
    private final VersionComparisonService versionComparisonService;

    public VersionComparisonController(VersionComparisonService versionComparisonService) {
        this.versionComparisonService = versionComparisonService;
    }

    @Operation(summary = "AI 버전 비교 실행", description = "로그인·구독 필요. 내 모집글(현재 버전)을 같은 프로젝트의 직전 버전과 비교하고 저장한다. "
            + "두 버전 모두 리뷰 분석을 마쳐야 하고, 일주일에 3번까지. 응답은 비교 조회와 같다")
    @PostMapping("/{recruitmentId}/version-comparison")
    public ApiResponse<VersionComparisonResponse> compare(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
            @PathVariable Long recruitmentId
    ) {
        return ApiResponse.ok(versionComparisonService.compare(userId, recruitmentId));
    }

    @Operation(summary = "AI 버전 비교 조회", description = "로그인·구독 필요. 저장된 변화 요약과, 현재 버전 그룹마다 신규·이전에도 있음, "
            + "이번 버전에서 보고되지 않은 직전 버전 그룹, 비교가 오래됐는지를 준다")
    @GetMapping("/{recruitmentId}/version-comparison")
    public ApiResponse<VersionComparisonResponse> find(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
            @PathVariable Long recruitmentId
    ) {
        return ApiResponse.ok(versionComparisonService.find(userId, recruitmentId));
    }

    @Operation(summary = "버전 비교 짝 저장", description = "로그인·구독 필요. 이번 버전 그룹마다 이을 직전 버전 그룹(null이면 짝 없음)을 받아 그룹 코드를 고친다. "
            + "비교 결과가 있어야 하고 분석 중이면 409. 요약과 비교 시각은 그대로이고 한도를 쓰지 않는다. 응답은 비교 조회와 같다")
    @PutMapping("/{recruitmentId}/version-comparison/links")
    public ApiResponse<VersionComparisonResponse> relink(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
            @PathVariable Long recruitmentId,
            @Valid @RequestBody VersionLinksUpdateRequest request
    ) {
        return ApiResponse.ok(versionComparisonService.relink(userId, recruitmentId, request));
    }
}
