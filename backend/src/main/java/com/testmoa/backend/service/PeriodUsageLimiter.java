package com.testmoa.backend.service;

import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;

import java.time.Clock;
import java.time.LocalDate;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 회원별 기간 사용 횟수. 기간(하루, 한 주)은 그 기간의 첫날로 구분하고, 기간이 바뀌면 다시 셈.
 * 서버 메모리에 두므로 서버를 다시 시작하면 처음부터 세고, 서버가 여러 대면 대마다 따로 셈
 */
public abstract class PeriodUsageLimiter {
    private final Clock clock;
    private final int limit;
    private final ErrorCode limitExceeded;
    private final ConcurrentHashMap<Long, Usage> usages = new ConcurrentHashMap<>();
    // 지난 기간의 기록을 마지막으로 지운 기간
    private volatile LocalDate prunedOn;

    protected PeriodUsageLimiter(Clock clock, int limit, ErrorCode limitExceeded) {
        this.clock = clock;
        this.limit = limit;
        this.limitExceeded = limitExceeded;
    }

    // 오늘이 속한 기간의 첫날
    protected abstract LocalDate periodStart(LocalDate today);

    /**
     * 한 번 쓰고, 센 기간을 돌려줌. 이번 기간에 다 썼으면 limitExceeded 오류.
     * 동시에 들어온 요청이 한도를 넘지 않도록 분석 서버를 부르기 전에 먼저 셈
     */
    public LocalDate acquire(Long userId) {
        LocalDate current = periodStart(LocalDate.now(clock));
        pruneBefore(current);
        LocalDate[] countedIn = new LocalDate[1];
        usages.compute(userId, (id, usage) -> {
            // 기간을 읽은 뒤 멈췄다 재개한 요청이면 이미 다음 기간 기록이 있을 수 있음. 그 기록을 덮어쓰지 않고 그 기간에 셈
            LocalDate period = usage != null && usage.period().isAfter(current) ? usage.period() : current;
            int used = usage == null || !usage.period().equals(period) ? 0 : usage.count();
            if (used >= limit) throw new BusinessException(limitExceeded);
            countedIn[0] = period;
            return new Usage(period, used + 1);
        });
        return countedIn[0];
    }

    /**
     * 결과를 받지 못한 요청의 횟수를 되돌림. 기간을 넘겨 실패하면 다음 기간 횟수는 건드리지 않음
     *
     * @param period acquire가 돌려준 기간
     */
    public void release(Long userId, LocalDate period) {
        usages.computeIfPresent(userId, (id, usage) ->
                usage.period().equals(period) && usage.count() > 0 ? new Usage(period, usage.count() - 1) : usage);
    }

    // 기간이 바뀐 뒤 처음 셀 때 지난 기간의 기록을 지움. 쓴 적 있는 회원이 계속 쌓이지 않게
    // 이번 기간보다 앞선 기록만 지우고, 정리한 기간은 앞으로만 감. 지연된 이전 기간 요청이 새 기간 기록을 지우거나 정리한 기간을 되돌리지 못하게
    private void pruneBefore(LocalDate current) {
        LocalDate pruned = prunedOn;
        if (pruned != null && !current.isAfter(pruned)) return;
        synchronized (this) {
            if (prunedOn != null && !current.isAfter(prunedOn)) return;
            usages.values().removeIf(usage -> usage.period().isBefore(current));
            prunedOn = current;
        }
    }

    // 테스트에서 지난 기록이 지워졌는지 볼 때 씀
    int trackedUsers() {
        return usages.size();
    }

    private record Usage(LocalDate period, int count) {}
}
