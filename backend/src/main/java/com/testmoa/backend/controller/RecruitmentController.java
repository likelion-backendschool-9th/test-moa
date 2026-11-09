package com.testmoa.backend.controller;

import com.testmoa.backend.dto.request.RecruitmentSearchRequest;
import com.testmoa.backend.dto.response.RecruitmentPageResponse;
import com.testmoa.backend.dto.response.RecruitmentResponse;
import com.testmoa.backend.global.util.ApiResponse;
import com.testmoa.backend.service.RecruitmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
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
    public ApiResponse<RecruitmentPageResponse> search(@Valid @ParameterObject @ModelAttribute RecruitmentSearchRequest request) {
        return ApiResponse.ok(recruitmentService.search(request));
    }

    @Operation(summary = "공개 모집글 상세", description = "로그인 없이 부를 수 있다. 로그인했으면 내 참가 상태(myRegisterStatus)가 함께 온다. 취소됐거나 없는 모집은 404")
    @GetMapping("/{recruitmentId}")
    public ApiResponse<RecruitmentResponse> findOne(@Parameter(hidden = true) @AuthenticationPrincipal Long userId,
                                                          @PathVariable Long recruitmentId) {
        return ApiResponse.ok(recruitmentService.find(recruitmentId, userId));
    }
}
