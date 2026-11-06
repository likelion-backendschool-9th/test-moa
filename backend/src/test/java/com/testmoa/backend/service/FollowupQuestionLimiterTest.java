package com.testmoa.backend.service;

import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * AI 후속 질문 추천의 하루 3번 한도
 */
class FollowupQuestionLimiterTest {
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    private final MovableClock clock = new MovableClock(Instant.parse("2026-11-06T03:00:00Z")); // 서울 12:00
    private final FollowupQuestionLimiter limiter = new FollowupQuestionLimiter(clock);

    private void useUp(Long userId) {
        for (int i = 0; i < FollowupQuestionLimiter.DAILY_LIMIT; i++) limiter.acquire(userId);
    }

    private void assertLimitExceeded(Long userId) {
        assertThatThrownBy(() -> limiter.acquire(userId)).isInstanceOfSatisfying(BusinessException.class,
                e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.FOLLOWUP_LIMIT_EXCEEDED));
    }

    @Test
    @DisplayName("#109-S7 하루 3번까지 쓰고 네 번째는 FOLLOWUP_LIMIT_EXCEEDED. 회원마다 따로 센다")
    void 하루_3번() {
        useUp(1L);

        assertLimitExceeded(1L);
        assertThatNoException().isThrownBy(() -> limiter.acquire(2L));
    }

    @Test
    @DisplayName("#109-S8 서울 시간 자정이 지나면 다시 3번 쓸 수 있다")
    void 자정에_다시_센다() {
        clock.set(Instant.parse("2026-11-06T14:59:00Z")); // 서울 23:59
        useUp(1L);
        assertLimitExceeded(1L);

        clock.set(Instant.parse("2026-11-06T15:00:00Z")); // 서울 다음 날 00:00
        useUp(1L);
        assertLimitExceeded(1L);
    }

    @Test
    @DisplayName("#109-S8 날이 바뀌면 지난 날짜의 사용 기록을 지운다")
    void 지난_기록을_지운다() {
        limiter.acquire(1L);
        limiter.acquire(2L);

        clock.set(Instant.parse("2026-11-07T03:00:00Z")); // 서울 다음 날 12:00
        limiter.acquire(3L);

        assertThat(limiter.trackedUsers()).isEqualTo(1);
    }

    @Test
    @DisplayName("#109-S9 질문을 받지 못한 요청은 되돌려서 세지 않는다")
    void 실패는_세지_않는다() {
        LocalDate countedOn = limiter.acquire(1L);
        limiter.acquire(1L);
        limiter.acquire(1L);
        limiter.release(1L, countedOn);

        assertThatNoException().isThrownBy(() -> limiter.acquire(1L));
        assertLimitExceeded(1L);
    }

    @Test
    @DisplayName("#109-S9 자정을 넘겨 실패한 요청은 다음 날 횟수를 되돌리지 않는다")
    void 자정을_넘긴_실패() {
        clock.set(Instant.parse("2026-11-06T14:59:40Z")); // 서울 23:59:40에 요청 A를 셈
        LocalDate countedOnA = limiter.acquire(1L);

        clock.set(Instant.parse("2026-11-06T15:00:05Z")); // 서울 00:00:05에 요청 B를 셈
        limiter.acquire(1L);
        limiter.acquire(1L);
        limiter.acquire(1L);
        limiter.release(1L, countedOnA); // A가 실패해도 다음 날의 B는 그대로

        assertLimitExceeded(1L);
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
            return SEOUL;
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
