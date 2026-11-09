package com.testmoa.backend.service.admin.impl;

import com.testmoa.backend.dto.response.AdminReportResponse;
import com.testmoa.backend.dto.response.AdminReportResponse.Target;
import com.testmoa.backend.dto.response.ReportResponse;
import com.testmoa.backend.entity.Report;
import com.testmoa.backend.entity.enums.FeedbackStatus;
import com.testmoa.backend.entity.enums.ReportStatus;
import com.testmoa.backend.entity.enums.ReportTargetType;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.repository.ChatRoomRepository;
import com.testmoa.backend.repository.FeedbackRepository;
import com.testmoa.backend.repository.RecruitmentRepository;
import com.testmoa.backend.repository.ReportEvidenceRepository;
import com.testmoa.backend.repository.ReportRepository;
import com.testmoa.backend.repository.UserRepository;
import com.testmoa.backend.service.admin.AdminReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminReportServiceImpl implements AdminReportService {

    private static final List<ReportStatus> PENDING = List.of(ReportStatus.PENDING);
    private static final List<ReportStatus> DONE = List.of(ReportStatus.REJECTED, ReportStatus.ACCEPTED);

    private final ReportRepository reportRepository;
    private final ReportEvidenceRepository evidenceRepository;
    private final UserRepository userRepository;
    private final FeedbackRepository feedbackRepository;
    private final RecruitmentRepository recruitmentRepository;
    private final ChatRoomRepository chatRoomRepository;

    /**
     * 신고 목록. 행마다 대상의 모집 건 이름을 읽는다.
     * ponytail: 행마다 대상 조회 한 번(N+1). 신고가 많아지면 대상 종류별로 모아 한 번에 읽는다
     */
    @Override
    public List<AdminReportResponse> list(boolean done, ReportTargetType targetType) {
        List<Report> reports = done ? reportRepository.findDone(DONE, targetType) : reportRepository.findPending(PENDING, targetType);
        return reports.stream().map(report -> AdminReportResponse.of(report, target(report, false), null)).toList();
    }

    @Override
    public AdminReportResponse get(Long reportId) {
        Report report = reportRepository.findById(reportId).orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        return detail(report);
    }

    @Override
    @Transactional
    public AdminReportResponse review(Long adminId, Long reportId, ReportStatus result) {
        if (result == ReportStatus.PENDING) {
            String message = "처리 결과는 기각이나 인정이어야 해요";
            throw new BusinessException(ErrorCode.INVALID_INPUT, message, Map.of("result", message));
        }
        // 신고 행을 잠가 두 운영자가 동시에 판정해도 하나만 된다
        Report report = reportRepository.findByIdForUpdate(reportId).orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (report.getStatus() != ReportStatus.PENDING) throw new BusinessException(ErrorCode.REPORT_ALREADY_REVIEWED);

        report.review(userRepository.getReferenceById(adminId), result, LocalDateTime.now());
        if (report.getTargetType() == ReportTargetType.FEEDBACK) {
            // 기각하면 제출(SUBMITTED)로 되돌려 승인 대기에 다시 잡히게 하고, 인정하면 보상 제외(EXCLUDED).
            // 지급 기록(크레딧 원장)은 여기서 남기지 않는다. 실제 지급은 지급 담당의 72시간 자동 지급이 한다
            feedbackRepository.findById(report.getTargetId())
                    .filter(feedback -> feedback.getStatus() == FeedbackStatus.REPORTED)
                    .ifPresent(feedback -> {
                        if (result == ReportStatus.ACCEPTED) feedback.exclude();
                        else feedback.dismissReport();
                    });
        }
        return detail(report);
    }

    private AdminReportResponse detail(Report report) {
        List<ReportResponse.Evidence> evidences = evidenceRepository.findByReportIdOrderBySortOrderAsc(report.getId()).stream()
                .map(ReportResponse.Evidence::of).toList();
        return AdminReportResponse.of(report, target(report, true), evidences);
    }

    // 대상 내용. 대상이 지워졌으면 빈 값. 피드백 원문은 상세에서만 넣는다
    private Target target(Report report, boolean withContent) {
        Long id = report.getTargetId();
        return switch (report.getTargetType()) {
            case FEEDBACK -> feedbackRepository.findWithRecruitmentById(id)
                    .map(feedback -> new Target(feedback.getRegister().getRecruitment().getTitle(),
                            withContent ? feedback.getContent() : null, null, null))
                    .orElse(Target.EMPTY);
            case RECRUITMENT -> recruitmentRepository.findById(id)
                    .map(recruitment -> new Target(recruitment.getTitle(), null, null, null))
                    .orElse(Target.EMPTY);
            case CHAT -> chatRoomRepository.findById(id)
                    .map(room -> new Target(room.getRecruitment().getTitle(), null, room.getRoomKey(), null))
                    .orElse(Target.EMPTY);
            case USER -> userRepository.findById(id)
                    .map(user -> new Target(null, null, null, user.getNickname()))
                    .orElse(Target.EMPTY);
        };
    }
}
