package com.testmoa.backend.global.util;

/**
 * JPQL {@code like :pattern escape '\'}에 넘길 패턴을 만든다. {@code %}, {@code _}는 글자 그대로 찾는다.
 */
public final class LikePattern {

    private LikePattern() {}

    /** 검색어가 들어간 값을 찾는 패턴({@code %검색어%}). 쿼리는 {@code escape '\'}를 붙여야 한다 */
    public static String contains(String keyword) {
        return "%" + keyword.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
    }
}
