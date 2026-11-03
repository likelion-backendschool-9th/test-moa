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

    // 적립 잔액. 구독 결제·현금화 가능. 잠긴 금액도 여기에 포함된다
    @Column(nullable = false)
    private Integer earnedBalance;

    // 잠긴 잔액. 출금 요청 후 처리 중이라 earnedBalance 안에서 쓸 수 없는 분
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
}
