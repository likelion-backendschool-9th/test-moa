package com.testmoa.backend.service;

public interface SignupCreditService {
    /**
     * 가입 크레딧(이벤트 크레딧)을 지급한다. 지갑이 없으면 만들고 장부에 "가입 크레딧" EVENT 한 줄을 남긴다.
     * 호출한 쪽의 트랜잭션에 참여하므로 가입 안에서 부르면 가입과 함께 되돌아간다.
     *
     * @return 지급했으면 true. 이미 받았거나 지급액이 0 이하면 false
     */
    boolean grant(Long userId);
}
