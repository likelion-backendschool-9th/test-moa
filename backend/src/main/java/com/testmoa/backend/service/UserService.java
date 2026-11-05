package com.testmoa.backend.service;

import com.testmoa.backend.domain.dto.response.MeResponse;

/**
 * 회원 본인 정보 조회·관리
 */
public interface UserService {
    // 내 정보, 연동된 로그인 방식, 구독 상태(운영자는 null)
    MeResponse getMe(Long userId);
}
