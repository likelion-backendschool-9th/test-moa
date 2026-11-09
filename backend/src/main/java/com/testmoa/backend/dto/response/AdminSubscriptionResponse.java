package com.testmoa.backend.dto.response;

import com.testmoa.backend.entity.User;

import java.time.LocalDateTime;

/**
 * 운영자가 보는 회원의 구독 상태(#204). 구독 상태 필드는 내 구독 상태({@link SubscriptionResponse})와 같은 규칙이다.
 * 운영자 계정은 구독 대상이 아니라서 eligible=false이고 나머지 상태 필드가 null이다.
 */
public record AdminSubscriptionResponse(
        String nickname,
        String email,
        boolean eligible,
        Boolean active,
        String plan,
        LocalDateTime endAt,
        Integer remainingDays
) {
    public static AdminSubscriptionResponse of(User user, SubscriptionResponse status) {
        return new AdminSubscriptionResponse(
                user.getNickname(), user.getEmail(),
                status.eligible(), status.active(), status.plan(), status.endAt(), status.remainingDays()
        );
    }
}
