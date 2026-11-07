package com.testmoa.backend.dto.request;

import com.testmoa.backend.entity.Cashout;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * 운영자 출금 처리 본문. 결정(decision)은 PAID(지급 완료) 또는 REJECTED(반려)다.
 * 반려일 때만 사유와 메모를 받는다. 사유가 기타(OTHER)면 메모 필수라는 규칙은 엔티티 reject()가 본다.
 * 메모는 회원에게 그대로 보인다.
 */
public record CashoutProcessRequest(
        @NotNull(message = "지급 완료나 반려를 골라 주세요")
        Cashout.Status decision,

        Cashout.RejectReason reason,

        @Size(max = 80, message = "메모는 80자까지 쓸 수 있어요")
        String memo
) {}
