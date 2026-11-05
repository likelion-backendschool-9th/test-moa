package com.testmoa.backend.service;

import com.testmoa.backend.domain.dto.request.LoginRequest;
import com.testmoa.backend.domain.dto.request.SignupRequest;
import com.testmoa.backend.domain.dto.response.TokenResponse;

public interface AuthService {
    void signup(SignupRequest request);
    TokenResponse login(LoginRequest request);
    TokenResponse refresh(String refreshToken);
    void logout(String refreshToken);
}
