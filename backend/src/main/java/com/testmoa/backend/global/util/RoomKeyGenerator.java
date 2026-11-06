package com.testmoa.backend.global.util;

import java.security.SecureRandom;

/**
 * 채팅방 주소(/my/chats/{roomKey})에 쓰는 키를 만든다.
 * 주소만 보고 다른 방을 추측할 수 없도록 SecureRandom으로 base62 22자(약 131비트)를 뽑는다.
 */
public final class RoomKeyGenerator {
    public static final int LENGTH = 22;

    private static final char[] ALPHABET =
            "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".toCharArray();
    private static final SecureRandom RANDOM = new SecureRandom();

    private RoomKeyGenerator() {
    }

    public static String generate() {
        char[] key = new char[LENGTH];
        for (int i = 0; i < LENGTH; i++) {
            key[i] = ALPHABET[RANDOM.nextInt(ALPHABET.length)];
        }
        return new String(key);
    }
}
