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

    // 운영자 목록. 검토 대기는 오래된 순
    @EntityGraph(attributePaths = {"reporter", "reportedUser"})
    List<Report> findByStatusInOrderByCreatedAtAscIdAsc(Collection<ReportStatus> statuses);

    @EntityGraph(attributePaths = {"reporter", "reportedUser"})
    List<Report> findByStatusInAndTargetTypeOrderByCreatedAtAscIdAsc(Collection<ReportStatus> statuses, ReportTargetType targetType);

    // 운영자 목록. 처리 완료는 처리가 최근인 순
    @EntityGraph(attributePaths = {"reporter", "reportedUser", "reviewer"})
    List<Report> findByStatusInOrderByReviewedAtDescIdDesc(Collection<ReportStatus> statuses);

    @EntityGraph(attributePaths = {"reporter", "reportedUser", "reviewer"})
    List<Report> findByStatusInAndTargetTypeOrderByReviewedAtDescIdDesc(Collection<ReportStatus> statuses, ReportTargetType targetType);

    // 내 신고 목록, 최신순
    List<Report> findByReporterIdOrderByCreatedAtDescIdDesc(Long reporterId);
}
