package com.testmoa.backend.repository;

import com.testmoa.backend.entity.Report;
import com.testmoa.backend.entity.enums.ReportStatus;
import com.testmoa.backend.entity.enums.ReportTargetType;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ReportRepository extends JpaRepository<Report, Long> {
    // 같은 회원이 같은 대상을 이 상태로 신고한 적이 있는지(검토 대기 중 중복 신고 막기)
    boolean existsByReporterIdAndTargetTypeAndTargetIdAndStatus(Long reporterId, ReportTargetType targetType, Long targetId, ReportStatus status);

    // 판정할 때 신고 행을 잠그고 읽는다. 두 운영자가 동시에 판정해도 하나만 된다
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from reports r where r.id = :id")
    Optional<Report> findByIdForUpdate(@Param("id") Long id);

    // 운영자 목록. 검토 대기는 오래된 순. targetType이 null이면 모든 종류
    @EntityGraph(attributePaths = {"reporter", "reportedUser"})
    @Query("""
            select r from reports r where r.status in :statuses and (:targetType is null or r.targetType = :targetType)
            order by r.createdAt asc, r.id asc
            """)
    List<Report> findPending(@Param("statuses") Collection<ReportStatus> statuses, @Param("targetType") ReportTargetType targetType);

    // 운영자 목록. 처리 완료는 처리가 최근인 순
    @EntityGraph(attributePaths = {"reporter", "reportedUser", "reviewer"})
    @Query("""
            select r from reports r where r.status in :statuses and (:targetType is null or r.targetType = :targetType)
            order by r.reviewedAt desc, r.id desc
            """)
    List<Report> findDone(@Param("statuses") Collection<ReportStatus> statuses, @Param("targetType") ReportTargetType targetType);

    // 내 신고 목록, 최신순
    List<Report> findByReporterIdOrderByCreatedAtDescIdDesc(Long reporterId);

    // 회원이 받은 신고, 최신순(운영자 회원 상세)
    List<Report> findByReportedUserIdOrderByCreatedAtDescIdDesc(Long reportedUserId);

    // 회원별로 받은 신고 중 이 상태인 신고 수(운영자 회원 목록)
    @Query("select r.reportedUser.id, count(r) from reports r where r.reportedUser.id in :userIds and r.status = :status group by r.reportedUser.id")
    List<Object[]> countReceivedByStatus(@Param("userIds") Collection<Long> userIds, @Param("status") ReportStatus status);
}
