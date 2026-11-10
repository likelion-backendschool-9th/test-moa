package com.testmoa.backend.global.util;

/**
 * 개인정보 가리기 도구. 항상 가린 값을 돌려준다. 가릴지 말지는 부르는 쪽이 정한다.
 */
public final class Masking {

    private Masking() {}

    /**
     * 계좌번호. 끝 4자리만 남긴다. 4자리 이하는 전부 가린다.
     */
    public static String accountNumber(String accountNumber) {
        if (accountNumber == null) {
            return null;
        }
        if (accountNumber.length() <= 4) {
            return "****";
        }
        return "****" + accountNumber.substring(accountNumber.length() - 4);
    }

    /**
     * 이름. 한 글자는 `*`, 두 글자는 앞 글자만, 세 글자 이상은 앞·뒤만 남긴다.
     * 예: 김철 → 김*, 한서윤 → 한*윤
     */
    public static String name(String name) {
        if (name == null) {
            return null;
        }
        int length = name.codePointCount(0, name.length());
        if (length <= 1) {
            return "*";
        }
        int firstEnd = name.offsetByCodePoints(0, 1);
        String first = name.substring(0, firstEnd);
        if (length == 2) {
            return first + "*";
        }
        int lastStart = name.offsetByCodePoints(0, length - 1);
        return first + "*".repeat(length - 2) + name.substring(lastStart);
    }

    /**
     * 이메일. 아이디 앞 두 글자만 남기고 도메인은 그대로 둔다. 두 글자 이하는 앞 한 글자만.
     * 예: member04@example.com → me***@example.com
     */
    public static String email(String email) {
        if (email == null) {
            return null;
        }
        int at = email.indexOf('@');
        if (at <= 0) {
            return "***";
        }
        String local = email.substring(0, at);
        int keep = local.length() <= 2 ? 1 : 2;
        return local.substring(0, keep) + "***" + email.substring(at);
    }
}
