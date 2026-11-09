package com.testmoa.backend.support;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;

/**
 * 응답의 시각 문자열(오프셋 포함, 예: {@code 2026-11-05T11:00:00Z})을 서버 시간대의 {@code LocalDateTime}으로 읽는다.
 * 응답에 오프셋이 붙기 전에는 {@code LocalDateTime.parse}로 바로 읽었다(#193).
 */
public final class ResponseTimes {

    private ResponseTimes() {
    }

    public static LocalDateTime parse(String text) {
        return OffsetDateTime.parse(text).atZoneSameInstant(ZoneId.systemDefault()).toLocalDateTime();
    }
}
