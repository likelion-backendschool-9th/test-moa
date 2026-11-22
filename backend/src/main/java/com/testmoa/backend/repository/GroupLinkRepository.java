package com.testmoa.backend.repository;

import com.testmoa.backend.entity.GroupLink;
import com.testmoa.backend.repository.projection.LinkPair;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface GroupLinkRepository extends JpaRepository<GroupLink, Long> {
    // 두 버전 사이의 짝. 그룹을 따로 읽지 않도록 id만 읽음. 저장한 순서
    @Query("""
            select new com.testmoa.backend.repository.projection.LinkPair(l.currentGroup.id, l.previousGroup.id)
            from group_links l
            where l.currentGroup.recruitment.id = :currentRecruitmentId and l.previousGroup.recruitment.id = :previousRecruitmentId
            order by l.id
            """)
    List<LinkPair> findPairs(@Param("currentRecruitmentId") Long currentRecruitmentId,
                             @Param("previousRecruitmentId") Long previousRecruitmentId);

    // 이번 버전 그룹들의 짝을 지움. 다시 비교하거나 개발자가 짝을 고칠 때 새 짝을 넣기 전에 씀
    @Modifying(flushAutomatically = true)
    @Query("delete from group_links l where l.currentGroup.id in :groupIds")
    int deleteByCurrentGroupIds(@Param("groupIds") Collection<Long> groupIds);

    // 다시 분석할 때 지우는 그룹(GitHub에 등록하지 않았고 등록 중도 아닌 그룹)의 짝. 이번 그룹·직전 그룹 어느 쪽이든 지움
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
            delete from group_links l
            where l.currentGroup.id in (
                select g.id from cluster_groups g where g.recruitment.id = :recruitmentId and g.gitIssueUrl is null
                  and (g.gitIssueRegisteringAt is null or g.gitIssueRegisteringAt < :staleBefore))
               or l.previousGroup.id in (
                select g.id from cluster_groups g where g.recruitment.id = :recruitmentId and g.gitIssueUrl is null
                  and (g.gitIssueRegisteringAt is null or g.gitIssueRegisteringAt < :staleBefore))
            """)
    int deleteUnregisteredByRecruitmentId(@Param("recruitmentId") Long recruitmentId, @Param("staleBefore") LocalDateTime staleBefore);
}
