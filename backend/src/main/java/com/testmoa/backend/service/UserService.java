package com.testmoa.backend.service;

import com.testmoa.backend.dto.AuthenticatedUser;
import com.testmoa.backend.dto.request.PasswordChangeRequest;
import com.testmoa.backend.dto.request.WithdrawRequest;
import com.testmoa.backend.dto.request.ProfileUpdateRequest;
import com.testmoa.backend.dto.response.MeResponse;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * 회원 본인 정보 조회·관리
 */
public interface UserService {
    // 내 정보, 연동된 로그인 방식, 구독 상태(운영자는 null)
    MeResponse getMe(Long userId);

    // 이름·닉네임 수정. 다른 회원의 닉네임이면 409. 바뀐 내 정보를 준다
    MeResponse updateProfile(Long userId, ProfileUpdateRequest request);

    // 비밀번호 변경(소셜 회원은 만들기). 지금 세션(sessionId)을 뺀 다른 기기의 로그인을 끊는다
    void changePassword(Long userId, String sessionId, PasswordChangeRequest request);

    /** 탈퇴 신청(#84). 30일 유예 */
    void withdraw(Long userId, WithdrawRequest request);

    /** 탈퇴 신청이 cutoff보다 앞선 유예 회원의 개인정보를 파기하고 파기한 수를 돌려준다(#84) */
    int purgeWithdrawnBefore(LocalDateTime cutoff);

    // 토큰으로 인증할 수 있는 회원(ACTIVE)이고 로그인 세션이 살아 있으면 id와 권한을 준다.
    // 없거나 정지·탈퇴했거나 로그아웃한 세션이면 빈 값. sessionId가 null이면(세션 없는 토큰) 세션은 보지 않는다
    Optional<AuthenticatedUser> findAuthenticatable(Long userId, String sessionId);
}
