package com.testmoa.backend.repository;

import com.testmoa.backend.entity.Register;
import com.testmoa.backend.entity.enums.FeedbackStatus;
import com.testmoa.backend.entity.enums.RegisterStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
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

    // 모집글의 참가 중 상태가 주어진 것들(#116). 피드백 제출(findMineForUpdate)과 겹치지 않게 참가 행을 잠근다
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    List<Register> findByRecruitmentIdAndStatusIn(Long recruitmentId, Collection<RegisterStatus> statuses);

    // 회원이 이 모집에 이미 낸 참가 중 상태가 주어진 것이 있는지(#114)
    // 모집글의 지원 전체와 지원한 회원. 지원한 순서대로
    @Query("select r from registers r join fetch r.user where r.recruitment.id = :recruitmentId order by r.appliedAt, r.id")
    List<Register> findWithUserByRecruitmentId(@Param("recruitmentId") Long recruitmentId);

    // 모집글의 지원 중 고른 것. 다른 모집글의 지원 id는 빠진다
    List<Register> findByIdInAndRecruitmentId(Collection<Long> ids, Long recruitmentId);

    // 모집글에 지원이 한 건이라도 있는지. 있으면 선정 방식을 바꿀 수 없다
    boolean existsByRecruitmentId(Long recruitmentId);

    boolean existsByRecruitmentIdAndUserIdAndStatusIn(Long recruitmentId, Long userId, Collection<RegisterStatus> statuses);

    // 내 참가 하나와 모집글·프로젝트(#118). 다른 회원의 참가는 없는 것과 같다
    @Query("select r from registers r join fetch r.recruitment rc join fetch rc.project where r.id = :id and r.user.id = :userId")
    Optional<Register> findMine(@Param("id") Long id, @Param("userId") Long userId);

    // 피드백을 내려고 읽는 내 참가(#118). 행을 잠가 두 번 눌러도 한 번만 저장된다
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from registers r join fetch r.recruitment rc join fetch rc.project where r.id = :id and r.user.id = :userId")
    Optional<Register> findMineForUpdate(@Param("id") Long id, @Param("userId") Long userId);
}
