package com.testmoa.backend.service;

/**
 * 참가를 확정할 때 고정하는 보상액(#114, #115). 11-07 팀 채팅에서 추가 보상은 빼고 기본 보상만 임의 금액으로 먼저 정했다.
 * 금액을 바꾸면 그 뒤 확정하는 참가부터 적용되고, 이미 확정한 참가는 스냅샷이라 그대로다
 */
public final class RewardPolicy {
    private RewardPolicy() {}

    /** 기본 보상 크레딧. 프론트 BASE_REWARD와 같은 값 */
    public static final int BASE_REWARD = 1000;

    /** 추가 보상 크레딧. 지금은 주지 않는다 */
    public static final int EXTRA_REWARD = 0;
}
