package com.testmoa.backend.global.common;

import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class LedgerFlowTest {

    @Test
    @DisplayName("#66-S2 type all·in·out·기본값")
    void parsesKnownTypes() {
        assertEquals(LedgerFlow.ALL, LedgerFlow.fromQuery("all"));
        assertEquals(LedgerFlow.ALL, LedgerFlow.fromQuery(null));
        assertEquals(LedgerFlow.ALL, LedgerFlow.fromQuery(""));
        assertEquals(LedgerFlow.IN, LedgerFlow.fromQuery("in"));
        assertEquals(LedgerFlow.OUT, LedgerFlow.fromQuery("out"));
    }

    @Test
    @DisplayName("#66-S2 잘못된 type은 400")
    void rejectsUnknownType() {
        BusinessException ex = assertThrows(
                BusinessException.class,
                () -> LedgerFlow.fromQuery("foo")
        );
        assertEquals(ErrorCode.INVALID_INPUT, ex.getErrorCode());
    }
}
