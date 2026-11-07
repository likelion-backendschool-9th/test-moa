package com.testmoa.backend.entity.enums;

// 피드백 분석 그룹의 카테고리
public enum ClusterCategory {
    BUG,            // 고쳐야 할 문제
    UX,             // 쓰기 불편한 점
    REQUEST,        // 기능 요청
    PRAISE,         // 칭찬
    UNCLASSIFIED;   // 어느 그룹에도 들지 않은 리뷰

    // 심각도와 GitHub 이슈 초안이 있는 카테고리인지. 칭찬·미분류는 없다
    public boolean hasIssue() {
        return this != PRAISE && this != UNCLASSIFIED;
    }
}
