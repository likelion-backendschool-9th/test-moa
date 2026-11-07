package com.testmoa.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity(name = "credit_ledgers")
@Getter
@ToString
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CreditLedger {
    // 변동 크레딧 종류. 잠금/해제는 ledger에 남기지 않으므로 LOCKED는 두지 않는다
    public enum Type {
        EVENT,  // 이벤트
        EARNED  // 적립
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 변동이 일어난 크레딧 지갑
    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private CreditWallet creditWallet;

    // 변동량. 음수, 양수 모두 가능
    @Column(nullable = false)
    private Integer delta;

    // 변동 원인(구독 결제(이벤트 크레딧), 출금 지급, 가입 크레딧 등). 결제 ID는 남기지 않는다
    @Column(nullable = false)
    private String description;

    // 변동 크레딧 종류(EVENT, EARNED). 총잔액이 바뀐 일만 남기므로 잠금/해제는 ledger에 남기지 않는다
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Type type;

    // 생성 일시. 저장 시 자동 기록
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // 수정 일시. 저장, 수정 시 자동 기록
    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    /**
     * 크레딧 변동 시 새로운 CreditLedger 엔티티 생성하기 위해 사용하는 빌더 생성자.
     *
     * @param creditWallet  변동이 일어난 크레딧 지갑
     * @param delta         변동량 (음수, 양수 모두 가능)
     * @param description   변동 원인
     * @param type          변동 크레딧 종류
     */
    @Builder
    public CreditLedger(
            CreditWallet creditWallet,
            Integer delta,
            String description,
            Type type
    ){
        this.creditWallet = creditWallet;
        this.delta = delta;
        this.description = description;
        this.type = type;
    }
}
