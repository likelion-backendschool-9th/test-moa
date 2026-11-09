package com.testmoa.backend.service.admin;

import com.testmoa.backend.dto.response.AdminReportResponse;
import com.testmoa.backend.entity.enums.ReportStatus;
import com.testmoa.backend.entity.enums.ReportTargetType;

import java.util.List;

/**
 * 운영자 신고 검토(#85). 운영자 권한은 SecurityConfig(/api/v1/admin/**)가 확인한다
 */
public interface AdminReportService {
    // done이면 처리 완료(최근 처리 순), 아니면 검토 대기(오래된 순). targetType이 null이면 전체
    List<AdminReportResponse> list(boolean done, ReportTargetType targetType);

    // 상세: 대상 내용(피드백 원문 포함)과 증거
    AdminReportResponse get(Long reportId);

    // 판정. 검토 대기일 때 한 번만. 피드백 신고는 기각하면 reward(), 인정하면 exclude()
    AdminReportResponse review(Long adminId, Long reportId, ReportStatus result);
}
