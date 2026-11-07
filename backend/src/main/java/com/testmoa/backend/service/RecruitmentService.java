package com.testmoa.backend.service;

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
     * 공개 모집 목록·검색(#112). 취소된 모집은 빼고, 요청한 페이지가 마지막보다 크면 마지막 페이지를 준다
     *
     * @param keyword 검색어. 비었거나 공백뿐이면 조건 없음
     * @param type    프론트 유형 이름(web, mobile, game, api). 없으면 전체. 모르는 값은 INVALID_INPUT
     * @param sort    latest, deadline. 모르는 값은 INVALID_INPUT
     * @param page    1부터
     */
    RecruitmentPageResponse search(String keyword, String type, boolean open, boolean subscription,
                                   String sort, int page, int size);
}
