package com.testmoa.backend.service;

import com.testmoa.backend.domain.dto.request.LoginRequest;
import com.testmoa.backend.domain.dto.request.SignupRequest;
import com.testmoa.backend.domain.dto.response.TokenResponse;

/**
 * 이메일 가입과 토큰 발급·갱신·폐기
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
}
