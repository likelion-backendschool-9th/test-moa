package com.testmoa.backend.domain.repository;

import com.testmoa.backend.domain.entity.Register;
import com.testmoa.backend.global.common.FeedbackStatus;
import com.testmoa.backend.global.common.RegisterStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RegisterRepository extends JpaRepository<Register, Long> {

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
}
