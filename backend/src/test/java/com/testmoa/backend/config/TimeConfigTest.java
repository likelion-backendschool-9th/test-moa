package com.testmoa.backend.config;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.TimeZone;

import static org.junit.jupiter.api.Assertions.assertEquals;

class TimeConfigTest {

    private final TimeZone original = TimeZone.getDefault();

    @AfterEach
    void restore() {
        TimeZone.setDefault(original);
    }

    @Test
    @DisplayName("#193-S1 컴퓨터 시간대가 한국이어도 서버 기본 시간대는 UTC로 고정된다")
    void defaultTimeZoneBecomesUtc() {
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Seoul"));

        new TimeConfig().useUtc();

        assertEquals("UTC", TimeZone.getDefault().getID());
    }
}
