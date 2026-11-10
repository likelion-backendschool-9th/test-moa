package com.testmoa.backend.service;

import com.testmoa.backend.entity.enums.UserStatus;

import java.util.List;

public interface SignupCreditService {
    /** 소급 지급 대상 상태. 관리자·탈퇴 유예·파기 회원은 대상이 아니고, 정지 중인 회원은 받는다 */
    List<UserStatus> BACKFILL_STATUSES = List.of(UserStatus.ACTIVE, UserStatus.SUSPENDED);

    /**
     * 가입 크레딧(이벤트 크레딧)을 지급한다. 지갑이 없으면 만들고 장부에 "가입 크레딧" EVENT 한 줄을 남긴다.
     * 호출한 쪽의 트랜잭션에 참여하므로 가입 안에서 부르면 가입과 함께 되돌아간다.
     *
     * @return 지급했으면 true. 이미 받았거나 지급액이 0 이하면 false
     */
    boolean grant(Long userId);

    /**
     * 이미 가입한 회원에게 소급 지급한다. 회원 행을 잠근 뒤 권한이 USER이고 상태가 {@link #BACKFILL_STATUSES}인지
     * 다시 확인하고 {@link #grant}를 부른다. 후보를 읽은 뒤 탈퇴한 회원은 탈퇴(회원 행을 잠근다)와 순서가 정해져 지급하지 않는다.
     *
     * @return 지급했으면 true. 대상이 아니게 되었거나 이미 받았으면 false
     */
    boolean grantToExistingMember(Long userId);
}
