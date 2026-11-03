package com.testmoa.backend.domain.entity;

import com.testmoa.backend.global.common.CashoutStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity(name = "cashout_requests")
@Getter
@ToString
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CashoutRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 요청자
    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private User user;

    // 현금으로 바꿀 크레딧 양. 1크레딧 = 1원
    @Column(nullable = false)
    private Integer amount;

    // 입금 은행 이름
    @Column(nullable = false)
    private String bank;

    // 계좌번호. 숫자 10~14자리. 응답 시 완료 건은 마스킹할 수 있다
    @Column(nullable = false)
    private String accountNumber;

    // 입금 예금주. 회원 실명과 다르면 운영자가 확인한다
    @Column(nullable = false)
    private String accountHolder;

    // 처리 상태(REQUESTED, PAID, REJECTED). 지급 완료는 PAID
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CashoutStatus status;

    // 반려 사유. 반려가 아니면 null
    private String rejectReason;

    // 처리 일시. 처리 전에는 null
    private LocalDateTime processedAt;

    // 생성 일시. 저장 시 자동 기록
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // 수정 일시. 저장, 수정 시 자동 기록
    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    /**
     * 현금화 요청 시 새로운 CashoutRequest 엔티티 생성하기 위해 사용하는 빌더 생성자.
     *
     * @param user           요청자
     * @param amount         현금으로 바꿀 크레딧 양
     * @param bank           입금 은행 이름
     * @param accountNumber  계좌번호
     * @param accountHolder  예금주
     * @param status         처리 상태
     */
    @Builder
    public CashoutRequest(
            User user,
            Integer amount,
            String bank,
            String accountNumber,
            String accountHolder,
            CashoutStatus status
    ){
        this.user = user;
        this.amount = amount;
        this.bank = bank;
        this.accountNumber = accountNumber;
        this.accountHolder = accountHolder;
        this.status = status;
    }
}
