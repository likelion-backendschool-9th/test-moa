package com.testmoa.backend.dto.response;

import com.testmoa.backend.dto.response.ParticipationResponse.RecruitmentInfo;

import java.time.LocalDateTime;

/**
 * 내 참여 목록과 마감 일정의 한 행(#117). 값의 뜻은 내 참여 상세(#118)와 같고, 테스트 항목·피드백·접속 링크는 상세에서 본다
 *
 * @param payoutAt      자동 지급 예정 시각(제출 + 72시간). 지급 대기일 때만 있다
 * @param earnedCredits 받은 크레딧. 지급 완료가 아니면 0
 * @param reward        확정한 참가는 고정한 보상(기본 + 추가), 확정 전에는 지금 기준 금액
 */
public record ParticipationListItemResponse(
        Long id,
        String status,
        LocalDateTime appliedAt,
        LocalDateTime confirmedAt,
        LocalDateTime submittedAt,
        LocalDateTime payoutAt,
        int earnedCredits,
        int reward,
        RecruitmentInfo recruitment
) {}
