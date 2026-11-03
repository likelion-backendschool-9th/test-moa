package com.testmoa.backend.global.common;

// 현금화 요청 처리 상태. 지급 완료는 PAID만 쓴다
public enum CashoutStatus {
    REQUESTED,  // 요청(처리 중)
    PAID,       // 지급 완료
    REJECTED    // 반려
}
