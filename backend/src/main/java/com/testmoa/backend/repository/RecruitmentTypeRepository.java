package com.testmoa.backend.repository;

import com.testmoa.backend.entity.RecruitmentType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface RecruitmentTypeRepository extends JpaRepository<RecruitmentType, Long> {
    // 여러 모집글의 유형. 유형 코드를 함께 읽는다
    @EntityGraph(attributePaths = "type")
    List<RecruitmentType> findByRecruitmentIdIn(Collection<Long> recruitmentIds);
}
