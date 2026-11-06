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

    // 소셜 로그인·계정 연동
    OAUTH_FAILED(HttpStatus.UNAUTHORIZED, "소셜 로그인에 실패했어요. 다시 시도해 주세요"),
    OAUTH_EMAIL_REQUIRED(HttpStatus.BAD_REQUEST, "확인된 이메일이 없는 계정이에요. 소셜 계정에서 이메일을 확인한 뒤 다시 시도해 주세요"),
    INVALID_SIGNUP_TOKEN(HttpStatus.UNAUTHORIZED, "가입 시간이 지났어요. 소셜 로그인을 다시 해 주세요"),
    ACCOUNT_ALREADY_LINKED(HttpStatus.CONFLICT, "다른 회원에 이미 연동된 소셜 계정이에요"),
    EMAIL_ACCOUNT_EXISTS(HttpStatus.CONFLICT, "이미 이메일로 가입한 계정이에요. 이메일로 로그인한 뒤 마이페이지에서 연동해 주세요"),
    PROVIDER_ALREADY_LINKED(HttpStatus.CONFLICT, "이미 같은 서비스의 다른 계정이 연동돼 있어요"),
    LAST_LOGIN_METHOD(HttpStatus.CONFLICT, "마지막 로그인 방법은 해제할 수 없어요"),

    // 구독
    SUBSCRIPTION_REQUIRED(HttpStatus.FORBIDDEN, "구독한 회원만 쓸 수 있어요");

    private final HttpStatus status;
    private final String message;
}
