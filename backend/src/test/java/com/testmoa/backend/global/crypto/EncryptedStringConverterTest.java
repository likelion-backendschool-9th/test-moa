package com.testmoa.backend.global.crypto;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

class EncryptedStringConverterTest {

    private static final String KEY = "dGVzdC1jYXNob3V0LWtleS0zMi1ieXRlcy1sb25nISE=";

    private EncryptedStringConverter converter;

    @BeforeEach
    void setUp() {
        converter = new EncryptedStringConverter(KEY);
    }

    @Test
    @DisplayName("암·복호화하면 원래 문자열이 된다")
    void roundTrip() {
        String plain = "100012345678";
        String encrypted = converter.convertToDatabaseColumn(plain);
        assertEquals(plain, converter.convertToEntityAttribute(encrypted));
    }

    @Test
    @DisplayName("암호문은 평문을 포함하지 않는다")
    void cipherTextIsNotPlain() {
        String plain = "한서윤";
        String encrypted = converter.convertToDatabaseColumn(plain);
        assertNotEquals(plain, encrypted);
        assertFalse(encrypted.contains(plain));
    }
}
