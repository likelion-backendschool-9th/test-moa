package com.testmoa.backend.entity.enums;

// 출금 요청 반려 사유. 사유 라벨은 고정 문구이고, 반려 메모는 모든 사유에서 회원에게 보인다. OTHER만 메모가 필수다
public enum CashoutRejectReason {
    HOLDER,   // 예금주 이름이 회원 정보와 달라요
    ACCOUNT,  // 계좌번호를 확인할 수 없어요
    OTHER     // 기타
}
