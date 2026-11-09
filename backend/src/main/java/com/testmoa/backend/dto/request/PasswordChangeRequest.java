package com.testmoa.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * 비밀번호 변경. 이메일 로그인 계정이 없는 소셜 회원은 currentPassword 없이 비밀번호를 만든다.
 * 새 비밀번호 규칙과 문구는 이메일 가입(SignupRequest)과 같다
 */
public record PasswordChangeRequest(
        String currentPassword,

        @NotBlank(message = "새 비밀번호를 입력해 주세요")
        @Pattern(regexp = "^$|^(?=.*[a-zA-Z])(?=.*\\d)[\\x21-\\x7E]{8,64}$", message = "영문·숫자·특수문자로, 영문과 숫자를 섞어 8~64자로 써 주세요")
        String newPassword
) {}
