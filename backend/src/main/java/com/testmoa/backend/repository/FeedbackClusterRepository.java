package com.testmoa.backend.repository;

import com.testmoa.backend.entity.FeedbackCluster;
import com.testmoa.backend.repository.projection.RepresentativeSample;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface FeedbackClusterRepository extends JpaRepository<FeedbackCluster, Long> {
    // 모집글(버전) 하나의 그룹별 대표 리뷰 내용. 그룹을 따로 읽지 않도록 그룹 id와 내용만 읽음
    @Query("""
            select new com.testmoa.backend.repository.projection.RepresentativeSample(fc.clusterGroup.id, f.content)
            from feedback_clusters fc
            join fc.feedback f
            where fc.clusterGroup.recruitment.id = :recruitmentId and fc.representative = true
            """)
    List<RepresentativeSample> findRepresentativeSamples(@Param("recruitmentId") Long recruitmentId);
}
