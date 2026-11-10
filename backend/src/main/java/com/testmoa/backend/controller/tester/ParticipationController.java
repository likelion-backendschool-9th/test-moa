package com.testmoa.backend.controller.tester;

import com.testmoa.backend.dto.request.FeedbackSubmitRequest;
import com.testmoa.backend.dto.response.ImageUploadResponse;
import com.testmoa.backend.dto.response.ParticipationListItemResponse;
import com.testmoa.backend.dto.response.ParticipationResponse;
import com.testmoa.backend.dto.response.ParticipationSummaryResponse;
import com.testmoa.backend.global.util.ApiResponse;
import com.testmoa.backend.service.ParticipationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * 테스터의 내 참여(#117, #118). 로그인이 필요하고 자기 참가만 본다. 역할별 기능이라 tester 패키지에 둔다(README 정한 것 15)
 */
@RestController
@RequestMapping("/api/v1/tester/participations")
@RequiredArgsConstructor
public class ParticipationController {
    private final ParticipationService participationService;

    @Operation(summary = "피드백 이미지 조회", description = "자기 참가의 이미지를 읽는다. 다른 회원의 참가는 404")
    @GetMapping("/{registerId}/feedbacks/images/{name}")
    public ResponseEntity<Resource> image(@Parameter(hidden = true) @AuthenticationPrincipal Long userId,
                                          @PathVariable Long registerId, @PathVariable String name) {
        var image = participationService.loadFeedbackImage(userId, registerId, name);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .contentType(MediaType.parseMediaType(image.contentType())).body(image.resource());
    }

    @Operation(summary = "내 참여 목록", description = "탭(applied 지원한, ongoing 참여 중, history 참여했던)의 참여. "
            + "지원한·참여 중은 할 일 순서, 참여했던은 최근 순. 참여 취소는 참여했던 탭에 있다")
    @GetMapping
    public ApiResponse<List<ParticipationListItemResponse>> list(@Parameter(hidden = true) @AuthenticationPrincipal Long userId,
                                                                 @RequestParam(defaultValue = "ongoing") String tab) {
        return ApiResponse.ok(participationService.list(userId, tab));
    }

    @Operation(summary = "내 참여 요약", description = "탭별 개수, 제출할 피드백 수, 지급 대기 크레딧")
    @GetMapping("/summary")
    public ApiResponse<ParticipationSummaryResponse> summary(@Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(participationService.summary(userId));
    }

    @Operation(summary = "내 마감 일정", description = "피드백 제출 전 참여를 제출 마감이 가까운 순서로. 마감 캘린더와 마감 임박 목록이 쓴다")
    @GetMapping("/deadlines")
    public ApiResponse<List<ParticipationListItemResponse>> deadlines(@Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(participationService.deadlines(userId));
    }

    @Operation(summary = "내 참여 상세", description = "진행 상황, 테스트 정보, 테스트 항목, 제출한 피드백. 접속 링크는 확정된 참가에만 준다. 다른 회원의 참가는 404")
    @GetMapping("/{registerId}")
    public ApiResponse<ParticipationResponse> find(@Parameter(hidden = true) @AuthenticationPrincipal Long userId,
                                                   @PathVariable Long registerId) {
        return ApiResponse.ok(participationService.find(userId, registerId));
    }

    @Operation(summary = "피드백 이미지 업로드", description = "확정된 참가가 제출 전에 PNG·JPG·WEBP를 한 장씩 올린다. 한 장 5MB. "
            + "응답 url을 제출 본문의 imageUrls에 넣는다")
    @PostMapping(value = "/{registerId}/feedbacks/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<ImageUploadResponse> uploadImage(@Parameter(hidden = true) @AuthenticationPrincipal Long userId,
                                                        @PathVariable Long registerId,
                                                        @RequestParam("file") List<MultipartFile> files) {
        return ApiResponse.ok(new ImageUploadResponse(participationService.uploadFeedbackImage(userId, registerId, files)));
    }

    @Operation(summary = "항목별 피드백 제출", description = "확정된 참가가 제출 마감 전에 한 번만 낸다. 필수 항목은 비울 수 없고 칸마다 500자까지. "
            + "칸별 오류는 error.fields의 testItems.{항목 id}, etc")
    @PostMapping("/{registerId}/feedbacks")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ParticipationResponse> submit(@Parameter(hidden = true) @AuthenticationPrincipal Long userId,
                                                     @PathVariable Long registerId,
                                                     @Valid @RequestBody FeedbackSubmitRequest request) {
        return ApiResponse.ok(participationService.submitFeedback(userId, registerId, request));
    }
}
