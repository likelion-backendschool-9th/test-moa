package com.testmoa.backend.service;

import com.testmoa.backend.dto.request.AnalysisGroupUpdateRequest;
import com.testmoa.backend.dto.response.GroupReviewResponse;
import com.testmoa.backend.dto.response.PraiseReviewResponse;
import com.testmoa.backend.dto.response.ReviewAnalysisResponse;

import java.util.List;

/**
 * AI 리뷰 묶기·우선순위
 */
public interface ReviewAnalysisService {
    // 내 모집글의 리뷰 분석을 시작하고 바로 돌아옴. 분석은 따로 돌고 결과는 조회로 봄. 구독자만, 일주일에 3번까지
    ReviewAnalysisResponse start(Long userId, Long recruitmentId);

    // 분석 상태와 저장된 결과. 구독자만
    ReviewAnalysisResponse find(Long userId, Long recruitmentId);
    // AI가 칭찬으로 묶은 리뷰 목록. 구독자만
    List<PraiseReviewResponse> findPraises(Long userId, Long recruitmentId);

    // 분석 그룹 하나에 든 리뷰 목록. 대표 리뷰가 먼저. 구독자만
    List<GroupReviewResponse> findGroupReviews(Long userId, Long recruitmentId, Long groupId);

    // 그룹의 이슈 초안을 프로젝트에 연결된 GitHub 레포에 이슈로 등록함. 구독자만
    ReviewAnalysisResponse registerIssue(Long userId, Long recruitmentId, Long groupId);

    // 개발자가 그룹 이름·심각도·이슈 초안을 고침. 구독자만
    ReviewAnalysisResponse editGroup(Long userId, Long recruitmentId, Long groupId, AnalysisGroupUpdateRequest request);
}
