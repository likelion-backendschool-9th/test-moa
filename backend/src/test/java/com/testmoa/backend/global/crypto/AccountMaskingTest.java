package com.testmoa.backend.global.crypto;

import com.testmoa.backend.entity.enums.CashoutStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class AccountMaskingTest {

    @Test
    @DisplayName("REQUESTED는 계좌 전체")
    void requestedShowsFull() {
        assertEquals("100012345678", AccountMasking.mask("100012345678", CashoutStatus.REQUESTED));
    }

    @Test
    @DisplayName("PAID·REJECTED는 끝 4자리")
    void completedMasks() {
        assertEquals("****5678", AccountMasking.mask("100012345678", CashoutStatus.PAID));
        assertEquals("****5678", AccountMasking.mask("100012345678", CashoutStatus.REJECTED));
    }

    @Test
    @DisplayName("REQUESTED는 예금주 전체")
    void requestedShowsFullHolder() {
        assertEquals("한서윤", AccountMasking.maskHolder("한서윤", CashoutStatus.REQUESTED));
    }

    @Test
    @DisplayName("PAID·REJECTED는 예금주 가운데를 가린다")
    void completedMasksHolder() {
        assertEquals("한*윤", AccountMasking.maskHolder("한서윤", CashoutStatus.PAID));
        assertEquals("김*", AccountMasking.maskHolder("김철", CashoutStatus.REJECTED));
        assertEquals("*", AccountMasking.maskHolder("오", CashoutStatus.PAID));
    }
}
