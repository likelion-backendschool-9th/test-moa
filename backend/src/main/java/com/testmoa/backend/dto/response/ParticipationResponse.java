package com.testmoa.backend.dto.response;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 테스터의 내 참여 상세(#118). status는 프론트 ParticipationStatus 이름이다(참여 취소는 cancelled)
 *
 * @param payoutAt      자동 지급 예정 시각(제출 + 72시간). 지급 대기일 때만 있다
 * @param earnedCredits 받은 크레딧. 지급 완료가 아니면 0
 * @param reward        확정한 참가는 고정한 보상(기본 + 추가), 확정 전에는 지금 기준 금액
 * @param accessUrl     테스트 접속 링크. 참여가 확정된 테스터에게만 준다
 * @param feedbacks     제출한 피드백. 제출 전이면 빈 배열. 기타 의견은 testItemId가 null
 */
public record ParticipationResponse(
        Long id,
        String status,
        LocalDateTime appliedAt,
        LocalDateTime confirmedAt,
        LocalDateTime submittedAt,
        LocalDateTime payoutAt,
        int earnedCredits,
        int reward,
        RecruitmentInfo recruitment,
        String accessUrl,
        List<TestItemInfo> testItems,
        List<FeedbackInfo> feedbacks
) {
    /** 참여한 모집글. 상태와 유형 이름은 공개 상세(#113)와 같다 */
    public record RecruitmentInfo(Long id, String title, String description, String projectName, String projectImageUrl,
                                  String status, String selectionMode, String softwareType, boolean subscription,
                                  LocalDateTime recruitDeadline, LocalDateTime submitDeadline) {}

    /** 피드백을 쓸 테스트 항목. 저장 순서대로 */
    public record TestItemInfo(Long id, String title, String description, boolean required) {}

    /** 제출한 피드백 한 건 */
    public record FeedbackInfo(Long testItemId, String content) {}
}
