package com.testmoa.backend.service.admin;

import com.testmoa.backend.dto.request.SanctionCreateRequest;
import com.testmoa.backend.dto.response.AdminUserResponse;
import com.testmoa.backend.dto.response.SanctionResponse;

import java.util.List;

/**
 * 운영자 회원 관리와 제재(#86). 운영자 권한은 SecurityConfig(/api/v1/admin/**)가 확인한다
 */
public interface AdminUserService {
    // filter: all(전체), sanctioned(제재 이력 있음), reported(검토 대기 신고 있음). q는 닉네임 일부
    List<AdminUserResponse> list(String q, String filter);

    // 회원 상세: 가린 실명·이메일, 지금 막힌 기능, 제재 이력, 받은 신고
    AdminUserResponse get(Long userId);

    // 제재. LOGIN을 막으면 그 회원의 로그인 세션을 모두 끊는다
    SanctionResponse sanction(Long adminId, Long userId, SanctionCreateRequest request);

    // 해제. 지금 걸린 제재만
    SanctionResponse release(Long adminId, Long sanctionId, String reason);
}
