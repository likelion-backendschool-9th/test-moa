package com.testmoa.backend.entity.enums;

// 사용자 계정 상태
public enum UserStatus {
    ACTIVE,     // 활성
    SUSPENDED,  // 정지
    WITHDRAWN,  // 탈퇴 유예(30일 안에 되돌릴 수 있다)
    DELETED     // 파기 완료(개인정보를 지웠다. 되돌릴 수 없다)
}
