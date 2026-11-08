package com.testmoa.backend.repository;

import com.testmoa.backend.entity.Register;
import com.testmoa.backend.entity.enums.FeedbackStatus;
import com.testmoa.backend.entity.enums.RegisterStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface RegisterRepository extends JpaRepository<Register, Long> {
    // 모집글별 상태가 같은 참가 수. 참가가 없는 모집글은 결과에 없다
    @Query("select r.recruitment.id as recruitmentId, count(r) as count from registers r "
            + "where r.recruitment.id in :recruitmentIds and r.status = :status group by r.recruitment.id")
    List<RecruitmentCount> countByRecruitmentIds(@Param("recruitmentIds") Collection<Long> recruitmentIds, @Param("status") RegisterStatus status);

    // 회원의 이 모집 참가 중 가장 최근 것. 취소 뒤 다시 지원하면 참가가 여럿일 수 있다
    Optional<Register> findFirstByRecruitmentIdAndUserIdOrderByIdDesc(Long recruitmentId, Long userId);

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

    // 회원이 이 모집에 이미 낸 참가 중 상태가 주어진 것이 있는지(#114)
    // 모집글에 지원이 한 건이라도 있는지. 있으면 선정 방식을 바꿀 수 없다
    boolean existsByRecruitmentId(Long recruitmentId);

    boolean existsByRecruitmentIdAndUserIdAndStatusIn(Long recruitmentId, Long userId, Collection<RegisterStatus> statuses);
}
