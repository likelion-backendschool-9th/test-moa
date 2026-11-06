package com.testmoa.backend.dto.request;

import jakarta.validation.constraints.NotBlank;

/**
 * 제공자가 돌려준 code. redirectUri는 동의 화면 주소를 만들 때 쓴 값과 같아야 제공자가 받아 준다
 */
public record OAuthCodeRequest(
        @NotBlank String code,
        @NotBlank String redirectUri
) {}
