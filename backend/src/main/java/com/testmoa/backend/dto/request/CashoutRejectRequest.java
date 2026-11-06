package com.testmoa.backend.dto.request;

import com.testmoa.backend.entity.enums.CashoutRejectReason;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * 운영자 반려 본문. 사유가 기타(OTHER)면 메모 필수라는 규칙은 엔티티 reject()가 본다.
 * 메모는 회원에게 그대로 보인다.
 */
public record CashoutRejectRequest(
        @NotNull(message = "반려 사유를 골라 주세요")
        CashoutRejectReason reason,

        @Size(max = 80, message = "메모는 80자까지 쓸 수 있어요")
        String memo
) {}
