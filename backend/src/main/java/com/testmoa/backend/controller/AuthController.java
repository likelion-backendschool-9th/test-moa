package com.testmoa.backend.controller;

import com.testmoa.backend.domain.dto.request.LoginRequest;
import com.testmoa.backend.domain.dto.request.RefreshTokenRequest;
import com.testmoa.backend.domain.dto.request.SignupRequest;
import com.testmoa.backend.domain.dto.response.TokenResponse;
import com.testmoa.backend.global.common.ApiResponse;
import com.testmoa.backend.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @Operation(summary = "이메일 회원가입")
    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Void> signup(@Valid @RequestBody SignupRequest request) {
        authService.signup(request);

        return ApiResponse.ok();
    }

    @Operation(summary = "이메일 로그인", description = "응답의 accessToken을 Swagger 오른쪽 위 Authorize에 넣으면 로그인이 필요한 API를 시험할 수 있다")
    @PostMapping("/login")
    public ApiResponse<TokenResponse> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.ok(authService.login(request));
    }

    @Operation(summary = "토큰 갱신", description = "쓴 refresh 토큰은 버려지고 새 토큰 쌍이 나간다")
    @PostMapping("/refresh")
    public ApiResponse<TokenResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ApiResponse.ok(authService.refresh(request.refreshToken()));
    }

    @Operation(summary = "로그아웃", description = "refresh 토큰을 버린다. access 토큰은 만료(30분)까지 남으므로 Next가 쿠키를 지운다")
    @PostMapping("/logout")
    public ApiResponse<Void> logout(@Valid @RequestBody RefreshTokenRequest request) {
        authService.logout(request.refreshToken());

        return ApiResponse.ok();
    }
}
