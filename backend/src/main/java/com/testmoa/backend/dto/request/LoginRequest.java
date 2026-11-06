package com.testmoa.backend.dto.request;

import jakarta.validation.constraints.NotBlank;

/**
 * 이메일 로그인 요청. 형식이 틀린 이메일도 "맞지 않아요"로 같이 처리하므로 빈 칸만 검사한다
 */
public record LoginRequest(
        @NotBlank(message = "이메일을 입력해 주세요")
        String email,

        @NotBlank(message = "비밀번호를 입력해 주세요")
        String password
) {}
