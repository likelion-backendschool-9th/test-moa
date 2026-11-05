package com.testmoa.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity(name = "credit_wallets")
@Getter
@ToString
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CreditWallet {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 지갑 소유 사용자
    @ToString.Exclude
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private User user;

    // 이벤트 크레딧. 구독 결제 가능, 현금화 불가
    @Column(nullable = false)
    private Integer eventCredit;

    // 적립 잔액. 구독 결제·현금화 가능. 잠긴 금액은 포함하지 않는다(출금할 수 있는 금액과 같다)
    @Column(nullable = false)
    private Integer earnedBalance;

    // 잠긴 잔액. 출금 요청 후 처리 중이라 쓸 수 없는 분. earnedBalance와 따로 센다
    @Column(nullable = false)
    private Integer lockedBalance;

    /*
     * 승인 대기 보상(pendingReward)은 wallet 컬럼으로 두지 않는다.
     * Feedback.status=SUBMITTED 인 건의 base+extra 합으로 조회한다.
     */

    // 생성 일시. 저장 시 자동 기록
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // 수정 일시. 저장, 수정 시 자동 기록
    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    /**
     * 회원가입 시 새로운 CreditWallet 엔티티 생성하기 위해 사용하는 빌더 생성자.
     * 모든 잔액은 0으로 시작한다.
     *
     * @param user      지갑 소유 사용자
     */
    @Builder
    public CreditWallet(
            User user
    ){
        this.user = user;
        this.eventCredit = 0;
        this.earnedBalance = 0;
        this.lockedBalance = 0;
    }

    // 출금할 수 있는 금액
    public int cashable() {
        return earnedBalance;
    }

    // 구독 결제에 쓸 수 있는 금액(이벤트 크레딧 + 적립 잔액)
    public int payable() {
        return eventCredit + earnedBalance;
    }

    // 총잔액(이벤트 + 적립 + 출금 처리 중)
    public int total() {
        return eventCredit + earnedBalance + lockedBalance;
    }

    /**
     * 출금 신청 시 적립 잔액을 잠근다.
     * amount만큼 earnedBalance에서 빼고 lockedBalance에 더한다. 장부 행은 만들지 않는다.
     *
     * @param amount 잠글 금액. 1 이상이고 cashable() 이하여야 한다
     */
    public void lockForCashout(int amount) {
        requirePositive(amount);
        if (earnedBalance < amount) {
            throw new IllegalArgumentException("출금할 수 있는 잔액이 부족합니다.");
        }
        this.earnedBalance -= amount;
        this.lockedBalance += amount;
    }

    /**
     * 출금 지급 시 잠긴 잔액을 줄인다.
     * 장부의 EARNED −amount는 서비스가 남긴다.
     *
     * @param amount 지급할 금액. 1 이상이고 lockedBalance 이하여야 한다
     */
    public void confirmCashout(int amount) {
        requirePositive(amount);
        if (lockedBalance < amount) {
            throw new IllegalStateException("잠긴 잔액이 부족합니다.");
        }
        this.lockedBalance -= amount;
    }

    /**
     * 출금 반려 시 잠긴 금액을 적립 잔액으로 되돌린다.
     * 장부 행은 만들지 않는다.
     *
     * @param amount 되돌릴 금액. 1 이상이고 lockedBalance 이하여야 한다
     */
    public void releaseCashout(int amount) {
        requirePositive(amount);
        if (lockedBalance < amount) {
            throw new IllegalStateException("잠긴 잔액이 부족합니다.");
        }
        this.lockedBalance -= amount;
        this.earnedBalance += amount;
    }

    /**
     * 이벤트 크레딧을 지급한다.
     * 장부의 EVENT +amount는 서비스가 남긴다.
     *
     * @param amount 지급 금액. 1 이상
     */
    public void grantEvent(int amount) {
        requirePositive(amount);
        this.eventCredit += amount;
    }

    /**
     * 적립 잔액을 지급한다.
     * 장부의 EARNED +amount는 서비스가 남긴다.
     *
     * @param amount 지급 금액. 1 이상
     */
    public void grantEarned(int amount) {
        requirePositive(amount);
        this.earnedBalance += amount;
    }

    /**
     * 구독 결제에 크레딧을 쓴다. 이벤트 크레딧을 먼저 쓰고 모자란 만큼 적립에서 뺀다.
     * 장부 행은 서비스가 반환값으로 남긴다. 0인 쪽은 행을 만들지 않는다.
     *
     * @param need 결제에 필요한 크레딧. 1 이상이고 payable() 이하여야 한다
     * @return 이벤트/적립에서 각각 뺀 금액
     */
    public SpendResult spendForSubscription(int need) {
        requirePositive(need);
        if (payable() < need) {
            throw new IllegalArgumentException("결제에 쓸 수 있는 잔액이 부족합니다.");
        }
        int takeEvent = Math.min(eventCredit, need);
        int takeEarned = need - takeEvent;
        this.eventCredit -= takeEvent;
        this.earnedBalance -= takeEarned;
        return new SpendResult(takeEvent, takeEarned);
    }

    private static void requirePositive(int amount) {
        if (amount < 1) {
            throw new IllegalArgumentException("금액은 1 이상이어야 합니다.");
        }
    }

    /**
     * 구독 결제 차감 결과. 장부에 EVENT/EARNED 행을 남길 때 쓴다.
     *
     * @param takeEvent  이벤트 크레딧에서 뺀 금액. 0이면 해당 장부 행을 만들지 않는다
     * @param takeEarned 적립 잔액에서 뺀 금액. 0이면 해당 장부 행을 만들지 않는다
     */
    public record SpendResult(int takeEvent, int takeEarned) {}
}
