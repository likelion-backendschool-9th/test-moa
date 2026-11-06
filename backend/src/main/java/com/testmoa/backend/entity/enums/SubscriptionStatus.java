package com.testmoa.backend.entity.enums;

// 구독 상태
public enum SubscriptionStatus {
    ACTIVE,     // 구독 중(아직 시작 전인 미리 결제 기간도 ACTIVE)
    EXPIRED,    // 만료. 저장할 때 쓰지 않음(기간은 날짜로 판단). 남길지 뺄지는 미결
    CANCELLED   // 환불로 취소됨
}
