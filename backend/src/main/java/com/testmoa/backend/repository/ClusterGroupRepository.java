package com.testmoa.backend.repository;

import com.testmoa.backend.entity.ClusterGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ClusterGroupRepository extends JpaRepository<ClusterGroup, Long> {
    // 모집글(버전) 하나의 분석 그룹. 저장한 순서
    List<ClusterGroup> findByRecruitmentIdOrderByIdAsc(Long recruitmentId);

    // 프로젝트의 모든 버전에서 쓴 그룹 코드. 새 코드(최대 + 1)를 정할 때 씀
    @Query("select g.groupCode from cluster_groups g where g.recruitment.project.id = :projectId")
    List<String> findGroupCodesByProjectId(@Param("projectId") Long projectId);

    // 내 모집글의 그룹 하나. 다른 모집글이나 다른 회원의 그룹은 없는 것과 같다
    @Query("""
            select g from cluster_groups g
            where g.id = :id and g.recruitment.id = :recruitmentId and g.recruitment.project.user.id = :userId
            """)
    Optional<ClusterGroup> findMine(@Param("id") Long id, @Param("recruitmentId") Long recruitmentId, @Param("userId") Long userId);

    // 다시 분석할 때 지우는 그룹. GitHub에 등록한 그룹은 남김. 매핑을 먼저 지워야 함
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from cluster_groups g where g.recruitment.id = :recruitmentId and g.gitIssueUrl is null")
    int deleteUnregisteredByRecruitmentId(@Param("recruitmentId") Long recruitmentId);
}
