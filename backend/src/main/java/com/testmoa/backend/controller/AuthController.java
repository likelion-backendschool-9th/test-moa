package com.testmoa.backend.controller;


import com.testmoa.backend.dto.request.OAuthCodeRequest;
import com.testmoa.backend.dto.request.OAuthSignupRequest;
import com.testmoa.backend.dto.response.OAuthLoginResponse;
import com.testmoa.backend.global.security.OAuthClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import com.testmoa.backend.dto.request.LoginRequest;
import com.testmoa.backend.dto.request.RefreshTokenRequest;
import com.testmoa.backend.dto.request.RestoreRequest;
import com.testmoa.backend.dto.request.SignupRequest;
import com.testmoa.backend.dto.response.TokenResponse;
import com.testmoa.backend.global.util.ApiResponse;
import com.testmoa.backend.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/**
 * 이메일 가입·로그인·토큰 갱신·로그아웃. 로그인 없이 부를 수 있다(SecurityConfig.PUBLIC_PATHS)
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;
    private final OAuthClient oauthClient;

    public AuthController(AuthService authService, OAuthClient oauthClient) {
        this.authService = authService;
        this.oauthClient = oauthClient;
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

    @Operation(summary = "탈퇴 되돌리기", description = "탈퇴 유예 회원이 로그인하면 403 WITHDRAWAL_PENDING과 error.fields.restoreToken(10분)을 받는다. 그 토큰으로 되돌리고 로그인 토큰을 받는다")
    @PostMapping("/restore")
    public ApiResponse<TokenResponse> restore(@Valid @RequestBody RestoreRequest request) {
        return ApiResponse.ok(authService.restore(request.restoreToken()));
    }

    @Operation(summary = "로그아웃", description = "refresh 토큰을 버린다. access 토큰은 만료(30분)까지 남으므로 Next가 쿠키를 지운다")
    @PostMapping("/logout")
    public ApiResponse<Void> logout(@Valid @RequestBody RefreshTokenRequest request) {
        authService.logout(request.refreshToken());

        return ApiResponse.ok();
    }

    @Operation(summary = "소셜 로그인 동의 화면 주소", description = "provider: google, github. state는 프론트가 만들어 돌아올 때 같은지 확인한다")
    @GetMapping("/oauth/{provider}/authorize-url")
    public ApiResponse<String> oauthAuthorizeUrl(@PathVariable String provider,
                                                 @RequestParam String redirectUri,
                                                 @RequestParam String state) {
        return ApiResponse.ok(authService.oauthAuthorizeUrl(provider, redirectUri, state));
    }

    @Operation(summary = "소셜 로그인", description = "제공자가 돌려준 code로 로그인한다. 처음 온 사람이면 signupRequired와 가입 토큰이 온다")
    @PostMapping("/oauth/{provider}")
    public ApiResponse<OAuthLoginResponse> oauthLogin(@PathVariable String provider, @Valid @RequestBody OAuthCodeRequest request) {
        // 제공자와는 트랜잭션 밖에서 통신한다. 기다리는 동안 DB 연결을 잡지 않게 서비스에는 받은 회원 정보만 넘긴다
        return ApiResponse.ok(authService.oauthLogin(oauthClient.fetchProfile(OAuthClient.parse(provider), request.code(), request.redirectUri())));
    }

    @Operation(summary = "소셜 가입", description = "소셜 로그인에서 받은 가입 토큰(10분)과 이름으로 가입하고 로그인한다")
    @PostMapping("/oauth/signup")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<TokenResponse> oauthSignup(@Valid @RequestBody OAuthSignupRequest request) {
        return ApiResponse.ok(authService.oauthSignup(request));
    }
}
