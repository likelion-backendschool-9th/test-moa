package com.testmoa.backend.controller;

import com.testmoa.backend.dto.request.ProjectSaveRequest;
import com.testmoa.backend.dto.request.RepositoryConnectRequest;
import com.testmoa.backend.dto.response.ProjectDashboardResponse;
import com.testmoa.backend.dto.response.ProjectResponse;
import com.testmoa.backend.dto.response.RecruitmentSummaryResponse;
import com.testmoa.backend.global.util.ApiResponse;
import com.testmoa.backend.service.ProjectService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
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

    @Operation(summary = "할 일·전체 현황", description = "확정을 기다리는 지원자와 72시간 안의 신고 대기 피드백을 모집 건별로, 진행 중인 모집과 신고 대기 수를 합쳐서 준다")
    @GetMapping("/dashboard")
    public ApiResponse<ProjectDashboardResponse> findDashboard(@Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(projectService.findDashboard(userId));
    }

    @Operation(summary = "프로젝트 등록")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ProjectResponse> create(@Parameter(hidden = true) @AuthenticationPrincipal Long userId,
                                               @Valid @RequestBody ProjectSaveRequest request) {
        return ApiResponse.ok(projectService.create(userId, request));
    }

    @Operation(summary = "프로젝트 정보 조회")
    @GetMapping("/{projectId}")
    public ApiResponse<ProjectResponse> findOne(@Parameter(hidden = true) @AuthenticationPrincipal Long userId,
                                                @PathVariable Long projectId) {
        return ApiResponse.ok(projectService.findMine(userId, projectId));
    }

    @Operation(summary = "프로젝트 모집 건 목록 조회", description = "최신순")
    @GetMapping("/{projectId}/recruitments")
    public ApiResponse<List<RecruitmentSummaryResponse>> findRecruitments(@Parameter(hidden = true) @AuthenticationPrincipal Long userId,
                                                                          @PathVariable Long projectId) {
        return ApiResponse.ok(projectService.findRecruitments(userId, projectId));
    }

    @Operation(summary = "프로젝트 수정", description = "보낸 값으로 모두 바꾼다. 설명과 이미지를 비워 보내면 지워진다")
    @PutMapping("/{projectId}")
    public ApiResponse<ProjectResponse> update(@Parameter(hidden = true) @AuthenticationPrincipal Long userId,
                                               @PathVariable Long projectId,
                                               @Valid @RequestBody ProjectSaveRequest request) {
        return ApiResponse.ok(projectService.update(userId, projectId, request));
    }

    @Operation(summary = "GitHub 레포 연결", description = "owner/repo나 GitHub 주소와 그 레포에 이슈를 만들 수 있는 토큰을 받아, GitHub에서 확인한 뒤 저장한다. "
            + "토큰은 암호화해 저장하고 응답에 나오지 않는다. 레포를 찾을 수 없거나 토큰이 틀리거나 이슈가 꺼져 있으면 424")
    @PutMapping("/{projectId}/repository")
    public ApiResponse<ProjectResponse> connectRepository(@Parameter(hidden = true) @AuthenticationPrincipal Long userId,
                                                          @PathVariable Long projectId,
                                                          @Valid @RequestBody RepositoryConnectRequest request) {
        return ApiResponse.ok(projectService.connectRepository(userId, projectId, request));
    }

    @Operation(summary = "GitHub 레포 연결 해제", description = "레포와 토큰을 지운다. 연결하지 않았어도 성공이다")
    @DeleteMapping("/{projectId}/repository")
    public ApiResponse<ProjectResponse> disconnectRepository(@Parameter(hidden = true) @AuthenticationPrincipal Long userId,
                                                             @PathVariable Long projectId) {
        return ApiResponse.ok(projectService.disconnectRepository(userId, projectId));
    }
}
