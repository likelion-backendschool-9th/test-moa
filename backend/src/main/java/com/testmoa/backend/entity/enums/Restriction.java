package com.testmoa.backend.entity.enums;

// 정지로 막을 수 있는 기능(#86, 확정). 각 기능 담당은 자기 서비스에서 sanctionChecker.require(userId, Restriction.X)를 부른다
public enum Restriction {
    LOGIN,     // 로그인
    APPLY,     // 테스트 지원
    RECRUIT,   // 모집 글 작성
    FEEDBACK,  // 피드백 작성
    CHAT       // 채팅
}
