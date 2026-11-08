package com.testmoa.backend.dto.request;

import jakarta.validation.constraints.Size;

/**
 * 모집 취소 본문(#116). 사유는 테스트 중일 때만 필수이고 모집 중이면 받지 않는다. 그 판단은 서비스가 한다
 */
public record RecruitmentCancelRequest(
        @Size(max = 300, message = "취소 사유는 300자까지 쓸 수 있어요")
        String reason
) {}
