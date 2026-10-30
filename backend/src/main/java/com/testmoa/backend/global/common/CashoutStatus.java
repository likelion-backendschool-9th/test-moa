package com.testmoa.backend.global.common;

// 현금화 요청 처리 상태
public enum CashoutStatus {
    REQUESTED,  // 요청
    PAID,       // 지급
    COMPLETED,  // 완료
    REJECTED    // 반려
}
