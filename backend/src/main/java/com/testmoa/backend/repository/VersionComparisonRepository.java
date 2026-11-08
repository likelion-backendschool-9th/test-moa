package com.testmoa.backend.repository;

import com.testmoa.backend.entity.VersionComparison;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface VersionComparisonRepository extends JpaRepository<VersionComparison, Long> {
    // 모집글(현재 버전)의 비교 결과. 모집글당 하나이고, 비교한 직전 버전 모집글을 함께 읽음
    @Query("select vc from version_comparisons vc join fetch vc.previousRecruitment where vc.recruitment.id = :recruitmentId")
    Optional<VersionComparison> findByRecruitmentId(@Param("recruitmentId") Long recruitmentId);
}
