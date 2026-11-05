package com.testmoa.backend.controller;

import com.testmoa.backend.domain.dto.request.ProjectSaveRequest;
import com.testmoa.backend.domain.dto.response.ProjectResponse;
import com.testmoa.backend.domain.dto.response.RecruitmentSummaryResponse;
import com.testmoa.backend.global.common.ApiResponse;
import com.testmoa.backend.service.ProjectService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 개발자의 내 프로젝트. 모두 로그인이 필요하고, 다른 회원의 프로젝트는 없는 것처럼 404로 응답한다
 */
@RestController
@RequestMapping("/api/v1/developer/projects")
@RequiredArgsConstructor
public class ProjectController {
    private final ProjectService projectService;

    @Operation(summary = "내 프로젝트 목록", description = "최신순. 프로젝트마다 모집 수와 모집 중인 수를 준다")
    @GetMapping
    public ApiResponse<List<ProjectResponse>> findMine(@Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(projectService.findMine(userId));
    }

    @Operation(summary = "프로젝트 등록")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ProjectResponse> create(@Parameter(hidden = true) @AuthenticationPrincipal Long userId,
                                               @Valid @RequestBody ProjectSaveRequest request) {
        return ApiResponse.ok(projectService.create(userId, request));
    }

    @Operation(summary = "프로젝트 정보 조회")
    @GetMapping("/{projectKey}")
    public ApiResponse<ProjectResponse> findOne(@Parameter(hidden = true) @AuthenticationPrincipal Long userId,
                                                @PathVariable Long projectKey) {
        return ApiResponse.ok(projectService.findMine(userId, projectKey));
    }

    @Operation(summary = "프로젝트 모집 건 목록 조회", description = "최신순")
    @GetMapping("/{projectKey}/recruitments")
    public ApiResponse<List<RecruitmentSummaryResponse>> findRecruitments(@Parameter(hidden = true) @AuthenticationPrincipal Long userId,
                                                                          @PathVariable Long projectKey) {
        return ApiResponse.ok(projectService.findRecruitments(userId, projectKey));
    }

    @Operation(summary = "프로젝트 수정", description = "보낸 값으로 모두 바꾼다. 설명과 이미지를 비워 보내면 지워진다")
    @PutMapping("/{projectKey}")
    public ApiResponse<ProjectResponse> update(@Parameter(hidden = true) @AuthenticationPrincipal Long userId,
                                               @PathVariable Long projectKey,
                                               @Valid @RequestBody ProjectSaveRequest request) {
        return ApiResponse.ok(projectService.update(userId, projectKey, request));
    }
}
