package com.testmoa.backend.domain.repository;

import com.testmoa.backend.domain.entity.Recruitment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface RecruitmentRepository extends JpaRepository<Recruitment, Long> {
    // 여러 프로젝트의 모집글. 최신순
    List<Recruitment> findByProjectIdInOrderByCreatedAtDescIdDesc(Collection<Long> projectIds);
}
