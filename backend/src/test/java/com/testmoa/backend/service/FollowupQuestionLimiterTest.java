package com.testmoa.backend.service;

import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

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

    @Test
    @DisplayName("#109-S8 자정 전에 날짜를 읽고 멈췄던 요청이 재개돼도 다음 날 사용 기록은 그대로다")
    void 지연된_이전_날짜_요청() throws Exception {
        CountDownLatch staleReadDate = new CountDownLatch(1);
        CountDownLatch resume = new CountDownLatch(1);
        Instant beforeMidnight = Instant.parse("2026-11-06T14:59:59Z"); // 서울 23:59:59
        Instant afterMidnight = Instant.parse("2026-11-06T15:00:05Z"); // 서울 다음 날 00:00:05
        // 이름이 stale인 스레드만 이전 날짜를 읽고 resume까지 멈춤
        Clock gated = new Clock() {
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
                if (!"stale".equals(Thread.currentThread().getName())) return afterMidnight;
                staleReadDate.countDown();
                try {
                    resume.await();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
                return beforeMidnight;
            }
        };
        FollowupQuestionLimiter gatedLimiter = new FollowupQuestionLimiter(gated);

        ExecutorService executor = Executors.newSingleThreadExecutor(r -> new Thread(r, "stale"));
        try {
            Future<LocalDate> stale = executor.submit(() -> gatedLimiter.acquire(2L)); // 다른 회원의 지연 요청
            assertThat(staleReadDate.await(5, TimeUnit.SECONDS)).isTrue();

            for (int i = 0; i < FollowupQuestionLimiter.DAILY_LIMIT; i++) gatedLimiter.acquire(1L); // 다음 날 3번 모두 씀
            resume.countDown();
            stale.get(5, TimeUnit.SECONDS);

            assertThatThrownBy(() -> gatedLimiter.acquire(1L)).isInstanceOfSatisfying(BusinessException.class,
                    e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.FOLLOWUP_LIMIT_EXCEEDED));
        } finally {
            resume.countDown();
            executor.shutdownNow();
        }
    }

    @Test
    @DisplayName("#109-S8 같은 회원의 지연된 이전 날짜 요청도 다음 날 기록을 덮어쓰지 않고 그 날 횟수로 센다")
    void 지연된_같은_회원_요청() {
        clock.set(Instant.parse("2026-11-06T15:00:05Z"));
        useUp(1L);

        // 이전 날짜로 읽은 요청은 시계를 되돌려 흉내냄
        clock.set(Instant.parse("2026-11-06T14:59:59Z"));
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
