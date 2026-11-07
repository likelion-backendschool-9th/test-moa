package com.testmoa.backend.repository;

import com.testmoa.backend.entity.Register;
import com.testmoa.backend.entity.enums.FeedbackStatus;
import com.testmoa.backend.entity.enums.RegisterStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface RegisterRepository extends JpaRepository<Register, Long> {
    // 모집글별 상태가 같은 참가 수. 참가가 없는 모집글은 결과에 없다
    @Query("select r.recruitment.id as recruitmentId, count(r) as count from registers r "
            + "where r.recruitment.id in :recruitmentIds and r.status = :status group by r.recruitment.id")
    List<RecruitmentCount> countByRecruitmentIds(@Param("recruitmentIds") Collection<Long> recruitmentIds, @Param("status") RegisterStatus status);

    interface RecruitmentCount {
        Long getRecruitmentId();

        long getCount();
    }

    /**
     * 승인 대기 보상. Feedback(SUBMITTED)가 있고 Feedback(REPORTED)가 없는 CONFIRMED 참가의
     * 스냅샷을 참가당 1회만 합산한다. 한 건이라도 신고되면 참가 전체 지급을 보류한다.
     * CANCELLED·REJECTED 참가는 제외한다.
     */
    @Query("""
            select coalesce(sum(r.baseRewardSnapshot + r.extraRewardSnapshot), 0)
            from registers r
            where r.user.id = :userId
              and r.status = :registerStatus
              and r.baseRewardSnapshot is not null
              and r.extraRewardSnapshot is not null
              and exists (
                  select 1 from feedbacks f
                  where f.register = r
                    and f.status = :submittedStatus
              )
              and not exists (
                  select 1 from feedbacks blocked
                  where blocked.register = r
                    and blocked.status = :reportedStatus
              )
            """)
    Integer sumPendingRewardByUserId(
            @Param("userId") Long userId,
            @Param("registerStatus") RegisterStatus registerStatus,
            @Param("submittedStatus") FeedbackStatus submittedStatus,
            @Param("reportedStatus") FeedbackStatus reportedStatus
    );

    // 모집글의 참가 중 상태가 주어진 것들(#116)
    List<Register> findByRecruitmentIdAndStatusIn(Long recruitmentId, Collection<RegisterStatus> statuses);
}
