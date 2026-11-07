package com.testmoa.backend.global.util;

import com.testmoa.backend.entity.Cashout;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class AccountMaskingTest {

    @Test
    @DisplayName("REQUESTED는 계좌 전체")
    void requestedShowsFull() {
        assertEquals("100012345678", AccountMasking.mask("100012345678", Cashout.Status.REQUESTED));
    }

    @Test
    @DisplayName("PAID·REJECTED는 끝 4자리")
    void completedMasks() {
        assertEquals("****5678", AccountMasking.mask("100012345678", Cashout.Status.PAID));
        assertEquals("****5678", AccountMasking.mask("100012345678", Cashout.Status.REJECTED));
    }

    @Test
    @DisplayName("REQUESTED는 예금주 전체")
    void requestedShowsFullHolder() {
        assertEquals("한서윤", AccountMasking.maskHolder("한서윤", Cashout.Status.REQUESTED));
    }

    @Test
    @DisplayName("PAID·REJECTED는 예금주 가운데를 가린다")
    void completedMasksHolder() {
        assertEquals("한*윤", AccountMasking.maskHolder("한서윤", Cashout.Status.PAID));
        assertEquals("김*", AccountMasking.maskHolder("김철", Cashout.Status.REJECTED));
        assertEquals("*", AccountMasking.maskHolder("오", Cashout.Status.PAID));
    }
}
