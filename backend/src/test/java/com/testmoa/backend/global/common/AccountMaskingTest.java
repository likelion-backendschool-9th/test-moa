package com.testmoa.backend.global.common;

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
}
