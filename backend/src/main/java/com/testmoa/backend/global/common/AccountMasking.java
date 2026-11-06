package com.testmoa.backend.global.common;

/**
 * 출금 계좌 응답 마스킹. 처리 중(REQUESTED)은 전체.
 * 완료(PAID·REJECTED)는 계좌번호 끝 4자리, 예금주는 앞·뒤 글자만 남긴다.
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

    /**
     * 완료 건 예금주. 한 글자는 `*`, 두 글자는 앞 글자만, 세 글자 이상은 앞·뒤만 남긴다.
     * 예: 김철 → 김*, 한서윤 → 한*윤
     */
    public static String maskHolder(String accountHolder, CashoutStatus status) {
        if (accountHolder == null) {
            return null;
        }
        if (status == CashoutStatus.REQUESTED) {
            return accountHolder;
        }
        int length = accountHolder.codePointCount(0, accountHolder.length());
        if (length <= 1) {
            return "*";
        }
        int firstEnd = accountHolder.offsetByCodePoints(0, 1);
        String first = accountHolder.substring(0, firstEnd);
        if (length == 2) {
            return first + "*";
        }
        int lastStart = accountHolder.offsetByCodePoints(0, length - 1);
        return first + "*".repeat(length - 2) + accountHolder.substring(lastStart);
    }
}
