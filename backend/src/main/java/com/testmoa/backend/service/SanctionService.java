package com.testmoa.backend.service;

import com.testmoa.backend.dto.response.MySanctionResponse;

import java.util.List;

/**
 * 회원 본인의 제재 조회(#86)
 */
public interface SanctionService {
    // 내가 받은 경고·정지, 최근 순. 제재한 운영자·신고자·증거는 없다
    List<MySanctionResponse> getMine(Long userId);
}
