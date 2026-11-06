package com.testmoa.backend.global.exception;

import lombok.Getter;

import java.util.Map;

/**
 * 서비스에서 규칙 위반을 알릴 때 던진다. 예) throw new BusinessException(ErrorCode.NOT_FOUND)
 * GlobalExceptionHandler가 에러 코드의 상태와 문구로 응답한다
 */
@Getter
public class BusinessException extends RuntimeException {
    private final ErrorCode errorCode;
    // 입력 칸별 오류 문구(칸 이름 → 문구). 없으면 null
    private final Map<String, String> fields;

    public BusinessException(ErrorCode errorCode) {
        this(errorCode, errorCode.getMessage(), null);
    }

    // 기본 문구 대신 다른 문구를 내려줄 때
    public BusinessException(ErrorCode errorCode, String message) {
        this(errorCode, message, null);
    }

    // 여러 테이블이나 값끼리 비교한 결과를 특정 입력 칸의 오류로 알릴 때
    public BusinessException(ErrorCode errorCode, String message, Map<String, String> fields) {
        super(message);
        this.errorCode = errorCode;
        this.fields = fields;
    }
}
