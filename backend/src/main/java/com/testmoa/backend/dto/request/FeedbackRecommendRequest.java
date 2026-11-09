package com.testmoa.backend.dto.request;

import jakarta.validation.constraints.NotNull;

/**
 * 유용해요 표시. 누르면 true, 다시 누르면 false
 */
public record FeedbackRecommendRequest(
        @NotNull(message = "유용해요 여부를 골라 주세요")
        Boolean recommended
) {}
