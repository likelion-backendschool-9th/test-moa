package com.testmoa.backend.global.common;

import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;

/**
 * 크레딧 내역 필터. URL query type 값과 같다.
 */
public enum LedgerFlow {
    ALL,
    IN,
    OUT;

    public static LedgerFlow fromQuery(String type) {
        if (type == null || type.isBlank() || "all".equalsIgnoreCase(type)) {
            return ALL;
        }
        if ("in".equalsIgnoreCase(type)) {
            return IN;
        }
        if ("out".equalsIgnoreCase(type)) {
            return OUT;
        }
        throw new BusinessException(
                ErrorCode.INVALID_INPUT,
                "type은 all, in, out 중 하나여야 합니다: " + type
        );
    }
}
