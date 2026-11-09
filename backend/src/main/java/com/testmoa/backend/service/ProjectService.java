package com.testmoa.backend.service;

import org.springframework.web.multipart.MultipartFile;
import com.testmoa.backend.dto.request.ProjectSaveRequest;
import com.testmoa.backend.dto.request.RecruitmentCreateRequest;
import com.testmoa.backend.dto.request.RecruitmentUpdateRequest;
import com.testmoa.backend.dto.request.TestItemsUpdateRequest;
import com.testmoa.backend.dto.response.ProjectDashboardResponse;
import com.testmoa.backend.dto.response.ProjectResponse;
import com.testmoa.backend.dto.response.RecruitmentCreateResponse;
import com.testmoa.backend.dto.response.RecruitmentSummaryResponse;

import java.util.List;

public interface ProjectService {
    String uploadImage(java.util.List<MultipartFile> files);

    ProjectResponse create(Long userId, ProjectSaveRequest request);

    List<ProjectResponse> findMine(Long userId);

    ProjectDashboardResponse findDashboard(Long userId);

    ProjectResponse findMine(Long userId, Long projectId);

    List<RecruitmentSummaryResponse> findRecruitments(Long userId, Long projectId);

    ProjectResponse update(Long userId, Long projectId, ProjectSaveRequest request);

    RecruitmentCreateResponse createRecruitment(Long userId, RecruitmentCreateRequest request);

    void updateRecruitment(Long userId, Long recruitmentId, RecruitmentUpdateRequest request);

    void updateTestItems(Long userId, Long recruitmentId, TestItemsUpdateRequest request);
}
