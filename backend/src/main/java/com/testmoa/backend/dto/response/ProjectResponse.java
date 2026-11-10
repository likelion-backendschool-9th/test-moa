package com.testmoa.backend.dto.response;

import com.testmoa.backend.entity.Project;

import java.time.LocalDateTime;

/**
 * 프로젝트 정보. 카드의 "모집 n건 · 모집 중 n건"에 쓰는 수를 함께 준다. 취소한 모집은 세지 않는다.
 * repository는 연결한 GitHub 레포("owner/repo")이고 연결하지 않았으면 null이다. 토큰은 어디에도 내보내지 않는다
 */
public record ProjectResponse(
        Long id,
        String name,
        String description,
        String imageUrl,
        String repository,
        LocalDateTime createdAt,
        long recruitmentCount,
        long openRecruitmentCount
) {
    public static ProjectResponse of(Project project, long recruitmentCount, long openRecruitmentCount) {
        return new ProjectResponse(project.getId(), project.getTitle(), project.getDescription(), project.getImageUrl(),
                project.getGithubRepository(), project.getCreatedAt(), recruitmentCount, openRecruitmentCount);
    }
}
