package com.testmoa.backend.repository;

import com.testmoa.backend.entity.ClusterGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ClusterGroupRepository extends JpaRepository<ClusterGroup, Long> {
    // 모집글(버전) 하나의 분석 그룹. 저장한 순서
    List<ClusterGroup> findByRecruitmentIdOrderByIdAsc(Long recruitmentId);

    // 프로젝트의 모든 버전에서 쓴 그룹 코드. 새 코드(최대 + 1)를 정할 때 씀
    @Query("select g.groupCode from cluster_groups g where g.recruitment.project.id = :projectId")
    List<String> findGroupCodesByProjectId(@Param("projectId") Long projectId);
}
