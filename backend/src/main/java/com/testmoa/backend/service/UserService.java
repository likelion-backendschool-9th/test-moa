package com.testmoa.backend.service;

import com.testmoa.backend.domain.dto.AuthenticatedUser;
import com.testmoa.backend.domain.dto.response.MeResponse;

import java.util.Optional;

/**
 * 회원 본인 정보 조회·관리
 */
public interface UserService {
    // 내 정보, 연동된 로그인 방식, 구독 상태(운영자는 null)
    MeResponse getMe(Long userId);

    // 토큰으로 인증할 수 있는 회원(ACTIVE)이면 id와 권한을 준다. 없거나 정지·탈퇴면 빈 값
    Optional<AuthenticatedUser> findAuthenticatable(Long userId);
}
