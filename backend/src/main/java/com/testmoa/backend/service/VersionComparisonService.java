package com.testmoa.backend.service;

import com.testmoa.backend.dto.response.VersionComparisonResponse;

/**
 * AI 버전 간 비교
 */
public interface VersionComparisonService {
    // 내 모집글(현재 버전)을 같은 프로젝트의 직전 버전과 비교하고 저장함. 구독자만, 일주일에 3번까지
    VersionComparisonResponse compare(Long userId, Long recruitmentId);

    // 저장된 비교 결과. 구독자만
    VersionComparisonResponse find(Long userId, Long recruitmentId);
}
