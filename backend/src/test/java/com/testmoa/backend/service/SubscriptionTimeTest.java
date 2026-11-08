package com.testmoa.backend.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.time.ZoneId;

import static org.junit.jupiter.api.Assertions.assertEquals;

class SubscriptionTimeTest {

    private static final ZoneId UTC = ZoneId.of("UTC");
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    @Test
    @DisplayName("#70-S10 서버가 서울이면 시작한 날 + 기간일의 23:59:59에 끝난다")
    void endsAtEndOfKoreanDayOnSeoulServer() {
        LocalDateTime end = SubscriptionTime.endAt(LocalDateTime.of(2026, 11, 8, 11, 15, 41, 324_294_000), 30, SEOUL);

        assertEquals(LocalDateTime.of(2026, 12, 8, 23, 59, 59), end);
    }

    @Test
    @DisplayName("#70-S10 서버가 UTC여도 한국 날짜 기준이고 저장 시각은 서버 시간대(14:59:59)다")
    void endsAtEndOfKoreanDayOnUtcServer() {
        LocalDateTime end = SubscriptionTime.endAt(LocalDateTime.of(2026, 11, 8, 2, 15, 41), 30, UTC);

        assertEquals(LocalDateTime.of(2026, 12, 8, 14, 59, 59), end);
    }

    @Test
    @DisplayName("#70-S10 UTC 16:00은 한국 다음 날 01:00이라 한국 날짜는 하루 뒤다")
    void koreanDateOfUtcEvening() {
        LocalDateTime end = SubscriptionTime.endAt(LocalDateTime.of(2026, 11, 8, 16, 0, 0), 30, UTC);

        assertEquals(LocalDateTime.of(2026, 12, 9, 14, 59, 59), end);
    }

    @Test
    @DisplayName("#70-S10 앞 기간의 끝에서 이어 붙여도 매번 기간일만큼 늘어난다")
    void chainedPeriodsAddExactDays() {
        LocalDateTime first = SubscriptionTime.endAt(LocalDateTime.of(2026, 11, 8, 11, 15, 41), 30, SEOUL);
        LocalDateTime second = SubscriptionTime.endAt(first, 30, SEOUL);

        assertEquals(LocalDateTime.of(2026, 12, 8, 23, 59, 59), first);
        assertEquals(LocalDateTime.of(2027, 1, 7, 23, 59, 59), second);
    }
}
