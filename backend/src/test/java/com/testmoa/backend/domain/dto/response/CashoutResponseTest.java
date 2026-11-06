package com.testmoa.backend.domain.dto.response;

import com.testmoa.backend.domain.entity.CashoutRequest;
import com.testmoa.backend.global.common.CashoutRejectReason;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class CashoutResponseTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 11, 5, 12, 0);

    @Test
    @DisplayName("#67-S6 HOLDER 반려도 메모가 있으면 회원에게 보인다")
    void keepsMemoForFixedReasons() {
        CashoutRequest holder = baseRequest();
        holder.reject(CashoutRejectReason.HOLDER, "통장 사본의 이름과 달라요", NOW);

        CashoutResponse response = CashoutResponse.of(holder);

        assertEquals(CashoutRejectReason.HOLDER, response.getRejectReason());
        assertEquals("통장 사본의 이름과 달라요", response.getRejectMemo());
    }

    @Test
    @DisplayName("#67-S6 메모 없는 ACCOUNT 반려는 rejectMemo가 null")
    void nullMemoWhenNotWritten() {
        CashoutRequest account = baseRequest();
        account.reject(CashoutRejectReason.ACCOUNT, "  ", NOW);

        assertNull(CashoutResponse.of(account).getRejectMemo());
    }

    @Test
    @DisplayName("#67-S6 OTHER 반려는 rejectMemo를 회원에게 보인다")
    void keepsMemoForOther() {
        CashoutRequest other = baseRequest();
        other.reject(CashoutRejectReason.OTHER, "서류가 부족해요", NOW);

        CashoutResponse response = CashoutResponse.of(other);

        assertEquals(CashoutRejectReason.OTHER, response.getRejectReason());
        assertEquals("서류가 부족해요", response.getRejectMemo());
    }

    private static CashoutRequest baseRequest() {
        return CashoutRequest.builder()
                .user(null)
                .amount(3000)
                .bank("토스뱅크")
                .accountNumber("100012345678")
                .accountHolder("한서윤")
                .build();
    }
}
