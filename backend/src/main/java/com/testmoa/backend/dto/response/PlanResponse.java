package com.testmoa.backend.dto.response;

import com.testmoa.backend.entity.Plan;

import java.util.List;

/**
 * 구독 플랜 한 건. 혜택은 description을 쉼표로 자른 목록이다.
 */
public record PlanResponse(
        Long id,
        String tier,
        Integer version,
        Integer cashPrice,
        Integer creditPrice,
        Integer periodDays,
        List<String> benefits
) {
    public static PlanResponse of(Plan plan) {
        return new PlanResponse(
                plan.getId(),
                plan.getTier(),
                plan.getVersion(),
                plan.getCashPrice(),
                plan.getCreditPrice(),
                plan.getPeriodDays(),
                plan.benefits()
        );
    }
}
