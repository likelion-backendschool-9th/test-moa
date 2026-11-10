package com.testmoa.backend.dto.request;

/**
 * 탈퇴 신청(#84). 비밀번호가 있는 회원은 password, 소셜로만 가입한 회원은 confirmText에 "탈퇴합니다"를 보낸다
 */
public record WithdrawRequest(String password, String confirmText) {
    public static final String CONFIRM_TEXT = "탈퇴합니다";
}
