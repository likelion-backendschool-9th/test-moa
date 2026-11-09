package com.testmoa.backend.dto.response;

import com.testmoa.backend.entity.Sanction;
import com.testmoa.backend.entity.enums.Restriction;
import com.testmoa.backend.entity.enums.SanctionType;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 회원이 보는 내 경고·정지(#86). 제재한 운영자, 신고자, 증거는 넣지 않는다
 */
public record MySanctionResponse(
        Long id,
        SanctionType type,
        List<Restriction> restrictions,
        String reason,
        LocalDateTime startedAt,
        LocalDateTime endsAt,
        LocalDateTime releasedAt,
        boolean active
) {
    public static MySanctionResponse of(Sanction sanction, LocalDateTime now) {
        return new MySanctionResponse(sanction.getId(), sanction.getType(), sanction.getRestrictions().stream().sorted().toList(),
                sanction.getReason(), sanction.getStartedAt(), sanction.getEndsAt(), sanction.getReleasedAt(), sanction.isActive(now));
    }
}
