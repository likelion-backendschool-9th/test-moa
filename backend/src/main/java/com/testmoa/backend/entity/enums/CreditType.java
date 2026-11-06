package com.testmoa.backend.entity.enums;

// 변동 크레딧 종류. 잠금/해제는 ledger에 남기지 않으므로 LOCKED는 두지 않는다
public enum CreditType {
    EVENT,  // 이벤트
    EARNED  // 적립
}
