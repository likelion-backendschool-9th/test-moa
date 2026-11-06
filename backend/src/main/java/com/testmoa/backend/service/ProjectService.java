package com.testmoa.backend.service;

import com.testmoa.backend.dto.request.ProjectSaveRequest;
import com.testmoa.backend.dto.request.RecruitmentCreateRequest;
import com.testmoa.backend.dto.response.ProjectResponse;
import com.testmoa.backend.dto.response.RecruitmentCreateResponse;
import com.testmoa.backend.dto.response.RecruitmentSummaryResponse;

import java.util.List;

public interface ProjectService {
    ProjectResponse create(Long userId, ProjectSaveRequest request);

    List<ProjectResponse> findMine(Long userId);

    ProjectResponse findMine(Long userId, Long projectId);

    List<RecruitmentSummaryResponse> findRecruitments(Long userId, Long projectId);

    ProjectResponse update(Long userId, Long projectId, ProjectSaveRequest request);

    RecruitmentCreateResponse createRecruitment(Long userId, RecruitmentCreateRequest request);
}
