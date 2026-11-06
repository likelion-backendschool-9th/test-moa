package com.testmoa.backend.global.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

/**
 * 실패 응답의 에러 코드. 응답의 error.code에는 이름(name)이 그대로 내려간다.
 * 기능별 코드(EMAIL_TAKEN 등)는 그 기능을 만들 때 여기에 더한다
 */
@Getter
@RequiredArgsConstructor
public enum ErrorCode {
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "입력값을 확인해 주세요"),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "로그인이 필요해요"),
    FORBIDDEN(HttpStatus.FORBIDDEN, "권한이 없어요"),
    NOT_FOUND(HttpStatus.NOT_FOUND, "찾을 수 없어요"),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "잠시 후 다시 시도해 주세요"),

    // 회원·인증. 문구는 프론트 화면 문구와 같다
    EMAIL_TAKEN(HttpStatus.CONFLICT, "이미 가입한 이메일이에요"),
    NICKNAME_TAKEN(HttpStatus.CONFLICT, "이미 쓰고 있는 닉네임이에요"),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호가 맞지 않아요"),
    SUSPENDED(HttpStatus.FORBIDDEN, "이용이 정지된 계정이에요"),
    INVALID_REFRESH_TOKEN(HttpStatus.UNAUTHORIZED, "다시 로그인해 주세요"),

    // 구독
    SUBSCRIPTION_REQUIRED(HttpStatus.FORBIDDEN, "구독한 회원만 쓸 수 있어요"),

    // AI 분석
    AI_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "AI 분석을 잠시 쓸 수 없어요. 잠시 후 다시 시도해 주세요"),
    FOLLOWUP_LIMIT_EXCEEDED(HttpStatus.TOO_MANY_REQUESTS, "오늘 쓸 수 있는 질문 추천을 모두 썼어요. 내일 다시 써 주세요");

    private final HttpStatus status;
    private final String message;
}
