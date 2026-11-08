package com.testmoa.backend.repository;

import com.testmoa.backend.entity.FeedbackCluster;
import com.testmoa.backend.repository.projection.GroupFeedbackStats;
import com.testmoa.backend.repository.projection.RepresentativeSample;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
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

    // 모집글(버전) 하나의 그룹별 리뷰 수와 테스터 수. 같은 테스터가 쓴 리뷰는 한 명으로 셈
    @Query("""
            select new com.testmoa.backend.repository.projection.GroupFeedbackStats(
                fc.clusterGroup.id, count(fc), count(distinct r.user.id))
            from feedback_clusters fc
            join fc.feedback f
            join f.register r
            where fc.clusterGroup.recruitment.id = :recruitmentId
            group by fc.clusterGroup.id
            """)
    List<GroupFeedbackStats> findGroupStats(@Param("recruitmentId") Long recruitmentId);

    // 분석에 들어간 리뷰 중 가장 늦게 제출한 시각. 분석한 리뷰가 없으면 null
    @Query("""
            select max(f.submittedAt) from feedback_clusters fc
            join fc.feedback f
            where fc.clusterGroup.recruitment.id = :recruitmentId
            """)
    LocalDateTime findLastAnalyzedFeedbackAt(@Param("recruitmentId") Long recruitmentId);

    // 그룹의 리뷰 내용. 대표 리뷰가 먼저이고 나머지는 최근 제출 순. 이슈 본문에 인용할 때 씀
    @Query("""
            select f.content from feedback_clusters fc join fc.feedback f
            where fc.clusterGroup.id = :groupId
            order by fc.representative desc, f.submittedAt desc
            """)
    List<String> findSampleContents(@Param("groupId") Long groupId, Limit limit);

    // 다시 분석할 때 지우는 매핑. GitHub에 등록했거나 등록 중(staleBefore 이후에 시작)인 그룹의 매핑은 남김
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
            delete from feedback_clusters fc
            where fc.clusterGroup.id in (
                select g.id from cluster_groups g where g.recruitment.id = :recruitmentId and g.gitIssueUrl is null
                  and (g.gitIssueRegisteringAt is null or g.gitIssueRegisteringAt < :staleBefore))
            """)
    int deleteUnregisteredByRecruitmentId(@Param("recruitmentId") Long recruitmentId, @Param("staleBefore") LocalDateTime staleBefore);
}
