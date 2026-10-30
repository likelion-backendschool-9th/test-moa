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

    // 처리 상태(REQUESTED, PAID, COMPLETED, REJECTED)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CashoutStatus status;

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
     * @param user      요청자
     * @param amount    현금으로 바꿀 크레딧 양
     * @param status    처리 상태
     */
    @Builder
    public CashoutRequest(
            User user,
            Integer amount,
            CashoutStatus status
    ){
        this.user = user;
        this.amount = amount;
        this.status = status;
    }
}
