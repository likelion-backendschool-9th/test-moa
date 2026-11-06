package com.testmoa.backend.service;

import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.concurrent.ConcurrentHashMap;

/**
 * AI 후속 질문 추천의 하루 사용 횟수(1인당 3번). 서울 시간 자정에 다시 셈.
 * 서버 메모리에 두므로 서버를 다시 시작하면 처음부터 세고, 서버가 여러 대면 대마다 따로 셈
 */
@Component
public class FollowupQuestionLimiter {
    public static final int DAILY_LIMIT = 3;

    private final Clock clock;
    private final ConcurrentHashMap<Long, Usage> usages = new ConcurrentHashMap<>();
    // 지난 날짜의 기록을 마지막으로 지운 날
    private volatile LocalDate prunedOn;

    public FollowupQuestionLimiter() {
        this(Clock.system(ZoneId.of("Asia/Seoul")));
    }

    FollowupQuestionLimiter(Clock clock) {
        this.clock = clock;
    }

    /**
     * 한 번 쓰고, 센 날을 돌려줌. 오늘 다 썼으면 429 FOLLOWUP_LIMIT_EXCEEDED.
     * 동시에 들어온 요청이 한도를 넘지 않도록 분석 서버를 부르기 전에 먼저 셈
     */
    public LocalDate acquire(Long userId) {
        LocalDate today = LocalDate.now(clock);
        pruneBefore(today);
        usages.compute(userId, (id, usage) -> {
            int used = usage == null || !usage.date().equals(today) ? 0 : usage.count();
            if (used >= DAILY_LIMIT) throw new BusinessException(ErrorCode.FOLLOWUP_LIMIT_EXCEEDED);
            return new Usage(today, used + 1);
        });
        return today;
    }

    /**
     * 질문을 받지 못한 요청의 횟수를 되돌림. 자정을 넘겨 실패하면 다음 날 횟수는 건드리지 않음
     *
     * @param day acquire가 돌려준 날
     */
    public void release(Long userId, LocalDate day) {
        usages.computeIfPresent(userId, (id, usage) ->
                usage.date().equals(day) && usage.count() > 0 ? new Usage(day, usage.count() - 1) : usage);
    }

    // 날이 바뀐 뒤 처음 셀 때 지난 날짜의 기록을 지움. 쓴 적 있는 회원이 계속 쌓이지 않게
    private void pruneBefore(LocalDate today) {
        if (today.equals(prunedOn)) return;
        usages.values().removeIf(usage -> !usage.date().equals(today));
        prunedOn = today;
    }

    // 테스트에서 지난 기록이 지워졌는지 볼 때 씀
    int trackedUsers() {
        return usages.size();
    }

    private record Usage(LocalDate date, int count) {}
}
