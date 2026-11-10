package com.testmoa.backend.controller;


import com.testmoa.backend.dto.request.OAuthCodeRequest;
import com.testmoa.backend.dto.request.PasswordChangeRequest;
import com.testmoa.backend.dto.request.ProfileUpdateRequest;
import com.testmoa.backend.dto.request.WithdrawRequest;
import com.testmoa.backend.global.security.JwtProvider;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PatchMapping;
import com.testmoa.backend.global.security.OAuthClient;
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
    private final OAuthClient oauthClient;

    public UserController(UserService userService, AuthService authService, OAuthClient oauthClient) {
        this.userService = userService;
        this.authService = authService;
        this.oauthClient = oauthClient;
    }

    @Operation(summary = "내 정보", description = "로그인 필요. 구독 상태(subscription.active)를 함께 준다")
    @GetMapping("/me")
    public ApiResponse<MeResponse> getMe(@Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(userService.getMe(userId));
    }

    @Operation(summary = "내 정보 수정", description = "이름·닉네임. 다른 회원의 닉네임이면 409. 바뀐 내 정보를 준다")
    @PatchMapping("/me")
    public ApiResponse<MeResponse> updateMe(@Parameter(hidden = true) @AuthenticationPrincipal Long userId,
                                            @Valid @RequestBody ProfileUpdateRequest request) {
        return ApiResponse.ok(userService.updateProfile(userId, request));
    }

    @Operation(summary = "비밀번호 변경", description = "현재 비밀번호를 확인하고 바꾼다. 비밀번호가 없는 소셜 회원은 currentPassword 없이 만든다. 바꾸면 다른 기기의 로그인이 끊긴다")
    @PatchMapping("/me/password")
    public ApiResponse<Void> changePassword(@Parameter(hidden = true) @AuthenticationPrincipal Long userId,
                                            @Parameter(hidden = true) Authentication authentication,
                                            @Valid @RequestBody PasswordChangeRequest request) {
        // 지금 로그인 세션은 남기고 다른 세션만 끊는다. 세션 id는 access 토큰의 sid에 있다
        // details에 JWT가 없으면 세션 없는 토큰과 같이 그 회원의 토큰을 모두 지운다
        String sessionId = authentication.getDetails() instanceof Jwt jwt ? jwt.getClaimAsString(JwtProvider.SESSION_CLAIM) : null;
        userService.changePassword(userId, sessionId, request);
        return ApiResponse.ok();
    }

    @Operation(summary = "회원 탈퇴", description = "비밀번호(소셜로만 가입했으면 confirmText \"탈퇴합니다\")를 확인하고 30일 탈퇴 유예로 바꾼다. 모든 기기의 로그인이 끊긴다. 출금 처리 중이면 409")
    @DeleteMapping("/me")
    public ApiResponse<Void> withdraw(@Parameter(hidden = true) @AuthenticationPrincipal Long userId,
                                      @RequestBody WithdrawRequest request) {
        userService.withdraw(userId, request);
        return ApiResponse.ok();
    }

    @Operation(summary = "소셜 계정 연동", description = "provider: google, github. 연동 화면에서 받은 code를 보낸다. 다른 회원에 연동된 계정이면 409")
    @PostMapping("/me/accounts/{provider}")
    public ApiResponse<Void> linkAccount(@Parameter(hidden = true) @AuthenticationPrincipal Long userId,
                                         @PathVariable String provider,
                                         @Valid @RequestBody OAuthCodeRequest request) {
        // 제공자와는 트랜잭션 밖에서 통신한다(AuthController.oauthLogin과 같다)
        authService.linkAccount(userId, oauthClient.fetchProfile(OAuthClient.parse(provider), request.code(), request.redirectUri()));
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
