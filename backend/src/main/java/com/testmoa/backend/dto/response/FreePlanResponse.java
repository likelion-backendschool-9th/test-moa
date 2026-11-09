package com.testmoa.backend.dto.response;

import com.testmoa.backend.entity.FreePlan;

import java.util.List;

/**
 * 무료 플랜 조건. 혜택은 description을 쉼표로 자른 목록이다.
 * 행이 없으면 이름은 {@code FREE}, 혜택은 빈 목록이다.
 */
public record FreePlanResponse(
        String tier,
        List<String> benefits
) {
    public static FreePlanResponse of(FreePlan freePlan) {
        return new FreePlanResponse(freePlan.getTier(), freePlan.benefits());
    }

    public static FreePlanResponse empty() {
        return new FreePlanResponse(FreePlan.DEFAULT_TIER, List.of());
    }
}
