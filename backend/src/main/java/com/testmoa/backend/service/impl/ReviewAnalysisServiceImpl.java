package com.testmoa.backend.service.impl;

import com.testmoa.backend.dto.request.AnalysisGroupUpdateRequest;
import com.testmoa.backend.dto.response.ReviewAnalysisResponse;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.service.ReviewAnalysisLimiter;
import com.testmoa.backend.service.ReviewAnalysisReader;
import com.testmoa.backend.service.ReviewAnalysisReader.AnalysisTarget;
import com.testmoa.backend.service.ReviewAnalysisService;
import com.testmoa.backend.service.ReviewAnalysisWorker;
import com.testmoa.backend.service.ReviewAnalysisWriter;
import com.testmoa.backend.service.SubscriptionChecker;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

// 분석 서버는 분석 전용 스레드(ReviewAnalysisWorker)에서 부르고, 이 서비스에는 트랜잭션을 두지 않음.
// 조회는 ReviewAnalysisReader의 읽기 트랜잭션, 상태 바꾸기와 저장은 ReviewAnalysisWriter의 쓰기 트랜잭션에서 끝냄
@Slf4j
@Service
@RequiredArgsConstructor
public class ReviewAnalysisServiceImpl implements ReviewAnalysisService {

    private final SubscriptionChecker subscriptionChecker;
    private final ReviewAnalysisReader reviewAnalysisReader;
    private final ReviewAnalysisWriter reviewAnalysisWriter;
    private final ReviewAnalysisWorker reviewAnalysisWorker;
    private final ReviewAnalysisLimiter reviewAnalysisLimiter;

    /**
     * 리뷰가 없으면 한도를 쓰기 전에 거절함. 이미 진행 중이거나 분석 스레드 대기열이 차서 시작하지 못하면 쓴 횟수를 되돌림.
     * PENDING으로 바꾼 트랜잭션이 끝난 뒤 분석을 넘겨서, 분석 스레드는 바뀐 상태를 봄
     */
    @Override
    public ReviewAnalysisResponse start(Long userId, Long recruitmentId) {
        subscriptionChecker.require(userId);

        AnalysisTarget target = reviewAnalysisReader.readTarget(userId, recruitmentId);

        LocalDate countedIn = reviewAnalysisLimiter.acquire(userId);
        try {
            reviewAnalysisWriter.markPending(target.recruitmentId());
        } catch (RuntimeException e) {
            reviewAnalysisLimiter.release(userId, countedIn);
            throw e;
        }

        try {
            reviewAnalysisWorker.analyze(target, userId, countedIn);
        } catch (TaskRejectedException e) {
            log.warn("분석 스레드 대기열이 차서 리뷰 분석을 시작하지 못함 recruitmentId={}", target.recruitmentId());
            reviewAnalysisWriter.markFailed(target.recruitmentId());
            reviewAnalysisLimiter.release(userId, countedIn);
            throw new BusinessException(ErrorCode.AI_UNAVAILABLE);
        }
        return reviewAnalysisReader.readResult(userId, recruitmentId);
    }

    @Override
    public ReviewAnalysisResponse find(Long userId, Long recruitmentId) {
        subscriptionChecker.require(userId);
        return reviewAnalysisReader.readResult(userId, recruitmentId);
    }

    @Override
    public ReviewAnalysisResponse editGroup(Long userId, Long recruitmentId, Long groupId, AnalysisGroupUpdateRequest request) {
        subscriptionChecker.require(userId);
        reviewAnalysisWriter.editGroup(userId, recruitmentId, groupId, request);
        return reviewAnalysisReader.readResult(userId, recruitmentId);
    }
}
