package com.testmoa.backend.repository;

import com.testmoa.backend.entity.Recruitment;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface RecruitmentRepository extends JpaRepository<Recruitment, Long> {
    // 여러 프로젝트의 모집글. 최신순
    List<Recruitment> findByProjectIdInOrderByCreatedAtDescIdDesc(Collection<Long> projectIds);

    // 모집글 하나와 프로젝트. 공개 상세가 프로젝트 정보를 함께 보여 준다
    @EntityGraph(attributePaths = "project")
    Optional<Recruitment> findWithProjectById(Long id);
}
