package com.testmoa.backend.domain.dto.response;

import com.testmoa.backend.domain.entity.Project;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 프로젝트와 그 모집글
 */
public record ProjectResponse(
        Long id,
        String name,
        String description,
        String imageUrl,
        LocalDateTime createdAt,
        List<RecruitmentSummaryResponse> recruitments
) {
    public static ProjectResponse of(Project project, List<RecruitmentSummaryResponse> recruitments) {
        return new ProjectResponse(project.getId(), project.getTitle(), project.getDescription(), project.getImageUrl(),
                project.getCreatedAt(), recruitments);
    }
}
