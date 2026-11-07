package com.testmoa.backend.controller;

import com.testmoa.backend.dto.response.RecruitmentPageResponse;
import com.testmoa.backend.dto.response.RecruitmentResponse;
import com.testmoa.backend.global.util.ApiResponse;
import com.testmoa.backend.service.RecruitmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 누구나 보는 테스트 모집. 조회는 로그인 없이 부를 수 있고, 토큰을 보내면 회원으로 본다
 */
@RestController
@RequestMapping("/api/v1/recruitments")
@RequiredArgsConstructor
public class RecruitmentController {
    private final RecruitmentService recruitmentService;

    @Operation(summary = "공개 모집 목록·검색", description = "로그인 없이 부를 수 있다. 취소된 모집은 빼고, 요청한 페이지가 마지막보다 크면 마지막 페이지를 준다. "
            + "홈 배너 최신 3건은 open=true&size=3, 구독 모집 영역은 subscription=true&open=true")
    @GetMapping
    public ApiResponse<RecruitmentPageResponse> search(
            @Parameter(description = "프로젝트 이름·소개, 모집글 제목에서 찾는다") @RequestParam(required = false) @Size(max = 100) String q,
            @Parameter(description = "web, mobile, game, api") @RequestParam(required = false) String type,
            @Parameter(description = "true면 모집 마감 전인 것만") @RequestParam(defaultValue = "false") boolean open,
            @Parameter(description = "true면 구독 모집만") @RequestParam(defaultValue = "false") boolean subscription,
            @Parameter(description = "latest(최신순), deadline(마감 임박순)") @RequestParam(defaultValue = "latest") String sort,
            @Parameter(description = "1부터") @RequestParam(defaultValue = "1") @Min(1) int page,
            @Parameter(description = "한 페이지 개수, 1~50") @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        return ApiResponse.ok(recruitmentService.search(q, type, open, subscription, sort, page, size));
    }

    @Operation(summary = "공개 모집글 상세", description = "로그인 없이 부를 수 있다. 로그인했으면 내 참가 상태(myRegisterStatus)가 함께 온다. 취소됐거나 없는 모집은 404")
    @GetMapping("/{recruitmentId}")
    public ApiResponse<RecruitmentResponse> findOne(@Parameter(hidden = true) @AuthenticationPrincipal Long userId,
                                                          @PathVariable Long recruitmentId) {
        return ApiResponse.ok(recruitmentService.find(recruitmentId, userId));
    }
}
