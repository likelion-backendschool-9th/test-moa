package com.testmoa.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 처음 소셜 로그인한 사람의 가입. 이름은 출금 예금주 확인에 써서 이메일 가입처럼 필수다
 */
public record OAuthSignupRequest(
        @NotBlank String signupToken,

        @NotBlank(message = "이름을 입력해 주세요")
        @Size(max = 20, message = "이름은 20자까지 쓸 수 있어요")
        String name
) {}
