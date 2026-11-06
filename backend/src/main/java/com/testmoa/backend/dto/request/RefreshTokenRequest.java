package com.testmoa.backend.dto.request;

import jakarta.validation.constraints.NotBlank;

/**
 * 토큰 갱신·로그아웃 요청
 */
public record RefreshTokenRequest(
        @NotBlank(message = "refresh 토큰이 없어요")
        String refreshToken
) {}
