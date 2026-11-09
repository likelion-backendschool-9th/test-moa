package com.testmoa.backend.config;

import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Configuration;

import java.util.TimeZone;

/**
 * 서버(JVM)의 기본 시간대를 UTC로 고정한다. 설정이 없으면 실행 환경(IDE, 도커, 배포, 테스트)마다 달라져
 * 같은 값이 환경에 따라 다른 시각으로 저장·표시된다. 스프링 컨텍스트를 쓰는 테스트에도 같이 적용된다.
 * 응답 시각에 붙는 오프셋은 이 시간대를 기준으로 한다({@link OffsetLocalDateTimeSerializer}).
 */
@Configuration
public class TimeConfig {

    @PostConstruct
    void useUtc() {
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
    }
}
