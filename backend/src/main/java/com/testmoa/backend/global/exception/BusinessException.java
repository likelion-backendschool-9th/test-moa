package com.testmoa.backend.global.exception;

import lombok.Getter;

/**
 * 서비스에서 규칙 위반을 알릴 때 던진다. 예) throw new BusinessException(ErrorCode.NOT_FOUND)
 * GlobalExceptionHandler가 에러 코드의 상태와 문구로 응답한다
 */
@Getter
public class BusinessException extends RuntimeException {
    private final ErrorCode errorCode;

    public BusinessException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }

    // 기본 문구 대신 다른 문구를 내려줄 때
    public BusinessException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }
}
