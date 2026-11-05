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
    @DisplayName("HOLDER·ACCOUNT 반려는 회원 응답에 rejectMemo를 넣지 않는다")
    void hidesOperatorMemoForFixedReasons() {
        CashoutRequest holder = baseRequest();
        holder.reject(CashoutRejectReason.HOLDER, "운영자 확인 메모", NOW);

        CashoutResponse response = CashoutResponse.of(holder);

        assertEquals(CashoutRejectReason.HOLDER, response.getRejectReason());
        assertNull(response.getRejectMemo());
    }

    @Test
    @DisplayName("OTHER 반려는 rejectMemo를 회원에게 보인다")
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
