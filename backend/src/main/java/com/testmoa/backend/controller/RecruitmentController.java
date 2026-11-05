package com.testmoa.backend.controller;

import com.testmoa.backend.domain.dto.request.RecruitmentCreateRequest;
import com.testmoa.backend.domain.dto.response.RecruitmentCreateResponse;
import com.testmoa.backend.global.common.ApiResponse;
import com.testmoa.backend.service.ProjectService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * 개발자의 테스트 모집. 로그인이 필요하고, 다른 회원의 프로젝트에는 모집을 만들 수 없다
 */
@RestController
@RequestMapping("/api/v1/developer/recruitments")
@RequiredArgsConstructor
public class RecruitmentController {
    private final ProjectService projectService;

    @Operation(summary = "테스트 모집 작성", description = "모집글, 유형, 테스트 항목을 함께 저장한다")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<RecruitmentCreateResponse> create(@Parameter(hidden = true) @AuthenticationPrincipal Long userId,
                                                         @Valid @RequestBody RecruitmentCreateRequest request) {
        return ApiResponse.ok(projectService.createRecruitment(userId, request));
    }
}
