package com.testmoa.backend.dto.response;

import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.Restriction;
import com.testmoa.backend.global.util.Masking;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 운영자 회원 목록·상세(#86). 목록에는 실명·이메일을 넣지 않고(null), 상세에서도 가려서 준다
 *
 * @param activeRestrictions 지금 막힌 기능
 * @param sanctions          제재 이력, 최근 순(상세에서만)
 * @param receivedReports    받은 신고, 최신순(상세에서만)
 */
public record AdminUserResponse(
        Long id,
        String nickname,
        LocalDateTime joinedAt,
        String maskedName,
        String maskedEmail,
        long sanctionCount,
        long pendingReportCount,
        List<Restriction> activeRestrictions,
        List<SanctionResponse> sanctions,
        List<ReportResponse> receivedReports
) {
    public static AdminUserResponse row(User user, long sanctionCount, long pendingReportCount, List<Restriction> activeRestrictions) {
        return new AdminUserResponse(user.getId(), user.getNickname(), user.getCreatedAt(), null, null,
                sanctionCount, pendingReportCount, activeRestrictions, null, null);
    }

    public static AdminUserResponse detail(User user, long pendingReportCount, List<Restriction> activeRestrictions,
                                           List<SanctionResponse> sanctions, List<ReportResponse> receivedReports) {
        String name = user.getName() == null || user.getName().isBlank() ? null : Masking.name(user.getName());
        return new AdminUserResponse(user.getId(), user.getNickname(), user.getCreatedAt(), name, Masking.email(user.getEmail()),
                sanctions.size(), pendingReportCount, activeRestrictions, sanctions, receivedReports);
    }
}
