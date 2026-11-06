package com.testmoa.backend.service;

import com.testmoa.backend.global.exception.ErrorCode;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;

/**
 * AI 후속 질문 추천의 하루 사용 횟수(1인당 3번). 서울 시간 자정에 다시 셈.
 * 서버 메모리에 두므로 서버를 다시 시작하면 처음부터 세고, 서버가 여러 대면 대마다 따로 셈
 */
@Component
public class FollowupQuestionLimiter extends PeriodUsageLimiter {
    public static final int DAILY_LIMIT = 3;

    public FollowupQuestionLimiter() {
        this(Clock.system(ZoneId.of("Asia/Seoul")));
    }

    FollowupQuestionLimiter(Clock clock) {
        super(clock, DAILY_LIMIT, ErrorCode.FOLLOWUP_LIMIT_EXCEEDED);
    }

    // 하루 단위로 셈
    @Override
    protected LocalDate periodStart(LocalDate today) {
        return today;
    }
}
