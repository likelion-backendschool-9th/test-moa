package com.testmoa.backend.controller;

import com.testmoa.backend.dto.request.OAuthCodeRequest;
import com.testmoa.backend.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import com.testmoa.backend.dto.response.MeResponse;
import com.testmoa.backend.global.util.ApiResponse;
import com.testmoa.backend.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 회원 본인 정보. 모두 로그인이 필요하고, 요청한 회원 id는 토큰에서 꺼낸다(@AuthenticationPrincipal)
 */
@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService userService;
    private final AuthService authService;

    public UserController(UserService userService, AuthService authService) {
        this.userService = userService;
        this.authService = authService;
    }

    @Operation(summary = "내 정보", description = "로그인 필요. 구독 상태(subscription.active)를 함께 준다")
    @GetMapping("/me")
    public ApiResponse<MeResponse> getMe(@Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(userService.getMe(userId));
    }

    @Operation(summary = "소셜 계정 연동", description = "provider: google, github. 연동 화면에서 받은 code를 보낸다. 다른 회원에 연동된 계정이면 409")
    @PostMapping("/me/accounts/{provider}")
    public ApiResponse<Void> linkAccount(@Parameter(hidden = true) @AuthenticationPrincipal Long userId,
                                         @PathVariable String provider,
                                         @Valid @RequestBody OAuthCodeRequest request) {
        authService.linkAccount(userId, provider, request);
        return ApiResponse.ok();
    }

    @Operation(summary = "소셜 계정 연동 해제", description = "마지막 로그인 방법은 해제할 수 없다(409)")
    @DeleteMapping("/me/accounts/{provider}")
    public ApiResponse<Void> unlinkAccount(@Parameter(hidden = true) @AuthenticationPrincipal Long userId,
                                           @PathVariable String provider) {
        authService.unlinkAccount(userId, provider);
        return ApiResponse.ok();
    }
}
