package com.testmoa.backend.service;

import com.testmoa.backend.entity.Feedback;
import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.Register;
import com.testmoa.backend.entity.enums.FeedbackStatus;

import java.time.LocalDateTime;
import java.util.Collection;

/**
 * 테스터 화면의 참여 상태(#117, #118). 저장하지 않고 참가 상태, 피드백 상태, 마감일로 계산한다.
 * 이름은 프론트 ParticipationStatus와 같다. 참여 취소(cancelled)는 프론트에 아직 없는 상태다
 */
public final class ParticipationStatuses {
    private ParticipationStatuses() {}

    /**
     * @param feedbacks 이 참가의 피드백. 제출 전이면 비어 있다
     * @param now       서버 시간대의 지금
     */
    public static String of(Register register, Collection<Feedback> feedbacks, LocalDateTime now) {
        Recruitment recruitment = register.getRecruitment();
        return switch (register.getStatus()) {
            // 모집이 끝나면 확정·거절을 할 수 없어(#115) 그때까지 대기면 선정되지 않은 것이다
            case APPLIED -> now.isBefore(recruitment.getRecruitDeadline()) ? "selectionPending" : "notSelected";
            case REJECTED -> "notSelected";
            case CANCELLED -> "cancelled";
            case CONFIRMED -> confirmed(recruitment, feedbacks, now);
        };
    }

    // 피드백이 없으면 제출 마감 전후로, 있으면 피드백 상태로 나눈다. 한 건이라도 신고되면 참가 전체가 검토 중이다(#66)
    private static String confirmed(Recruitment recruitment, Collection<Feedback> feedbacks, LocalDateTime now) {
        if (feedbacks.isEmpty()) return now.isBefore(recruitment.getFeedbackDeadline()) ? "beforeSubmit" : "incomplete";
        if (has(feedbacks, FeedbackStatus.REPORTED)) return "underReview";
        if (has(feedbacks, FeedbackStatus.EXCLUDED)) return "excluded";
        if (feedbacks.stream().allMatch(feedback -> feedback.getStatus() == FeedbackStatus.REWARDED)) return "paid";
        return "payoutPending";
    }

    private static boolean has(Collection<Feedback> feedbacks, FeedbackStatus status) {
        return feedbacks.stream().anyMatch(feedback -> feedback.getStatus() == status);
    }
}
