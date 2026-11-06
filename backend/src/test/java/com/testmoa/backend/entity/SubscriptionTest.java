package com.testmoa.backend.entity;

import com.testmoa.backend.entity.enums.SubscriptionStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

class SubscriptionTest {

    @Test
    @DisplayName("#45-S25 구독은 ACTIVE로 시작")
    void 만들_때_상태는_ACTIVE다() {
        LocalDateTime start = LocalDateTime.of(2026, 11, 1, 0, 0);

        Subscription subscription = Subscription.builder()
                .user(null)
                .plan(null)
                .startAt(start)
                .endAt(start.plusDays(30))
                .build();

        assertEquals(SubscriptionStatus.ACTIVE, subscription.getStatus());
    }
}
