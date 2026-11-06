package com.testmoa.backend.service;

import com.testmoa.backend.domain.dto.request.LoginRequest;
import com.testmoa.backend.domain.dto.request.OAuthSignupRequest;
import com.testmoa.backend.domain.dto.request.SignupRequest;
import com.testmoa.backend.domain.dto.response.OAuthLoginResponse;
import com.testmoa.backend.domain.dto.response.TokenResponse;
import com.testmoa.backend.global.security.OAuthClient.OAuthProfile;

/**
 * 이메일·소셜 가입과 로그인, 토큰 발급·갱신·폐기, 소셜 계정 연동
 */
public interface AuthService {
    // 회원과 이메일 로그인 계정을 함께 만든다. 이메일·닉네임이 겹치면 409
    void signup(SignupRequest request);
    // 이메일·비밀번호를 확인하고 access·refresh 토큰을 준다. 정지 회원은 403
    TokenResponse login(LoginRequest request);
    // 쓴 refresh 토큰은 버리고 새 토큰 쌍을 준다
    TokenResponse refresh(String refreshToken);
    // refresh 토큰을 버린다. 없는 토큰이어도 성공으로 본다
    void logout(String refreshToken);

    // 제공자(google, github) 동의 화면 주소
    String oauthAuthorizeUrl(String provider, String redirectUri, String state);
    // 연동된 회원이면 로그인, 확인된 이메일이 같은 회원이 있으면 연동하고 로그인, 처음이면 가입 토큰을 준다
    // profile은 컨트롤러가 트랜잭션 밖에서 제공자에게 받아 온다
    OAuthLoginResponse oauthLogin(OAuthProfile profile);
    // 가입 토큰과 이름으로 회원을 만들고 로그인한다
    TokenResponse oauthSignup(OAuthSignupRequest request);
    // 로그인한 회원에 소셜 계정을 연동한다. 다른 회원에 연동된 계정이면 409
    void linkAccount(Long userId, OAuthProfile profile);
    // 소셜 계정 연동을 해제한다. 마지막 로그인 방법이면 409
    void unlinkAccount(Long userId, String provider);
}
