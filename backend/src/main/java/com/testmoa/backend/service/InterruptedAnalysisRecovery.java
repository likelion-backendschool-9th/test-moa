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
 * 서버가 뜰 때 모두 FAILED로 바꿈. 서버가 한 대일 때 맞는 방법이고, 여러 대가 되면 분석 시작 시각으로 판단해야 함
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
