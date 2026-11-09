package com.testmoa.backend.dto.response;

import com.testmoa.backend.dto.response.AdminReportResponse.Member;
import com.testmoa.backend.entity.Sanction;
import com.testmoa.backend.entity.enums.Restriction;
import com.testmoa.backend.entity.enums.SanctionType;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 운영자가 보는 제재 한 건(#86). 회원 본인에게는 MySanctionResponse를 준다
 *
 * @param active 지금 걸려 있는지(해제 전, 시작함, 끝나지 않은 정지)
 */
public record SanctionResponse(
        Long id,
        SanctionType type,
        List<Restriction> restrictions,
        String reason,
        LocalDateTime startedAt,
        LocalDateTime endsAt,
        LocalDateTime releasedAt,
        String releaseReason,
        boolean active,
        Member sanctionedBy,
        Member releasedBy
) {
    public static SanctionResponse of(Sanction sanction, LocalDateTime now) {
        return new SanctionResponse(sanction.getId(), sanction.getType(), sanction.getRestrictions().stream().sorted().toList(),
                sanction.getReason(), sanction.getStartedAt(), sanction.getEndsAt(), sanction.getReleasedAt(),
                sanction.getReleaseReason(), sanction.isActive(now),
                Member.of(sanction.getSanctionedBy()), Member.of(sanction.getReleasedBy()));
    }
}
