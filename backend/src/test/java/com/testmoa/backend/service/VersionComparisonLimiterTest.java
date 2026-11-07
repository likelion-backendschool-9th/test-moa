package com.testmoa.backend.service;

import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * AI 버전 비교의 일주일 3번 한도. 하루 한도와 같은 셈(PeriodUsageLimiter)이라 기간 경계와 개발자별 셈만 확인한다
 */
class VersionComparisonLimiterTest {
    private final MovableClock clock = new MovableClock(Instant.parse("2026-11-09T03:00:00Z")); // 서울 월요일 12:00
    private final VersionComparisonLimiter limiter = new VersionComparisonLimiter(clock, true);

    private void useUp(Long userId) {
        for (int i = 0; i < VersionComparisonLimiter.WEEKLY_LIMIT; i++) limiter.acquire(userId);
    }

    private void assertLimitExceeded(Long userId) {
        assertThatThrownBy(() -> limiter.acquire(userId)).isInstanceOfSatisfying(BusinessException.class,
                e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.COMPARISON_LIMIT_EXCEEDED));
    }

    @Test
    @DisplayName("#108-S8 한 주에 3번까지 쓰고 네 번째는 COMPARISON_LIMIT_EXCEEDED. 개발자마다 따로 세고, 서울 시간 월요일 0시에 다시 센다")
    void 일주일에_3번() {
        useUp(1L);
        assertThatNoException().isThrownBy(() -> limiter.acquire(2L));

        clock.set(Instant.parse("2026-11-15T14:59:00Z")); // 서울 일요일 23:59, 같은 주
        assertLimitExceeded(1L);

        clock.set(Instant.parse("2026-11-15T15:00:00Z")); // 서울 다음 월요일 00:00
        useUp(1L);
        assertLimitExceeded(1L);
    }

    @Test
    @DisplayName("#108-S8 결과를 받지 못해 되돌린 요청은 세지 않는다")
    void 되돌린_요청은_세지_않는다() {
        for (int i = 0; i < VersionComparisonLimiter.WEEKLY_LIMIT; i++) {
            limiter.release(1L, limiter.acquire(1L));
        }
        assertThatNoException().isThrownBy(() -> useUp(1L));
    }

    @Test
    @DisplayName("#108-S8 한도를 끄면(analysis.weekly-limit-enabled=false) 같은 주에 몇 번이든 쓸 수 있다")
    void 한도를_끄면_세지_않는다() {
        VersionComparisonLimiter disabled = new VersionComparisonLimiter(clock, false);
        assertThatNoException().isThrownBy(() -> {
            for (int i = 0; i < VersionComparisonLimiter.WEEKLY_LIMIT * 2; i++) disabled.acquire(1L);
        });
    }

    private static final class MovableClock extends Clock {
        private Instant instant;

        private MovableClock(Instant instant) {
            this.instant = instant;
        }

        private void set(Instant instant) {
            this.instant = instant;
        }

        @Override
        public ZoneId getZone() {
            return ZoneId.of("Asia/Seoul");
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return instant;
        }
    }
}
