package com.testmoa.backend.global.common;

/**
 * 출금 계좌번호 응답 마스킹. 처리 중(REQUESTED)은 전체, 완료(PAID·REJECTED)는 끝 4자리.
 */
public final class AccountMasking {

    private AccountMasking() {}

    public static String mask(String accountNumber, CashoutStatus status) {
        if (accountNumber == null) {
            return null;
        }
        if (status == CashoutStatus.REQUESTED) {
            return accountNumber;
        }
        if (accountNumber.length() <= 4) {
            return "****";
        }
        return "****" + accountNumber.substring(accountNumber.length() - 4);
    }
}
