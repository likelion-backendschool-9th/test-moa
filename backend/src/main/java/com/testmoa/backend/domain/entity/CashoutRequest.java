package com.testmoa.backend.domain.entity;

import com.testmoa.backend.global.common.CashoutRejectReason;
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

    // 반려 사유(HOLDER, ACCOUNT, OTHER). 반려가 아니면 null. DB에는 문자열로 저장
    @Enumerated(EnumType.STRING)
    private CashoutRejectReason rejectReason;

    // 반려 메모. 기타(OTHER)면 회원에게 보이는 사유이고 필수, 그 외에는 운영자 메모(선택)
    private String rejectMemo;

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
     *
     * 처리 상태는 밖에서 받지 않고 항상 REQUESTED로 시작한다.
     */
    @Builder
    public CashoutRequest(
            User user,
            Integer amount,
            String bank,
            String accountNumber,
            String accountHolder
    ){
        this.user = user;
        this.amount = amount;
        this.bank = bank;
        this.accountNumber = accountNumber;
        this.accountHolder = accountHolder;
        this.status = CashoutStatus.REQUESTED;
    }

    /**
     * 지급 완료 처리. 요청 중일 때만 할 수 있다.
     *
     * @param now 처리 일시
     */
    public void pay(LocalDateTime now) {
        if (status != CashoutStatus.REQUESTED) {
            throw new IllegalStateException("이미 처리한 출금 요청입니다.");
        }
        this.status = CashoutStatus.PAID;
        this.processedAt = now;
    }

    /**
     * 반려 처리. 요청 중일 때만 할 수 있고, 사유가 기타(OTHER)면 메모가 있어야 한다.
     *
     * @param reason 반려 사유
     * @param memo   반려 메모. 기타면 회원에게 보이는 사유, 그 외에는 운영자 메모. 비어 있으면 저장하지 않는다
     * @param now    처리 일시
     */
    public void reject(CashoutRejectReason reason, String memo, LocalDateTime now) {
        if (status != CashoutStatus.REQUESTED) {
            throw new IllegalStateException("이미 처리한 출금 요청입니다.");
        }
        if (reason == null) {
            throw new IllegalArgumentException("반려 사유가 필요합니다.");
        }
        String trimmed = memo == null ? "" : memo.trim();
        if (reason == CashoutRejectReason.OTHER && trimmed.isEmpty()) {
            throw new IllegalArgumentException("기타 사유로 반려하려면 메모가 필요합니다.");
        }
        this.status = CashoutStatus.REJECTED;
        this.rejectReason = reason;
        this.rejectMemo = trimmed.isEmpty() ? null : trimmed;
        this.processedAt = now;
    }
}
