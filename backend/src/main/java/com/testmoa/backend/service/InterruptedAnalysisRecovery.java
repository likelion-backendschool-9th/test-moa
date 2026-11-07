package com.testmoa.backend.service;

import com.testmoa.backend.entity.enums.AnalysisStatus;
import com.testmoa.backend.repository.RecruitmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 서버가 다시 시작되면 진행 중(PENDING)이던 리뷰 묶기는 끝나지 않음. PENDING이 남으면 그 모집글은 다시 분석할 수 없어서
 * 서버가 뜰 때 모두 FAILED로 바꿈. 지난 결과(analyzed_at)는 그대로라 버전 비교는 계속 쓸 수 있음.
 * 서버가 한 대일 때 맞는 방법이고, 여러 대가 되면 접수 시각(analysis_requested_at)이 오래된 PENDING만 정리해야 함
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class InterruptedAnalysisRecovery {
    private final RecruitmentRepository recruitmentRepository;

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void failInterruptedAnalyses() {
        int failed = recruitmentRepository.failAllPendingAnalyses(AnalysisStatus.PENDING, AnalysisStatus.FAILED);
        if (failed > 0) log.warn("서버 재시작으로 끝나지 않은 리뷰 분석 {}건을 FAILED로 바꿈", failed);
    }
}
