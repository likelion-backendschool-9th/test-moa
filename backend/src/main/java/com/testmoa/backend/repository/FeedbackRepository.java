package com.testmoa.backend.repository;

import com.testmoa.backend.entity.Feedback;
import com.testmoa.backend.entity.enums.FeedbackStatus;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface FeedbackRepository extends JpaRepository<Feedback, Long> {
    // 리뷰와 그 참가·모집글·프로젝트·테스트 항목을 한 번에 읽음
    // 모두 하나에 하나로 이어져 결과가 한 줄이고, 나눠 읽으면 쿼리가 5번 나가서 한 번에 받음
    @Query("""
            select f from feedbacks f
            join fetch f.register r
            join fetch r.recruitment rc
            join fetch rc.project
            left join fetch f.testItem
            where f.id = :id
            """)
    Optional<Feedback> findWithRecruitmentById(@Param("id") Long id);

    // 모집글의 피드백과 쓴 회원. 최근 제출 순
    @Query("""
            select f from feedbacks f
            join fetch f.register r
            join fetch r.user
            where r.recruitment.id = :recruitmentId
            order by f.submittedAt desc, f.id desc
            """)
    List<Feedback> findWithUserByRecruitmentId(@Param("recruitmentId") Long recruitmentId);

    // 모집글별 피드백 수. 피드백이 없는 모집글은 결과에 없다
    @Query("select f.register.recruitment.id as recruitmentId, count(f) as count from feedbacks f "
            + "where f.register.recruitment.id in :recruitmentIds group by f.register.recruitment.id")
    List<RegisterRepository.RecruitmentCount> countByRecruitmentIds(@Param("recruitmentIds") Collection<Long> recruitmentIds);

    // 모집글에서 피드백이 달린 테스트 항목 id. 이 항목은 지울 수 없다
    @Query("select distinct f.testItem.id from feedbacks f where f.register.recruitment.id = :recruitmentId and f.testItem is not null")
    List<Long> findTestItemIdsWithFeedback(@Param("recruitmentId") Long recruitmentId);

    // 모집글에서 피드백을 하나라도 낸 참가 id(#116). 피드백은 제출할 때만 저장되므로 행이 있으면 낸 것이다
    @Query("select distinct f.register.id from feedbacks f where f.register.recruitment.id = :recruitmentId")
    List<Long> findRegisterIdsWithFeedback(@Param("recruitmentId") Long recruitmentId);

    // 모집글의 분석할 리뷰(statuses 상태만). 최근 제출 순이고, 작성자와 테스트 항목 이름을 보내므로 참가·테스트 항목을 함께 읽음
    @Query("""
            select f from feedbacks f
            join fetch f.register r
            left join fetch f.testItem
            where r.recruitment.id = :recruitmentId and f.status in :statuses
            order by f.submittedAt desc, f.id desc
            """)
    List<Feedback> findForAnalysis(@Param("recruitmentId") Long recruitmentId,
                                   @Param("statuses") Collection<FeedbackStatus> statuses, Limit limit);

    // 모집글의 분석할 리뷰(statuses 상태만) 중 어느 분석 그룹에도 들지 않은 수
    @Query("""
            select count(f) from feedbacks f
            where f.register.recruitment.id = :recruitmentId and f.status in :statuses
              and not exists (select fc.id from feedback_clusters fc where fc.feedback = f)
            """)
    long countUnanalyzed(@Param("recruitmentId") Long recruitmentId, @Param("statuses") Collection<FeedbackStatus> statuses);
}
