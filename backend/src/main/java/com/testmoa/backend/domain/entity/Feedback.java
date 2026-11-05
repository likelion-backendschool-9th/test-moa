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

    // 피드백을 작성한 참가 정보. 보상액은 여기에서 읽는다
    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private Register register;

    // 피드백 대상 테스트 작업. 기타 의견은 null
    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    private TestItem testItem;

    // 내용
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    // 제출 일시. 한 번에 낸 피드백은 같은 값이고, 3일(72시간) 뒤 보상 지급
    @Column(nullable = false, updatable = false)
    private LocalDateTime submittedAt;

    // 상태(SUBMITTED, REPORTED, REWARDED, EXCLUDED)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FeedbackStatus status;

    // 개발자가 도움이 된 피드백으로 추천했는지
    @Column(name = "is_recommended", nullable = false)
    private boolean recommended;

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
     * @param register      피드백을 작성한 참가 정보
     * @param testItem      피드백 대상 테스트 작업 (기타 의견은 null)
     * @param content       내용
     * @param submittedAt   제출 일시
     *
     * 상태는 밖에서 받지 않고 항상 SUBMITTED로 시작한다.
     */
    @Builder
    public Feedback(
            Register register,
            TestItem testItem,
            String content,
            LocalDateTime submittedAt
    ){
        this.register = register;
        this.testItem = testItem;
        this.content = content;
        this.submittedAt = submittedAt;
        this.status = FeedbackStatus.SUBMITTED;
    }

    /**
     * 추천 여부 변경.
     *
     * @param recommended 추천하면 true
     */
    public void updateRecommended(boolean recommended) {
        this.recommended = recommended;
    }

    /**
     * 신고 접수. 제출 상태일 때만 할 수 있다.
     */
    public void report() {
        if (status != FeedbackStatus.SUBMITTED) {
            throw new IllegalStateException("제출 상태일 때만 신고할 수 있습니다.");
        }
        this.status = FeedbackStatus.REPORTED;
    }

    /**
     * 보상 지급 처리. 제출이나 신고됨 상태일 때만 할 수 있다.
     */
    public void reward() {
        if (status != FeedbackStatus.SUBMITTED && status != FeedbackStatus.REPORTED) {
            throw new IllegalStateException("제출이나 신고됨 상태일 때만 보상을 지급할 수 있습니다.");
        }
        this.status = FeedbackStatus.REWARDED;
    }

    /**
     * 보상 제외 처리. 신고됨 상태일 때만 할 수 있다.
     */
    public void exclude() {
        if (status != FeedbackStatus.REPORTED) {
            throw new IllegalStateException("신고됨 상태일 때만 보상에서 제외할 수 있습니다.");
        }
        this.status = FeedbackStatus.EXCLUDED;
    }
}
