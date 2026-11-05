package com.testmoa.backend.domain.entity;

import com.testmoa.backend.global.common.CashoutRejectReason;
import com.testmoa.backend.global.common.CashoutStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

class CashoutRequestTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 11, 5, 10, 0);

    private CashoutRequest newRequest() {
        return CashoutRequest.builder()
                .user(null)
                .amount(5000)
                .bank("국민")
                .accountNumber("1234567890")
                .accountHolder("홍길동")
                .build();
    }

    @Test
    @DisplayName("#45-S13 신청 상태는 REQUESTED")
    void 만들_때_상태는_REQUESTED다() {
        assertEquals(CashoutStatus.REQUESTED, newRequest().getStatus());
    }

    @Test
    @DisplayName("#45-S14 지급은 REQUESTED에서 PAID로")
    void pay는_REQUESTED에서_PAID로_바꾼다() {
        CashoutRequest request = newRequest();

        request.pay(NOW);

        assertEquals(CashoutStatus.PAID, request.getStatus());
        assertEquals(NOW, request.getProcessedAt());
    }

    @Test
    @DisplayName("#45-S15 이미 처리한 요청은 지급 거절")
    void pay는_이미_처리한_요청이면_거절한다() {
        CashoutRequest request = newRequest();
        request.pay(NOW);

        assertThrows(IllegalStateException.class, () -> request.pay(NOW.plusMinutes(1)));
    }

    @Test
    @DisplayName("#45-S16 반려는 REQUESTED에서 REJECTED로")
    void reject는_REQUESTED에서_REJECTED로_바꾼다() {
        CashoutRequest request = newRequest();

        request.reject(CashoutRejectReason.HOLDER, "확인 메모", NOW);

        assertEquals(CashoutStatus.REJECTED, request.getStatus());
        assertEquals(CashoutRejectReason.HOLDER, request.getRejectReason());
        assertEquals("확인 메모", request.getRejectMemo());
        assertEquals(NOW, request.getProcessedAt());
    }

    @Test
    @DisplayName("#45-S17 OTHER 반려는 메모 필수")
    void reject는_OTHER면_메모가_필요하다() {
        CashoutRequest request = newRequest();

        assertThrows(
                IllegalArgumentException.class,
                () -> request.reject(CashoutRejectReason.OTHER, "  ", NOW)
        );
    }

    @Test
    @DisplayName("#45-S18 OTHER가 아니면 빈 메모는 저장하지 않음")
    void reject는_OTHER가_아니면_빈_메모를_저장하지_않는다() {
        CashoutRequest request = newRequest();

        request.reject(CashoutRejectReason.ACCOUNT, "   ", NOW);

        assertNull(request.getRejectMemo());
    }

    @Test
    @DisplayName("#45-S19 반려 사유가 없으면 거절")
    void reject는_사유가_없으면_거절한다() {
        CashoutRequest request = newRequest();

        assertThrows(IllegalArgumentException.class, () -> request.reject(null, "메모", NOW));
    }

    @Test
    @DisplayName("#45-S20 이미 처리한 요청은 반려 거절")
    void reject는_이미_처리한_요청이면_거절한다() {
        CashoutRequest request = newRequest();
        request.reject(CashoutRejectReason.HOLDER, null, NOW);

        assertThrows(
                IllegalStateException.class,
                () -> request.reject(CashoutRejectReason.ACCOUNT, null, NOW.plusMinutes(1))
        );
    }
}
