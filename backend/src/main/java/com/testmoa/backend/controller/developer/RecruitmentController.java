package com.testmoa.backend.controller.developer;

import com.testmoa.backend.dto.request.RecruitmentCancelRequest;
import com.testmoa.backend.dto.request.RecruitmentCreateRequest;
import com.testmoa.backend.dto.response.RecruitmentCancelResponse;
import com.testmoa.backend.dto.response.RecruitmentCreateResponse;
import com.testmoa.backend.global.util.ApiResponse;
import com.testmoa.backend.service.ProjectService;
import com.testmoa.backend.service.RecruitmentCancelService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * 개발자의 테스트 모집. 로그인이 필요하고, 다른 회원의 프로젝트에는 모집을 만들 수 없다
 */
@RestController("developerRecruitmentController")
@RequestMapping("/api/v1/developer/recruitments")
@RequiredArgsConstructor
public class RecruitmentController {
    private final ProjectService projectService;
    private final RecruitmentCancelService recruitmentCancelService;

    @Operation(summary = "테스트 모집 작성", description = "모집글, 유형, 테스트 항목을 함께 저장한다")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<RecruitmentCreateResponse> create(@Parameter(hidden = true) @AuthenticationPrincipal Long userId,
                                                         @Valid @RequestBody RecruitmentCreateRequest request) {
        return ApiResponse.ok(projectService.createRecruitment(userId, request));
    }

    @Operation(summary = "모집 취소", description = "모집 중이면 사유 없이(선착순은 확정 테스터가 있어도), 테스트 중이면 사유를 적어 취소한다. "
            + "종료·취소된 모집과 확정 테스터가 있는 선발형 모집은 409. 본문은 생략할 수 있다")
    @PostMapping("/{recruitmentId}/cancel")
    public ApiResponse<RecruitmentCancelResponse> cancel(@Parameter(hidden = true) @AuthenticationPrincipal Long userId,
                                                         @PathVariable Long recruitmentId,
                                                         @Valid @RequestBody(required = false) RecruitmentCancelRequest request) {
        return ApiResponse.ok(recruitmentCancelService.cancel(userId, recruitmentId, request == null ? null : request.reason()));
    }
}
