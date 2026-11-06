package com.testmoa.backend.dto.response;

import com.testmoa.backend.entity.CreditWallet;
import lombok.Builder;
import lombok.Getter;

/**
 * 크레딧 잔액 구성과 파생 값.
 * pendingReward는 Feedback(SUBMITTED)가 있는 Register 스냅샷 합이며 wallet에 저장하지 않는다.
 */
@Getter
@Builder
public class CreditBalanceResponse {
    private Long userId;
    /** 적립 크레딧. 잠긴 분 미포함 */
    private Integer earnedBalance;
    /** 이벤트 크레딧. 구독 결제 전용 */
    private Integer eventCredit;
    /** 출금 처리 중이라 잠긴 크레딧 */
    private Integer lockedBalance;
    /** 승인 대기 보상. 잔액에 포함하지 않음 */
    private Integer pendingReward;
    /** earnedBalance + eventCredit + lockedBalance */
    private Integer totalCredits;
    /** 구독 결제에 쓸 수 있는 크레딧 = earnedBalance + eventCredit */
    private Integer payableCredits;
    /** 지금 출금 신청할 수 있는 크레딧 = earnedBalance */
    private Integer cashableCredits;

    public static CreditBalanceResponse of(Long userId, CreditWallet wallet, int pendingReward) {
        return CreditBalanceResponse.builder()
                .userId(userId)
                .earnedBalance(wallet.getEarnedBalance())
                .eventCredit(wallet.getEventCredit())
                .lockedBalance(wallet.getLockedBalance())
                .pendingReward(pendingReward)
                .totalCredits(wallet.total())
                .payableCredits(wallet.payable())
                .cashableCredits(wallet.cashable())
                .build();
    }

    /** 지갑이 아직 없을 때 잔액은 0, 승인 대기만 반영한다 */
    public static CreditBalanceResponse empty(Long userId, int pendingReward) {
        return CreditBalanceResponse.builder()
                .userId(userId)
                .earnedBalance(0)
                .eventCredit(0)
                .lockedBalance(0)
                .pendingReward(pendingReward)
                .totalCredits(0)
                .payableCredits(0)
                .cashableCredits(0)
                .build();
    }
}
