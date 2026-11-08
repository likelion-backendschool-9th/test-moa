package com.testmoa.backend.service;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;

/**
 * 구독 이용 기간의 끝 시각 규칙. 결제 화면 조회(#70)와 결제 실행(#71)이 같이 쓴다.
 * 만료는 한국 날짜의 끝(23:59:59)이다. 시각은 다른 코드처럼 서버 시간대의 값으로 저장하므로,
 * 한국 날짜의 끝을 서버 시간대로 바꿔 돌려준다(서버가 UTC면 14:59:59).
 */
public final class SubscriptionTime {

    static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    private static final LocalTime END_OF_DAY = LocalTime.of(23, 59, 59);

    private SubscriptionTime() {
    }

    /**
     * 이용 끝 = (시작이 속한 한국 날짜 + periodDays일)의 23:59:59.
     * 이어 붙은 기간은 앞 기간의 끝(한국 날짜의 23:59:59)에서 시작해도 그 한국 날짜가 기준이라 매번 periodDays일씩 늘어난다.
     */
    public static LocalDateTime endAt(LocalDateTime startAt, int periodDays) {
        return endAt(startAt, periodDays, ZoneId.systemDefault());
    }

    static LocalDateTime endAt(LocalDateTime startAt, int periodDays, ZoneId serverZone) {
        return startAt.atZone(serverZone)
                .withZoneSameInstant(SEOUL)
                .toLocalDate()
                .plusDays(periodDays)
                .atTime(END_OF_DAY)
                .atZone(SEOUL)
                .withZoneSameInstant(serverZone)
                .toLocalDateTime();
    }
}
