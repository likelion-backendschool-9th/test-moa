package com.testmoa.backend.domain.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * 이메일 회원가입 요청. 규칙과 문구는 프론트 lib/validation.ts와 같다.
 * 형식 검사(@Pattern)는 빈 값을 통과시켜서, 빈 칸에는 "입력해 주세요" 문구 하나만 나가게 한다
 */
public record SignupRequest(
        @NotBlank(message = "이름을 입력해 주세요")
        @Size(max = 20, message = "이름은 20자까지 쓸 수 있어요")
        String name,

        @NotBlank(message = "닉네임을 입력해 주세요")
        @Pattern(regexp = "^$|^[가-힣a-zA-Z0-9]{1,39}$", message = "닉네임은 한글·영문·숫자 1~39자예요")
        String nickname,

        @NotBlank(message = "이메일을 입력해 주세요")
        @Pattern(regexp = "^$|^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$", message = "이메일 형식이 맞지 않아요")
        String email,

        @NotBlank(message = "비밀번호를 입력해 주세요")
        // 영문·숫자·특수문자(ASCII)만 받는다. 한 글자가 1바이트라 64자여도 BCrypt 한도(72바이트) 안이다
        @Pattern(regexp = "^$|^(?=.*[a-zA-Z])(?=.*\\d)[\\x21-\\x7E]{8,64}$", message = "영문·숫자·특수문자로, 영문과 숫자를 섞어 8~64자로 써 주세요")
        String password
) {}
