package com.testmoa.backend.controller.developer;

import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;
import com.testmoa.backend.dto.request.RecruitmentCancelRequest;
import com.testmoa.backend.dto.request.RecruitmentCreateRequest;
import com.testmoa.backend.dto.request.RecruitmentUpdateRequest;
import com.testmoa.backend.dto.request.TestItemsUpdateRequest;
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
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
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

    @Operation(summary = "모집글 이미지 업로드")
    @PostMapping(value = "/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<Map<String, String>> uploadImage(
            @RequestParam("file") java.util.List<MultipartFile> files) {
        return ApiResponse.ok(Map.of("url", projectService.uploadImage(files)));
    }

    @Operation(summary = "테스트 항목 이미지 업로드")
    @PostMapping(value = "/test-items/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<Map<String, String>> uploadTestItemImage(
            @RequestParam("file") java.util.List<MultipartFile> files) {
        return ApiResponse.ok(Map.of("url", projectService.uploadImage(files)));
    }

    @Operation(summary = "테스트 모집 작성", description = "모집글, 유형, 테스트 항목을 함께 저장한다")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<RecruitmentCreateResponse> create(@Parameter(hidden = true) @AuthenticationPrincipal Long userId,
                                                         @Valid @RequestBody RecruitmentCreateRequest request) {
        return ApiResponse.ok(projectService.createRecruitment(userId, request));
    }

    @Operation(summary = "모집 정보 수정", description = "보낸 값만 바꾼다. 종료·취소한 모집은 409. "
            + "지원이 있으면 선정 방식을, 모집 마감이 지나면 모집 마감일을 바꿀 수 없고 마감일은 미루기만 한다")
    @PatchMapping("/{recruitmentId}")
    public ApiResponse<Void> update(@Parameter(hidden = true) @AuthenticationPrincipal Long userId,
                                    @PathVariable Long recruitmentId,
                                    @Valid @RequestBody RecruitmentUpdateRequest request) {
        projectService.updateRecruitment(userId, recruitmentId, request);
        return ApiResponse.ok();
    }

    @Operation(summary = "테스트 항목 수정", description = "보낸 순서대로 맞춘다. 빠진 항목은 지우고 id가 없는 항목은 새로 만든다. "
            + "피드백이 달린 항목은 지울 수 없다. 종료·취소한 모집은 409")
    @PutMapping("/{recruitmentId}/test-items")
    public ApiResponse<Void> updateTestItems(@Parameter(hidden = true) @AuthenticationPrincipal Long userId,
                                             @PathVariable Long recruitmentId,
                                             @Valid @RequestBody TestItemsUpdateRequest request) {
        projectService.updateTestItems(userId, recruitmentId, request);
        return ApiResponse.ok();
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
