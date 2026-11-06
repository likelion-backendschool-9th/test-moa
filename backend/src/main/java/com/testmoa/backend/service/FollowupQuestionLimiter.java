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
        LocalDate[] countedOn = new LocalDate[1];
        usages.compute(userId, (id, usage) -> {
            // 날짜를 읽은 뒤 멈췄다 재개한 요청이면 이미 다음 날 기록이 있을 수 있음. 그 기록을 덮어쓰지 않고 그 날에 셈
            LocalDate day = usage != null && usage.date().isAfter(today) ? usage.date() : today;
            int used = usage == null || !usage.date().equals(day) ? 0 : usage.count();
            if (used >= DAILY_LIMIT) throw new BusinessException(ErrorCode.FOLLOWUP_LIMIT_EXCEEDED);
            countedOn[0] = day;
            return new Usage(day, used + 1);
        });
        return countedOn[0];
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
    // 오늘보다 앞선 기록만 지우고, 정리한 날은 앞으로만 감. 지연된 이전 날짜 요청이 새 날짜 기록을 지우거나 정리한 날을 되돌리지 못하게
    private void pruneBefore(LocalDate today) {
        LocalDate pruned = prunedOn;
        if (pruned != null && !today.isAfter(pruned)) return;
        synchronized (this) {
            if (prunedOn != null && !today.isAfter(prunedOn)) return;
            usages.values().removeIf(usage -> usage.date().isBefore(today));
            prunedOn = today;
        }
    }

    // 테스트에서 지난 기록이 지워졌는지 볼 때 씀
    int trackedUsers() {
        return usages.size();
    }

    private record Usage(LocalDate date, int count) {}
}
