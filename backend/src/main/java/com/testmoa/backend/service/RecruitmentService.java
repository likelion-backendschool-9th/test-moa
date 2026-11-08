package com.testmoa.backend.service;

import com.testmoa.backend.dto.request.RecruitmentSearchRequest;
import com.testmoa.backend.dto.response.RecruitmentPageResponse;
import com.testmoa.backend.dto.response.RecruitmentResponse;

public interface RecruitmentService {
    /**
     * 공개 모집글 상세. 없거나 취소된 모집은 NOT_FOUND
     *
     * @param userId 로그인한 회원. 비로그인이면 null
     */
    RecruitmentResponse find(Long recruitmentId, Long userId);

    /**
     * 공개 모집 목록·검색(#112). 취소된 모집은 빼고, 요청한 페이지가 마지막보다 크면 마지막 페이지를 준다.
     * 모르는 유형·정렬 값은 INVALID_INPUT
     */
    RecruitmentPageResponse search(RecruitmentSearchRequest request);
}
