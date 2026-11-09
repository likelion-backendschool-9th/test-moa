package com.testmoa.backend.repository;

import com.testmoa.backend.entity.Report;
import com.testmoa.backend.entity.enums.ReportStatus;
import com.testmoa.backend.entity.enums.ReportTargetType;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReportRepository extends JpaRepository<Report, Long> {
    // 같은 회원이 같은 대상을 이 상태로 신고한 적이 있는지(검토 대기 중 중복 신고 막기)
    boolean existsByReporterIdAndTargetTypeAndTargetIdAndStatus(Long reporterId, ReportTargetType targetType, Long targetId, ReportStatus status);
}
