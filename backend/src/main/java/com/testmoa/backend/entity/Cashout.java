package com.testmoa.backend.entity;

import com.testmoa.backend.global.crypto.EncryptedStringConverter;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "cashouts")
@Getter
@ToString
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Cashout {
    // 출금 요청 반려 사유. 사유 라벨은 고정 문구이고, 반려 메모는 모든 사유에서 회원에게 보인다. OTHER만 메모가 필수다
    public enum RejectReason {
        HOLDER,   // 예금주 이름이 회원 정보와 달라요
        ACCOUNT,  // 계좌번호를 확인할 수 없어요
        OTHER     // 기타
    }

    // 처리 상태. 지급 완료는 PAID만 쓴다
    public enum Status {
        REQUESTED,  // 요청(처리 중)
        PAID,       // 지급 완료
        REJECTED    // 반려
    }

    // 출금 신청에 허용하는 은행. 프론트 BANKS와 같다. 저장·응답에는 한글 이름(label)을 쓴다
    public enum Bank {
        KOOKMIN("국민은행"),
        SHINHAN("신한은행"),
        WOORI("우리은행"),
        HANA("하나은행"),
        NONGHYUP("농협은행"),
        KAKAOBANK("카카오뱅크"),
        TOSSBANK("토스뱅크");

        private final String label;

        Bank(String label) {
            this.label = label;
        }

        public String getLabel() {
            return label;
        }

        /**
         * 출금 신청에 쓸 수 있는 은행 이름인지 확인한다.
         *
         * @param label 은행 한글 이름
         * @return 허용 목록에 있으면 true
         */
        public static boolean isAllowed(String label) {
            for (Bank bank : values()) {
                if (bank.label.equals(label)) {
                    return true;
                }
            }
            return false;
        }
    }

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

    // 계좌번호. 숫자 10~14자리. DB에는 AES-GCM 암호문으로 저장한다(#67)
    @ToString.Exclude
    @Convert(converter = EncryptedStringConverter.class)
    @Column(nullable = false, length = 255)
    private String accountNumber;

    // 입금 예금주. 회원 실명과 다르면 운영자가 확인한다. 계좌와 같이 암호화
    @ToString.Exclude
    @Convert(converter = EncryptedStringConverter.class)
    @Column(nullable = false, length = 255)
    private String accountHolder;

    // 처리 상태(REQUESTED, PAID, REJECTED). 지급 완료는 PAID
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    // 반려 사유(HOLDER, ACCOUNT, OTHER). 반려가 아니면 null. DB에는 문자열로 저장
    @Enumerated(EnumType.STRING)
    private RejectReason rejectReason;

    // 반려 메모. 사유와 상관없이 회원에게 그대로 보인다. 기타(OTHER)면 필수, 그 외에는 선택
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
     * 현금화 요청 시 새로운 Cashout 엔티티 생성하기 위해 사용하는 빌더 생성자.
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
    public Cashout(
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
        this.status = Status.REQUESTED;
    }

    /**
     * 지급 완료 처리. 요청 중일 때만 할 수 있다.
     *
     * @param now 처리 일시
     */
    public void pay(LocalDateTime now) {
        if (status != Status.REQUESTED) {
            throw new IllegalStateException("이미 처리한 출금 요청입니다.");
        }
        this.status = Status.PAID;
        this.processedAt = now;
    }

    /**
     * 반려 처리. 요청 중일 때만 할 수 있고, 사유가 기타(OTHER)면 메모가 있어야 한다.
     *
     * @param reason 반려 사유
     * @param memo   반려 메모. 회원에게 보이는 안내다. 기타면 필수, 그 외에는 선택. 비어 있으면 저장하지 않는다
     * @param now    처리 일시
     */
    public void reject(RejectReason reason, String memo, LocalDateTime now) {
        if (status != Status.REQUESTED) {
            throw new IllegalStateException("이미 처리한 출금 요청입니다.");
        }
        if (reason == null) {
            throw new IllegalArgumentException("반려 사유가 필요합니다.");
        }
        String trimmed = memo == null ? "" : memo.trim();
        if (reason == RejectReason.OTHER && trimmed.isEmpty()) {
            throw new IllegalArgumentException("기타 사유로 반려하려면 메모가 필요합니다.");
        }
        this.status = Status.REJECTED;
        this.rejectReason = reason;
        this.rejectMemo = trimmed.isEmpty() ? null : trimmed;
        this.processedAt = now;
    }

    /**
     * 아직 처리 전인지 확인한다.
     *
     * @return 요청(처리 중) 상태면 true
     */
    public boolean isRequested() {
        return status == Status.REQUESTED;
    }
}
