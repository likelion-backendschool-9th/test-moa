package com.testmoa.backend.service.impl;

import com.testmoa.backend.dto.response.FeedbackResponse;
import com.testmoa.backend.entity.Feedback;
import com.testmoa.backend.entity.FeedbackImage;
import com.testmoa.backend.entity.enums.FeedbackStatus;
import com.testmoa.backend.entity.enums.ReportStatus;
import com.testmoa.backend.entity.enums.ReportTargetType;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.repository.FeedbackImageRepository;
import com.testmoa.backend.repository.FeedbackRepository;
import com.testmoa.backend.repository.RecruitmentRepository;
import com.testmoa.backend.repository.ReportRepository;
import com.testmoa.backend.global.file.FileStorage;
import com.testmoa.backend.service.FeedbackService;
import com.testmoa.backend.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FeedbackServiceImpl implements FeedbackService {

    // 제출 후 이 시간 안에만 신고할 수 있다. 신고가 없으면 지나서 보상을 지급한다
    private static final Duration REPORT_WINDOW = Duration.ofHours(72);

    private final FileStorage fileStorage;
    private final RecruitmentRepository recruitmentRepository;
    private final FeedbackRepository feedbackRepository;
    private final FeedbackImageRepository feedbackImageRepository;
    private final ReportService reportService;
    private final ReportRepository reportRepository;

    @Override
    @Transactional(readOnly = true)
    public List<FeedbackResponse> findFeedbacks(Long userId, Long recruitmentId) {
        recruitmentRepository.findMineWithProject(recruitmentId, userId).orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        List<Feedback> feedbacks = feedbackRepository.findWithUserByRecruitmentId(recruitmentId);
        Map<Long, List<String>> images = feedbackImageRepository.findByFeedbackIdInOrderByIdAsc(feedbacks.stream().map(Feedback::getId).toList())
                .stream().collect(Collectors.groupingBy(image -> image.getFeedback().getId(),
                        Collectors.mapping(image -> feedbackImageUrl(image.getFeedback().getId(),
                                image.getUrl().substring(image.getUrl().lastIndexOf('/') + 1)), Collectors.toList())));
        return feedbacks.stream().map(feedback -> new FeedbackResponse(
                feedback.getId(),
                feedback.getRegister().getId(),
                feedback.getRegister().getUser().getNickname(),
                feedback.getTestItem() == null ? null : feedback.getTestItem().getId(),
                feedback.getContent(),
                images.getOrDefault(feedback.getId(), List.of()),
                feedback.getSubmittedAt(),
                feedback.getStatus().name().toLowerCase(),
                feedback.isRecommended())).toList();
    }

    @Override
    @Transactional
    public void recommend(Long userId, Long feedbackId, boolean recommended) {
        findMine(userId, feedbackId).updateRecommended(recommended);
    }

    @Override
    @Transactional
    public void report(Long userId, Long feedbackId, String reason) {
        Feedback feedback = findMine(userId, feedbackId);
        if (feedback.getStatus() != FeedbackStatus.SUBMITTED
                || !LocalDateTime.now().isBefore(feedback.getSubmittedAt().plus(REPORT_WINDOW))) {
            throw new BusinessException(ErrorCode.FEEDBACK_NOT_REPORTABLE);
        }
        // 기각되면 제출 상태로 돌아오므로, 같은 피드백을 다시 신고해 지급을 또 멈추지 못하게 한다
        if (reportRepository.existsByReporterIdAndTargetTypeAndTargetIdAndStatus(userId, ReportTargetType.FEEDBACK, feedbackId, ReportStatus.REJECTED)) {
            throw new BusinessException(ErrorCode.FEEDBACK_REPORT_DISMISSED);
        }
        feedback.report(reason.trim());
        // 운영자 신고 화면(#85)에서 판정할 수 있게 신고 행도 남긴다. 판정하면 reward()·exclude()를 부른다
        reportService.recordFeedbackReport(userId, feedback, reason.trim());
    }

    @Override
    @Transactional(readOnly = true)
    public FileStorage.ImageFile loadFeedbackImage(Long userId, Long feedbackId, String name) {
        Feedback feedback = findMine(userId, feedbackId);
        return fileStorage.loadImage(FeedbackImage.FOLDER + "/" + feedback.getRegister().getId(), name)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    private static String feedbackImageUrl(Long feedbackId, String name) {
        return "/api/v1/developer/feedbacks/" + feedbackId + "/images/" + name;
    }

    // 내 프로젝트의 피드백. 다른 회원의 피드백은 없는 것과 같다
    private Feedback findMine(Long userId, Long feedbackId) {
        return feedbackRepository.findWithRecruitmentById(feedbackId)
                .filter(found -> found.getRegister().getRecruitment().getProject().getUser().getId().equals(userId))
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }
}
