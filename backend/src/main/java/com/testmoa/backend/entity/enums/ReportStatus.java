package com.testmoa.backend.entity.enums;

// 신고 처리 상태. 판정은 바꿀 수 없다
public enum ReportStatus {
    PENDING,   // 검토 대기
    REJECTED,  // 기각
    ACCEPTED   // 인정
}
