package com.testmoa.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * 내 정보 수정(이름·닉네임). 규칙과 문구는 이메일 가입(SignupRequest)과 같다
 */
public record ProfileUpdateRequest(
        @NotBlank(message = "이름을 입력해 주세요")
        @Size(max = 20, message = "이름은 20자까지 쓸 수 있어요")
        String name,

        @NotBlank(message = "닉네임을 입력해 주세요")
        @Pattern(regexp = "^$|^[가-힣a-zA-Z0-9]{1,39}$", message = "닉네임은 한글·영문·숫자 1~39자예요")
        String nickname
) {}
