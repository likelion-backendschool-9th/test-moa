package com.testmoa.backend.global.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class MaskingTest {

    @Test
    @DisplayName("계좌번호는 끝 4자리만 남긴다")
    void accountNumberKeepsLastFour() {
        assertEquals("****5678", Masking.accountNumber("100012345678"));
        assertEquals("****", Masking.accountNumber("1234"));
        assertNull(Masking.accountNumber(null));
    }

    @Test
    @DisplayName("이름은 앞·뒤 글자만 남긴다")
    void nameKeepsFirstAndLast() {
        assertEquals("한*윤", Masking.name("한서윤"));
        assertEquals("김*", Masking.name("김철"));
        assertEquals("*", Masking.name("오"));
        assertNull(Masking.name(null));
    }
}
