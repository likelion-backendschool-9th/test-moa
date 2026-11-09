package com.testmoa.backend.entity.enums;

// 제재 종류(#86)
public enum SanctionType {
    WARNING,     // 경고. 아무 기능도 막지 않는 기록
    SUSPENSION,  // 기간 정지. 종료 일시가 지나면 풀린다
    PERMANENT    // 영구 정지. 운영자가 해제할 때까지
}
