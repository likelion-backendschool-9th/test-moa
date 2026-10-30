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

    // 이벤트 크레딧. 현금 교환 불가
    @Column(nullable = false)
    private Integer eventCredit;

    // 적립 잔액. 현금 교환 가능
    @Column(nullable = false)
    private Integer earnedBalance;

    // 잠긴 잔액. 현금 교환 대기 중
    @Column(nullable = false)
    private Integer lockedBalance;

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
