package com.testmoa.backend.repository;

import com.testmoa.backend.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProjectRepository extends JpaRepository<Project, Long> {
    // 내 프로젝트 목록. 최신순
    List<Project> findByUserIdOrderByCreatedAtDescIdDesc(Long userId);

    // 내 프로젝트 하나. 다른 회원의 프로젝트는 없는 것과 같다
    Optional<Project> findByIdAndUserId(Long id, Long userId);
}
