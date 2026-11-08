package com.testmoa.backend.controller.tester;

import com.testmoa.backend.dto.request.FeedbackSubmitRequest;
import com.testmoa.backend.dto.response.ParticipationResponse;
import com.testmoa.backend.global.util.ApiResponse;
import com.testmoa.backend.service.ParticipationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * 테스터의 내 참여(#117, #118). 로그인이 필요하고 자기 참가만 본다. 역할별 기능이라 tester 패키지에 둔다(README 정한 것 15)
 */
@RestController
@RequestMapping("/api/v1/tester/participations")
@RequiredArgsConstructor
public class ParticipationController {
    private final ParticipationService participationService;

    @Operation(summary = "내 참여 상세", description = "진행 상황, 테스트 정보, 테스트 항목, 제출한 피드백. 접속 링크는 확정된 참가에만 준다. 다른 회원의 참가는 404")
    @GetMapping("/{registerId}")
    public ApiResponse<ParticipationResponse> find(@Parameter(hidden = true) @AuthenticationPrincipal Long userId,
                                                   @PathVariable Long registerId) {
        return ApiResponse.ok(participationService.find(userId, registerId));
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
