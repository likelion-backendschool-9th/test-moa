package com.testmoa.backend.entity.enums;

// 모집글의 진행 단계. 저장하지 않고 저장 상태와 마감일로 계산한다(README 정한 것 11, Recruitment.phaseAt)
public enum RecruitmentPhase {
    RECRUITING, // 모집 중: 모집 마감 전
    TESTING,    // 테스트 중: 모집 마감 뒤, 피드백 제출 마감 전
    CLOSED,     // 종료: 제출 마감 뒤, 또는 저장 상태가 모집 중·취소가 아님
    CANCELLED   // 취소
}
