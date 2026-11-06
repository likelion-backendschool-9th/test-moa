package com.testmoa.backend.service;

import com.testmoa.backend.global.client.AnalysisClient;
import com.testmoa.backend.global.client.AnalysisClient.AnalysisResponse;
import com.testmoa.backend.service.ReviewAnalysisReader.AnalysisTarget;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/**
 * 리뷰 묶기를 분석 전용 스레드에서 실행함. 분석 서버를 기다리는 동안 DB 연결을 잡지 않도록 트랜잭션을 두지 않고,
 * 결과 저장과 실패 기록만 ReviewAnalysisWriter의 짧은 쓰기 트랜잭션에서 함
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ReviewAnalysisWorker {
    private final AnalysisClient analysisClient;
    private final ReviewAnalysisWriter reviewAnalysisWriter;
    private final ReviewAnalysisLimiter reviewAnalysisLimiter;

    /**
     * 실패하면(분석 서버 오류, 계약과 다른 응답, 저장 실패) FAILED로 바꾸고 이번 주 횟수를 되돌림.
     * 저장은 한 트랜잭션이라 실패하면 지난 결과가 그대로 남음
     *
     * @param countedIn 한도를 센 주. 실패하면 이 주의 횟수를 되돌림
     */
    @Async("analysisTaskExecutor")
    public void analyze(AnalysisTarget target, Long userId, LocalDate countedIn) {
        try {
            AnalysisResponse response = analysisClient.analyze(target.request());
            reviewAnalysisWriter.save(target, response);
        } catch (RuntimeException e) {
            log.warn("리뷰 분석 실패 recruitmentId={}", target.recruitmentId(), e);
            reviewAnalysisWriter.markFailed(target.recruitmentId());
            reviewAnalysisLimiter.release(userId, countedIn);
        }
    }
}
