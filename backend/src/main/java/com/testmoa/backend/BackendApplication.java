package com.testmoa.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.util.TimeZone;

@SpringBootApplication
public class BackendApplication {

    /**
     * 서버(JVM)의 기본 시간대를 UTC로 고정한다. 설정이 없으면 실행 환경(IDE, 도커, 배포, 테스트)마다 달라져
     * 같은 값이 환경에 따라 다른 시각으로 저장·표시된다. 컨텍스트와 로깅이 시작되기 전에 실행되어야 해서
     * 빈이 아니라 static 블록에 둔다. main과 모든 테스트(슬라이스 포함)가 이 클래스를 읽는다.
     * 응답 시각에 붙는 오프셋은 이 시간대를 기준으로 한다({@code OffsetLocalDateTimeSerializer}).
     */
    static {
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
    }

    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);
    }

}
