package com.testmoa.backend.dto.response;

import com.testmoa.backend.entity.Report;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.ReportStatus;
import com.testmoa.backend.entity.enums.ReportTargetType;
import com.testmoa.backend.global.util.Masking;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 운영자 신고 목록·상세(#85). 이름은 가운데를 가린다(이재용 → 이*용). 닉네임과 회원 id는 그대로 준다
 *
 * @param target    대상 내용. 목록에는 피드백 원문을 넣지 않는다
 * @param evidences 증거 파일. 목록에서는 null, 상세에서만 채운다
 */
public record AdminReportResponse(
        Long id,
        ReportTargetType targetType,
        Long targetId,
        Target target,
        String reason,
        ReportStatus status,
        LocalDateTime createdAt,
        LocalDateTime reviewedAt,
        Member reporter,
        Member reportedUser,
        Member reviewer,
        List<ReportResponse.Evidence> evidences
) {
    /**
     * @param recruitmentTitle 관련 모집 건 이름(피드백·모집 글·채팅). 회원 신고는 null
     * @param feedbackContent  피드백 원문(상세에서만)
     * @param roomKey          채팅방(채팅 신고만)
     * @param nickname         신고 대상 회원의 닉네임(회원 신고만)
     */
    public record Target(String recruitmentTitle, String feedbackContent, String roomKey, String nickname) {
        public static final Target EMPTY = new Target(null, null, null, null);
    }

    public record Member(Long id, String nickname, String maskedName) {
        static Member of(User user) {
            if (user == null) return null;
            String name = user.getName() == null || user.getName().isBlank() ? user.getNickname() : user.getName();
            return new Member(user.getId(), user.getNickname(), Masking.name(name));
        }
    }

    public static AdminReportResponse of(Report report, Target target, List<ReportResponse.Evidence> evidences) {
        return new AdminReportResponse(report.getId(), report.getTargetType(), report.getTargetId(), target, report.getReason(),
                report.getStatus(), report.getCreatedAt(), report.getReviewedAt(),
                Member.of(report.getReporter()), Member.of(report.getReportedUser()), Member.of(report.getReviewer()), evidences);
    }
}
