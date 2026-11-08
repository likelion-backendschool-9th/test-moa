package com.testmoa.backend.dto.response;

import java.time.LocalDateTime;

/**
 * 테스트 지원 결과(#114). status는 프론트 ApplicationStatus 이름이다
 *
 * @param status      선착순이면 confirmed, 선발형이면 applied
 * @param confirmedAt 확정 시각. 선발형은 null
 * @param baseReward  확정할 때 고정한 기본 보상. 선발형은 null
 */
public record ApplicationResponse(
        Long registerId,
        Long recruitmentId,
        String status,
        LocalDateTime appliedAt,
        LocalDateTime confirmedAt,
        Integer baseReward
) {}
