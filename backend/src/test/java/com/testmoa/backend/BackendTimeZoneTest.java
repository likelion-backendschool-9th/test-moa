package com.testmoa.backend;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.TimeZone;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
class BackendTimeZoneTest {

    @Test
    @DisplayName("#193-S1 스프링 컨텍스트가 뜬 테스트에서 서버 기본 시간대는 UTC다 (컴퓨터가 한국 시간이어도)")
    void defaultTimeZoneIsUtc() {
        assertEquals("UTC", TimeZone.getDefault().getID());
    }
}
