package com.testmoa.backend.repository.projection;

/** 분석 그룹 하나의 리뷰 수와 테스터 수. 저장하지 않고 feedback_clusters로 센다. */
public record GroupFeedbackStats(Long groupId, long feedbackCount, long testerCount) {}
