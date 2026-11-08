package com.testmoa.backend.dto.response;

import java.time.LocalDateTime;

/**
 * 내 구독 상태. 구독 중이 아니면 planId·plan·endAt·remainingDays가 null이다.
 * 운영자는 구독 대상이 아니라서 eligible=false이고 나머지가 모두 null이다.
 */
public record SubscriptionResponse(
        boolean eligible,
        Boolean active,
        Long planId,
        String plan,
        LocalDateTime endAt,
        Integer remainingDays
) {
    public static SubscriptionResponse notEligible() {
        return new SubscriptionResponse(false, null, null, null, null, null);
    }

    public static SubscriptionResponse inactive() {
        return new SubscriptionResponse(true, false, null, null, null, null);
    }

    public static SubscriptionResponse active(Long planId, String plan, LocalDateTime endAt, int remainingDays) {
        return new SubscriptionResponse(true, true, planId, plan, endAt, remainingDays);
    }
}
