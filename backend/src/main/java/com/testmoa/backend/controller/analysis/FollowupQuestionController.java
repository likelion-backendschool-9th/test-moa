package com.testmoa.backend.controller.analysis;

import com.testmoa.backend.dto.response.FollowupQuestionsResponse;
import com.testmoa.backend.global.util.ApiResponse;
import com.testmoa.backend.service.FollowupQuestionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * AI 후속 질문 추천. 질문은 AI 분석 서버가 만들고 저장하지 않음
 */
@RestController
@RequestMapping("/api/v1/developer/feedbacks")
public class FollowupQuestionController {
    private final FollowupQuestionService followupQuestionService;

    public FollowupQuestionController(FollowupQuestionService followupQuestionService) {
        this.followupQuestionService = followupQuestionService;
    }

    @Operation(summary = "AI 후속 질문 추천", description = "로그인·구독 필요. 내 프로젝트의 리뷰 하나로 테스터에게 보낼 질문 3개를 추천한다. 하루 3번까지")
    @PostMapping("/{feedbackId}/followup-questions")
    public ApiResponse<FollowupQuestionsResponse> recommend(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
            @PathVariable Long feedbackId
    ) {
        return ApiResponse.ok(followupQuestionService.recommend(userId, feedbackId));
    }
}
