package com.testmoa.backend.domain.dto;

import com.testmoa.backend.global.common.Role;

/**
 * 토큰으로 인증할 수 있는 회원. 보안 변환기가 이 값으로 Spring 인증 객체를 만든다
 */
public record AuthenticatedUser(Long userId, Role role) {}
