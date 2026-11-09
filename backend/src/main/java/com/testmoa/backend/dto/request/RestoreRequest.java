package com.testmoa.backend.dto.request;

import jakarta.validation.constraints.NotBlank;

/** 탈퇴 되돌리기(#84). 로그인 응답(403 WITHDRAWAL_PENDING)의 error.fields.restoreToken */
public record RestoreRequest(@NotBlank(message = "되돌리기 토큰이 없어요") String restoreToken) {}
