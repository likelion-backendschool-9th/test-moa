package com.testmoa.backend.service;

import org.springframework.web.multipart.MultipartFile;
import com.testmoa.backend.dto.request.ProjectSaveRequest;
import com.testmoa.backend.dto.request.RepositoryConnectRequest;
import com.testmoa.backend.dto.request.RecruitmentCreateRequest;
import com.testmoa.backend.dto.request.RecruitmentUpdateRequest;
import com.testmoa.backend.dto.request.TestItemsUpdateRequest;
import com.testmoa.backend.dto.response.ProjectDashboardResponse;
import com.testmoa.backend.dto.response.ProjectResponse;
import com.testmoa.backend.dto.response.RecruitmentCreateResponse;
import com.testmoa.backend.dto.response.RecruitmentSummaryResponse;

import java.util.List;

public interface ProjectService {
    String uploadImage(List<MultipartFile> files);

    ProjectResponse create(Long userId, ProjectSaveRequest request);

    List<ProjectResponse> findMine(Long userId);

    ProjectDashboardResponse findDashboard(Long userId);

    ProjectResponse findMine(Long userId, Long projectId);

    List<RecruitmentSummaryResponse> findRecruitments(Long userId, Long projectId);

    ProjectResponse update(Long userId, Long projectId, ProjectSaveRequest request);

    ProjectResponse connectRepository(Long userId, Long projectId, RepositoryConnectRequest request);

    ProjectResponse disconnectRepository(Long userId, Long projectId);

    /**
     * 프로젝트 삭제(#287). 모집글이 하나도 없을 때만 지운다(취소한 모집글도 센다).
     * 없거나 다른 회원의 프로젝트는 NOT_FOUND, 모집글이 있으면 PROJECT_NOT_DELETABLE
     */
    void delete(Long userId, Long projectId);

    RecruitmentCreateResponse createRecruitment(Long userId, RecruitmentCreateRequest request);

    void updateRecruitment(Long userId, Long recruitmentId, RecruitmentUpdateRequest request);

    void updateTestItems(Long userId, Long recruitmentId, TestItemsUpdateRequest request);
}
