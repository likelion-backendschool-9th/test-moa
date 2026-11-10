package com.testmoa.backend.repository;

import com.testmoa.backend.entity.ReportEvidence;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReportEvidenceRepository extends JpaRepository<ReportEvidence, Long> {
    // 신고 한 건의 증거, 올린 순서대로
    List<ReportEvidence> findByReportIdOrderBySortOrderAsc(Long reportId);

    // 여러 신고의 증거를 한 번에(운영자 회원 상세)
    List<ReportEvidence> findByReportIdInOrderBySortOrderAsc(java.util.Collection<Long> reportIds);

    // 주소의 신고 id와 증거 id가 함께 맞을 때만 찾는다
    Optional<ReportEvidence> findByIdAndReportId(Long id, Long reportId);
}
