package com.testmoa.backend.entity.enums;

import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;

/**
 * 운영자 출금 목록 탭. URL query tab 값과 같다.
 */
public enum CashoutTab {
    PENDING,
    DONE;

    public static CashoutTab fromQuery(String tab) {
        if (tab == null || tab.isBlank() || "pending".equalsIgnoreCase(tab)) {
            return PENDING;
        }
        if ("done".equalsIgnoreCase(tab)) {
            return DONE;
        }
        throw new BusinessException(ErrorCode.INVALID_INPUT, "tab은 pending, done 중 하나여야 합니다: " + tab);
    }
}
