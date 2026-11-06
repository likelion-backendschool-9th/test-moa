package com.testmoa.backend.repository;

import com.testmoa.backend.entity.Recruitment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface RecruitmentRepository extends JpaRepository<Recruitment, Long> {
    // 여러 프로젝트의 모집글. 최신순
    List<Recruitment> findByProjectIdInOrderByCreatedAtDescIdDesc(Collection<Long> projectIds);

    // 모집글과 그 프로젝트를 한 번에 읽음. 프로젝트 주인을 확인할 때 씀
    @Query("select r from recruitments r join fetch r.project where r.id = :id")
    Optional<Recruitment> findWithProjectById(@Param("id") Long id);

    // 같은 프로젝트에서 version보다 작은 버전 중 가장 큰 것(직전 버전)
    Optional<Recruitment> findFirstByProjectIdAndVersionLessThanOrderByVersionDesc(Long projectId, Integer version);
}
