package com.testmoa.backend.repository;

import com.testmoa.backend.entity.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    // 모집글에서 피드백을 하나라도 낸 참가 id(#116). 피드백은 제출할 때만 저장되므로 행이 있으면 낸 것이다
    @Query("select distinct f.register.id from feedbacks f where f.register.recruitment.id = :recruitmentId")
    List<Long> findRegisterIdsWithFeedback(@Param("recruitmentId") Long recruitmentId);
}
