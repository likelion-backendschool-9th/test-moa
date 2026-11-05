package com.testmoa.backend.global.common;

// 로그인 방식. 이메일 가입·구글·깃허브 세 가지만 쓴다
public enum Provider {
    LOCAL,  // 로컬(이메일)
    GOOGLE, // 구글
    GITHUB  // 깃허브
}
