package com.testmoa.backend.service;

import com.testmoa.backend.dto.response.PublicRecruitmentResponse;

public interface PublicRecruitmentService {
    /**
     * 공개 모집글 상세. 없거나 취소된 모집은 NOT_FOUND
     *
     * @param userId 로그인한 회원. 비로그인이면 null
     */
    PublicRecruitmentResponse find(Long recruitmentId, Long userId);
}
