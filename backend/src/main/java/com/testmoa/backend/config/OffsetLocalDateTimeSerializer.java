package com.testmoa.backend.config;

import org.springframework.boot.jackson.JacksonComponent;
import tools.jackson.core.JsonGenerator;
import tools.jackson.databind.SerializationContext;
import tools.jackson.databind.ValueSerializer;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

/**
 * 응답의 {@code LocalDateTime}에 오프셋을 붙여 내려보낸다. 저장 값은 서버 시간대의 시각이라 서버 시간대
 * ({@code ZoneId.systemDefault()})로 보고, 서버가 UTC면 {@code 2026-11-05T11:00:00Z}가 된다.
 * 오프셋이 없는 문자열은 프론트의 {@code new Date(iso)}가 실행 위치의 시간대로 읽어 환경마다 9시간씩 어긋났다.
 * DTO 타입은 바꾸지 않고 전역으로 하나만 등록한다. 소수초는 값이 있을 때만 나온다.
 */
@JacksonComponent
public class OffsetLocalDateTimeSerializer extends ValueSerializer<LocalDateTime> {

    @Override
    public void serialize(LocalDateTime value, JsonGenerator generator, SerializationContext context) {
        generator.writeString(DateTimeFormatter.ISO_OFFSET_DATE_TIME.format(value.atZone(ZoneId.systemDefault())));
    }
}
