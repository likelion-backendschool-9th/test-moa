package com.testmoa.backend.controller.developer;

import com.testmoa.backend.dto.request.FeedbackRecommendRequest;
import com.testmoa.backend.dto.request.FeedbackReportRequest;
import com.testmoa.backend.dto.response.FeedbackResponse;
import com.testmoa.backend.global.util.ApiResponse;
import com.testmoa.backend.service.FeedbackService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 개발자의 피드백 관리. 로그인이 필요하고, 다른 회원의 모집·피드백은 없는 것처럼 404로 응답한다
 */
@RestController
@RequestMapping("/api/v1/developer")
@RequiredArgsConstructor
public class FeedbackController {
    private final FeedbackService feedbackService;

    @Operation(summary = "피드백 이미지 조회", description = "내 프로젝트의 피드백 이미지를 읽는다. 다른 회원의 프로젝트는 404")
    @GetMapping("/feedbacks/{feedbackId}/images/{name}")
    public ResponseEntity<Resource> image(@Parameter(hidden = true) @AuthenticationPrincipal Long userId,
                                          @PathVariable Long feedbackId, @PathVariable String name) {
        var image = feedbackService.loadFeedbackImage(userId, feedbackId, name);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .contentType(MediaType.parseMediaType(image.contentType())).body(image.resource());
    }

    @Operation(summary = "피드백 목록", description = "최근 제출 순. 테스터는 닉네임만 주고, 스크린샷 주소와 유용해요 여부를 함께 준다")
    @GetMapping("/recruitments/{recruitmentId}/feedbacks")
    public ApiResponse<List<FeedbackResponse>> findFeedbacks(@Parameter(hidden = true) @AuthenticationPrincipal Long userId,
                                                             @PathVariable Long recruitmentId) {
        return ApiResponse.ok(feedbackService.findFeedbacks(userId, recruitmentId));
    }

    @Operation(summary = "유용해요 표시", description = "켜거나 끈다")
    @PutMapping("/feedbacks/{feedbackId}/recommendation")
    public ApiResponse<Void> recommend(@Parameter(hidden = true) @AuthenticationPrincipal Long userId,
                                       @PathVariable Long feedbackId,
                                       @Valid @RequestBody FeedbackRecommendRequest request) {
        feedbackService.recommend(userId, feedbackId, request.recommended());
        return ApiResponse.ok();
    }

    @Operation(summary = "피드백 신고", description = "제출 후 72시간 안에 사유를 적어 신고한다. 이미 신고했거나 72시간이 지났으면 409")
    @PostMapping("/feedbacks/{feedbackId}/report")
    public ApiResponse<Void> report(@Parameter(hidden = true) @AuthenticationPrincipal Long userId,
                                    @PathVariable Long feedbackId,
                                    @Valid @RequestBody FeedbackReportRequest request) {
        feedbackService.report(userId, feedbackId, request.reason());
        return ApiResponse.ok();
    }
}
