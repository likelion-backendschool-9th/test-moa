package com.testmoa.backend.dto.response;

import com.testmoa.backend.entity.Report;
import com.testmoa.backend.entity.ReportEvidence;
import com.testmoa.backend.entity.enums.ReportStatus;
import com.testmoa.backend.entity.enums.ReportTargetType;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 신고 한 건. 신고당한 회원과 판정한 운영자는 신고자에게 보이지 않는다
 *
 * @param reviewedAt 운영자가 기각·인정한 일시. 검토 대기면 null
 *
 * @param evidences 증거 파일. 파일은 GET /api/v1/reports/{id}/evidences/{evidenceId}로 연다
 */
public record ReportResponse(
        Long id,
        ReportTargetType targetType,
        ReportStatus status,
        String reason,
        LocalDateTime createdAt,
        LocalDateTime reviewedAt,
        List<Evidence> evidences
) {
    public record Evidence(Long id, String originalName, String contentType, long size) {
        public static Evidence of(ReportEvidence evidence) {
            return new Evidence(evidence.getId(), evidence.getOriginalName(), evidence.getContentType(), evidence.getSize());
        }
    }

    public static ReportResponse of(Report report, List<ReportEvidence> evidences) {
        return new ReportResponse(report.getId(), report.getTargetType(), report.getStatus(), report.getReason(),
                report.getCreatedAt(), report.getReviewedAt(), evidences.stream().map(Evidence::of).toList());
    }
}
