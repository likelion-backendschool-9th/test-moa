package com.testmoa.backend.global.common;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

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
        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "type은 all, in, out 중 하나여야 합니다: " + type
        );
    }
}
