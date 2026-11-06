package com.testmoa.backend.service;

import com.testmoa.backend.global.exception.ErrorCode;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;

/**
 * AI 리뷰 묶기의 한 주 사용 횟수(개발자 1인당 3번). 버전 비교와 따로 세고, 서울 시간 월요일 0시에 다시 셈.
 * 서버 메모리에 두므로 서버를 다시 시작하면 처음부터 세고, 서버가 여러 대면 대마다 따로 셈
 */
@Component
public class ReviewAnalysisLimiter extends PeriodUsageLimiter {
    public static final int WEEKLY_LIMIT = 3;

    public ReviewAnalysisLimiter() {
        this(Clock.system(ZoneId.of("Asia/Seoul")));
    }

    ReviewAnalysisLimiter(Clock clock) {
        super(clock, WEEKLY_LIMIT, ErrorCode.ANALYSIS_LIMIT_EXCEEDED);
    }

    @Override
    protected LocalDate periodStart(LocalDate today) {
        return mondayOf(today);
    }
}
