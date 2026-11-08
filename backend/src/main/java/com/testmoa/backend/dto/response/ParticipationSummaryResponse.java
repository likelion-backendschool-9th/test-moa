package com.testmoa.backend.dto.response;

/**
 * 참여 테스트 화면의 탭별 개수와 한 줄 요약(#117)
 *
 * @param feedbackToSubmit     제출할 피드백 수(제출 전 참여 수)
 * @param payoutPendingCredits 지급 대기 중인 보상 합
 */
public record ParticipationSummaryResponse(Counts counts, int feedbackToSubmit, int payoutPendingCredits) {
    /** 탭별 개수. 이름은 프론트 ParticipationTab과 같다 */
    public record Counts(int applied, int ongoing, int history) {}
}
