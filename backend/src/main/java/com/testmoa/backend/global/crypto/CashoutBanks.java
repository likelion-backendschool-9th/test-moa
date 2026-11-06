package com.testmoa.backend.global.crypto;

import java.util.Set;

/**
 * 출금 신청에 허용하는 은행 이름. 프론트 BANKS와 같다.
 */
public final class CashoutBanks {

    public static final Set<String> NAMES = Set.of(
            "국민은행",
            "신한은행",
            "우리은행",
            "하나은행",
            "농협은행",
            "카카오뱅크",
            "토스뱅크"
    );

    private CashoutBanks() {}

    public static boolean isAllowed(String bank) {
        return bank != null && NAMES.contains(bank);
    }
}
