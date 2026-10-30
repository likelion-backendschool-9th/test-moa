package com.testmoa.backend.domain.entity;

import com.testmoa.backend.global.common.FeedbackStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity(name = "feedbacks")
@Getter
@ToString
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Feedback {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 피드백을 작성한 참가 정보
    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private Register register;

    // 피드백 대상 테스트 작업. 기타 의견은 null
    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    private TestItem testItem;

    // 제목. 제거 여부 검토 필요
    private String title;

    // 내용
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    // 제출 일시. 저장 시 자동 기록, 3일(72시간) 뒤 보상 지급
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime submittedAt;

    // 상태(SUBMITTED, REWARDED)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FeedbackStatus status;

    // 기본 보상액. 참여 확정 시 안내한 금액으로 고정
    @Column(nullable = false)
    private Integer baseRewardSnapshot;

    // 추가 보상액. 참여 확정 시 안내한 금액으로 고정
    @Column(nullable = false)
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
     * 피드백 제출 시 새로운 Feedback 엔티티 생성하기 위해 사용하는 빌더 생성자.
     *
     * @param register              피드백을 작성한 참가 정보
     * @param testItem              피드백 대상 테스트 작업 (기타 의견은 null)
     * @param title                 제목
     * @param content               내용
     * @param status                상태
     * @param baseRewardSnapshot    기본 보상액
     * @param extraRewardSnapshot   추가 보상액
     */
    @Builder
    public Feedback(
            Register register,
            TestItem testItem,
            String title,
            String content,
            FeedbackStatus status,
            Integer baseRewardSnapshot,
            Integer extraRewardSnapshot
    ){
        this.register = register;
        this.testItem = testItem;
        this.title = title;
        this.content = content;
        this.status = status;
        this.baseRewardSnapshot = baseRewardSnapshot;
        this.extraRewardSnapshot = extraRewardSnapshot;
    }
}
