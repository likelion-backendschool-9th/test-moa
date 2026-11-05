package com.testmoa.backend.domain.entity;

import com.testmoa.backend.global.common.RegisterStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity(name = "registers")
@Getter
@ToString
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Register {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 참가한 모집글
    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private Recruitment recruitment;

    // 테스터
    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private User user;

    // 참가 상태(APPLIED, CONFIRMED, REJECTED, CANCELLED)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RegisterStatus status;

    // 신청 일시. 저장 시 자동 기록
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime appliedAt;

    // 참여 확정 일시. 확정 전에는 null
    private LocalDateTime confirmedAt;

    // 기본 보상액. 참여 확정 시 안내한 금액으로 고정. 확정 전에는 null
    private Integer baseRewardSnapshot;

    // 추가 보상액. 참여 확정 시 안내한 금액으로 고정. 확정 전에는 null
    private Integer extraRewardSnapshot;

    // 생성 일시. 저장 시 자동 기록
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // 수정 일시. 저장, 수정 시 자동 기록
    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    /**
     * 테스트 지원 시 새로운 Register 엔티티 생성하기 위해 사용하는 빌더 생성자.
     *
     * @param recruitment   참가한 모집글
     * @param user          테스터
     *
     * 상태는 밖에서 받지 않고 항상 APPLIED로 시작한다.
     */
    @Builder
    public Register(
            Recruitment recruitment,
            User user
    ){
        this.recruitment = recruitment;
        this.user = user;
        this.status = RegisterStatus.APPLIED;
    }

    /**
     * 참여 확정. 지원 상태일 때만 할 수 있고, 이때 보상액을 고정한다.
     *
     * @param baseReward    기본 보상액. 0 이상
     * @param extraReward   추가 보상액. 0 이상
     * @param now           확정 일시
     */
    public void confirm(Integer baseReward, Integer extraReward, LocalDateTime now) {
        if (status != RegisterStatus.APPLIED) {
            throw new IllegalStateException("지원 상태일 때만 확정할 수 있습니다.");
        }
        if (baseReward == null || baseReward < 0 || extraReward == null || extraReward < 0) {
            throw new IllegalArgumentException("보상액은 0 이상이어야 합니다.");
        }
        this.status = RegisterStatus.CONFIRMED;
        this.baseRewardSnapshot = baseReward;
        this.extraRewardSnapshot = extraReward;
        this.confirmedAt = now;
    }

    /**
     * 지원 거절. 지원 상태일 때만 할 수 있다.
     */
    public void reject() {
        if (status != RegisterStatus.APPLIED) {
            throw new IllegalStateException("지원 상태일 때만 거절할 수 있습니다.");
        }
        this.status = RegisterStatus.REJECTED;
    }

    /**
     * 참여 취소. 지원이나 확정 상태일 때만 할 수 있다.
     * 피드백을 낸 테스터를 모집 취소에서 제외하는 판단은 서비스가 한다.
     */
    public void cancel() {
        if (status != RegisterStatus.APPLIED && status != RegisterStatus.CONFIRMED) {
            throw new IllegalStateException("지원이나 확정 상태일 때만 취소할 수 있습니다.");
        }
        this.status = RegisterStatus.CANCELLED;
    }
}
