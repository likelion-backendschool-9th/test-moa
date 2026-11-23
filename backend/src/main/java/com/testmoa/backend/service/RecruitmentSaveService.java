package com.testmoa.backend.service;

import com.testmoa.backend.dto.request.RecruitmentCreateRequest;
import com.testmoa.backend.dto.request.RecruitmentUpdateRequest;
import com.testmoa.backend.dto.request.TestItemsUpdateRequest;
import com.testmoa.backend.dto.response.RecruitmentCreateResponse;

/** 개발자의 모집 작성·정보 수정·테스트 항목 수정(#289에서 ProjectService에서 나눔) */
public interface RecruitmentSaveService {
    RecruitmentCreateResponse createRecruitment(Long userId, RecruitmentCreateRequest request);

    void updateRecruitment(Long userId, Long recruitmentId, RecruitmentUpdateRequest request);

    void updateTestItems(Long userId, Long recruitmentId, TestItemsUpdateRequest request);
}
