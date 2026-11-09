package com.testmoa.backend.controller;

import com.testmoa.backend.dto.response.ApplicationResponse;
import com.testmoa.backend.global.util.ApiResponse;
import com.testmoa.backend.service.ApplicationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * 테스터의 테스트 지원(#114). 로그인이 필요하다
 */
@RestController
@RequestMapping("/api/v1/recruitments")
@RequiredArgsConstructor
public class ApplicationController {
    private final ApplicationService applicationService;

    @Operation(summary = "테스트 지원", description = "선착순 모집은 바로 확정(confirmed)되고 기본 보상이 고정된다. 선발형은 선정 대기(applied). "
            + "마감·자기 모집·이미 지원은 409, 없거나 취소된 모집은 404")
    @PostMapping("/{recruitmentId}/applications")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ApplicationResponse> apply(@Parameter(hidden = true) @AuthenticationPrincipal Long userId,
                                                  @PathVariable Long recruitmentId) {
        return ApiResponse.ok(applicationService.apply(userId, recruitmentId));
    }
}
