package com.testmoa.backend.entity.enums;

// 신고 대상 종류. 신고는 reports 한 테이블에 모으고 이 값과 target_id로 대상을 구분한다
public enum ReportTargetType {
    FEEDBACK,     // 피드백. 신고는 피드백 신고 API(#175)가 받는다
    RECRUITMENT,  // 모집 글
    USER,         // 회원
    CHAT          // 채팅방
}
