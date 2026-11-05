package com.testmoa.backend.global.common;

// 출금 요청 반려 사유. OTHER면 반려 메모가 회원에게 보이는 사유가 된다
public enum CashoutRejectReason {
    HOLDER,   // 예금주 이름이 회원 정보와 달라요
    ACCOUNT,  // 계좌번호를 확인할 수 없어요
    OTHER     // 기타
}
