package com.testmoa.backend.service.impl;

import com.testmoa.backend.dto.response.VersionComparisonResponse;
import com.testmoa.backend.global.client.AnalysisClient;
import com.testmoa.backend.global.client.AnalysisClient.ComparisonResponse;
import com.testmoa.backend.service.SubscriptionChecker;
import com.testmoa.backend.service.VersionComparisonLimiter;
import com.testmoa.backend.service.VersionComparisonReader;
import com.testmoa.backend.service.VersionComparisonReader.ComparisonTarget;
import com.testmoa.backend.service.VersionComparisonService;
import com.testmoa.backend.service.VersionComparisonWriter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

// 분석 서버를 기다리는 동안 DB 연결을 잡지 않도록 이 서비스에는 트랜잭션을 두지 않음.
// 조회와 요청 만들기는 VersionComparisonReader의 읽기 트랜잭션, 결과 저장은 VersionComparisonWriter의 쓰기 트랜잭션에서 끝냄
@Service
@RequiredArgsConstructor
public class VersionComparisonServiceImpl implements VersionComparisonService {

    private final SubscriptionChecker subscriptionChecker;
    private final VersionComparisonReader versionComparisonReader;
    private final VersionComparisonWriter versionComparisonWriter;
    private final VersionComparisonLimiter versionComparisonLimiter;
    private final AnalysisClient analysisClient;

    /**
     * 직전 버전이 없거나 분석 전 버전이 있으면 한도를 쓰기 전에 거절함. 결과를 받지 못하면 쓴 횟수를 되돌림
     */
    @Override
    public VersionComparisonResponse compare(Long userId, Long recruitmentId) {
        subscriptionChecker.require(userId);

        ComparisonTarget target = versionComparisonReader.readTarget(userId, recruitmentId);

        LocalDate countedIn = versionComparisonLimiter.acquire(userId);
        ComparisonResponse result;
        try {
            result = analysisClient.compare(target.request());
        } catch (RuntimeException e) {
            versionComparisonLimiter.release(userId, countedIn);
            throw e;
        }

        versionComparisonWriter.save(target, result);
        return versionComparisonReader.readResult(userId, recruitmentId);
    }

    @Override
    public VersionComparisonResponse find(Long userId, Long recruitmentId) {
        subscriptionChecker.require(userId);
        return versionComparisonReader.readResult(userId, recruitmentId);
    }
}
