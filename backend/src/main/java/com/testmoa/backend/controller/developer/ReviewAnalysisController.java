package com.testmoa.backend.controller.developer;

import com.testmoa.backend.dto.request.AnalysisGroupUpdateRequest;
import com.testmoa.backend.dto.response.GroupReviewResponse;
import com.testmoa.backend.dto.response.PraiseReviewResponse;
import com.testmoa.backend.dto.response.ReviewAnalysisResponse;
import com.testmoa.backend.global.util.ApiResponse;
import com.testmoa.backend.service.ReviewAnalysisService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * AI 리뷰 묶기·우선순위. 묶기와 이슈 초안은 분석 서버가 하고, 리뷰 수·테스터 수·순서는 메인 백엔드가 계산함
 */
@RestController
@RequestMapping("/api/v1/developer/recruitments")
public class ReviewAnalysisController {
    private final ReviewAnalysisService reviewAnalysisService;

    public ReviewAnalysisController(ReviewAnalysisService reviewAnalysisService) {
        this.reviewAnalysisService = reviewAnalysisService;
    }

    @Operation(summary = "AI 리뷰 분석 실행", description = "로그인·구독 필요. 내 모집글의 리뷰를 문제별로 묶는 분석을 시작하고 바로 202로 답한다. "
            + "분석은 따로 돌고 결과는 조회로 본다. 진행 중이면 409, 일주일에 3번까지")
    @PostMapping("/{recruitmentId}/analysis")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ApiResponse<ReviewAnalysisResponse> start(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
            @PathVariable Long recruitmentId
    ) {
        return ApiResponse.ok(reviewAnalysisService.start(userId, recruitmentId));
    }

    @Operation(summary = "AI 리뷰 분석 조회", description = "로그인·구독 필요. 분석 상태와 그룹 목록(심각도·테스터 수 순), 그룹별 리뷰 수·테스터 수·대표 리뷰, "
            + "칭찬 요약, 마지막으로 분석한 리뷰 시각, 아직 분석하지 않은 리뷰 수를 준다")
    @GetMapping("/{recruitmentId}/analysis")
    public ApiResponse<ReviewAnalysisResponse> find(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
            @PathVariable Long recruitmentId
    ) {
        return ApiResponse.ok(reviewAnalysisService.find(userId, recruitmentId));
    }

    @Operation(summary = "칭찬 리뷰 목록", description = "로그인·구독 필요. AI가 칭찬으로 묶은 리뷰를 최근 제출 순으로 준다. "
            + "신고·보상 제외 리뷰는 빼고, 여러 칭찬 그룹에 든 리뷰는 한 번만 준다. 분석 전이면 빈 목록")
    @GetMapping("/{recruitmentId}/analysis/praises")
    public ApiResponse<List<PraiseReviewResponse>> findPraises(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
            @PathVariable Long recruitmentId
    ) {
        return ApiResponse.ok(reviewAnalysisService.findPraises(userId, recruitmentId));
    }

    @Operation(summary = "분석 그룹 리뷰 목록", description = "로그인·구독 필요. 그룹에 든 리뷰를 대표 리뷰 먼저, 나머지는 최근 제출 순으로 준다. "
            + "신고·보상 제외 리뷰는 뺀다. 다른 모집글의 그룹이면 404")
    @GetMapping("/{recruitmentId}/analysis/groups/{groupId}/reviews")
    public ApiResponse<List<GroupReviewResponse>> findGroupReviews(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
            @PathVariable Long recruitmentId,
            @PathVariable Long groupId
    ) {
        return ApiResponse.ok(reviewAnalysisService.findGroupReviews(userId, recruitmentId, groupId));
    }

    @Operation(summary = "분석 그룹 GitHub 이슈 등록", description = "로그인·구독 필요. 그룹의 이슈 초안을 프로젝트에 연결된 GitHub 레포에 이슈로 등록한다. "
            + "이미 등록했거나 칭찬·미분류 그룹이거나 레포가 연결되지 않았으면 거절한다")
    @PostMapping("/{recruitmentId}/analysis/groups/{groupId}/github-issue")
    public ApiResponse<ReviewAnalysisResponse> registerIssue(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
            @PathVariable Long recruitmentId,
            @PathVariable Long groupId
    ) {
        return ApiResponse.ok(reviewAnalysisService.registerIssue(userId, recruitmentId, groupId));
    }

    @Operation(summary = "AI 분석 그룹 수정", description = "로그인·구독 필요. 그룹 이름·심각도·이슈 제목·내용 중 보낸 값만 바꾼다. "
            + "칭찬·미분류 그룹에는 심각도와 이슈 초안을 보낼 수 없다")
    @PatchMapping("/{recruitmentId}/analysis/groups/{groupId}")
    public ApiResponse<ReviewAnalysisResponse> editGroup(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
            @PathVariable Long recruitmentId,
            @PathVariable Long groupId,
            @Valid @RequestBody AnalysisGroupUpdateRequest request
    ) {
        return ApiResponse.ok(reviewAnalysisService.editGroup(userId, recruitmentId, groupId, request));
    }
}
