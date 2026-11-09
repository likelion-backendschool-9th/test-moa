package com.testmoa.backend.config;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.module.SimpleModule;

import java.time.LocalDateTime;
import java.util.TimeZone;

import static org.junit.jupiter.api.Assertions.assertEquals;

class OffsetLocalDateTimeSerializerTest {

    private final TimeZone original = TimeZone.getDefault();
    private final JsonMapper mapper = JsonMapper.builder()
            .addModule(new SimpleModule().addSerializer(LocalDateTime.class, new OffsetLocalDateTimeSerializer()))
            .build();

    record Sample(String name, LocalDateTime at) {
    }

    @AfterEach
    void restore() {
        TimeZone.setDefault(original);
    }

    private String write(LocalDateTime value) {
        return mapper.writeValueAsString(value);
    }

    @Test
    @DisplayName("#193-S2 서버가 UTC면 시각 끝에 Z가 붙는다")
    void utcGetsZ() {
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));

        assertEquals("\"2026-11-05T11:00:00Z\"", write(LocalDateTime.of(2026, 11, 5, 11, 0)));
    }

    @Test
    @DisplayName("#193-S2 소수초가 있으면 유지된다")
    void keepsFraction() {
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));

        assertEquals("\"2026-11-08T08:21:43.432294Z\"",
                write(LocalDateTime.of(2026, 11, 8, 8, 21, 43, 432_294_000)));
    }

    @Test
    @DisplayName("#193-S2 서버가 UTC가 아니면 그 시간대의 오프셋이 붙고 같은 순간을 가리킨다")
    void nonUtcServerGetsItsOffset() {
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Seoul"));

        assertEquals("\"2026-11-05T11:00:00+09:00\"", write(LocalDateTime.of(2026, 11, 5, 11, 0)));
    }

    @Test
    @DisplayName("#193-S2 DTO 안의 LocalDateTime 필드도 같은 형식이고 다른 필드는 그대로다")
    void insideDto() {
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));

        assertEquals("{\"name\":\"결제\",\"at\":\"2026-11-05T11:00:00Z\"}",
                mapper.writeValueAsString(new Sample("결제", LocalDateTime.of(2026, 11, 5, 11, 0))));
    }
}
