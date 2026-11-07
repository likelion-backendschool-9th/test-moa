package com.testmoa.backend.controller;

import com.testmoa.backend.dto.response.PublicRecruitmentResponse;
import com.testmoa.backend.global.util.ApiResponse;
import com.testmoa.backend.service.PublicRecruitmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 누구나 보는 테스트 모집. 조회는 로그인 없이 부를 수 있고, 토큰을 보내면 회원으로 본다
 */
@RestController
@RequestMapping("/api/v1/recruitments")
@RequiredArgsConstructor
public class PublicRecruitmentController {
    private final PublicRecruitmentService publicRecruitmentService;

    @Operation(summary = "공개 모집글 상세", description = "로그인 없이 부를 수 있다. 로그인했으면 내 참가 상태(myRegisterStatus)가 함께 온다. 취소됐거나 없는 모집은 404")
    @GetMapping("/{recruitmentId}")
    public ApiResponse<PublicRecruitmentResponse> findOne(@Parameter(hidden = true) @AuthenticationPrincipal Long userId,
                                                          @PathVariable Long recruitmentId) {
        return ApiResponse.ok(publicRecruitmentService.find(recruitmentId, userId));
    }
}
