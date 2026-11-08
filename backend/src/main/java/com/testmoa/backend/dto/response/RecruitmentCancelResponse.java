package com.testmoa.backend.dto.response;

import java.time.LocalDateTime;

/**
 * 모집 취소 결과(#116)
 *
 * @param cancelReason          테스트 전 취소는 null
 * @param cancelledRegisterCount 참여 취소가 된 참가 수(대기 지원 + 피드백을 내지 않은 확정 테스터)
 * @param keptRegisterCount      피드백을 내서 확정으로 남은 참가 수
 */
public record RecruitmentCancelResponse(
        Long id,
        String status,
        String cancelReason,
        LocalDateTime cancelledAt,
        int cancelledRegisterCount,
        int keptRegisterCount
) {}
