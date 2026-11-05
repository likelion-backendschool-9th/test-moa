package com.testmoa.backend.domain.repository;

import com.testmoa.backend.domain.entity.Register;
import com.testmoa.backend.global.common.FeedbackStatus;
import com.testmoa.backend.global.common.RegisterStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RegisterRepository extends JpaRepository<Register, Long> {

    /**
     * 승인 대기 보상. Feedback(SUBMITTED)가 있는 CONFIRMED 참가의 스냅샷을 참가당 1회만 합산한다.
     * REPORTED(검토 중)·CANCELLED·REJECTED는 포함하지 않는다.
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
                    and f.status = :feedbackStatus
              )
            """)
    Integer sumPendingRewardByUserId(
            @Param("userId") Long userId,
            @Param("registerStatus") RegisterStatus registerStatus,
            @Param("feedbackStatus") FeedbackStatus feedbackStatus
    );
}
