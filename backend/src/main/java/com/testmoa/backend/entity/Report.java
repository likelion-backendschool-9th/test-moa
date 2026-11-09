package com.testmoa.backend.entity;

import com.testmoa.backend.entity.enums.ReportStatus;
import com.testmoa.backend.entity.enums.ReportTargetType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * 회원 신고(#85). 피드백·모집 글·회원·채팅 신고를 한 테이블에 모은다. 대상은 target_type과 target_id로 구분한다
 */
@Entity(name = "reports")
@Table(indexes = {
        // 같은 회원이 검토 대기 중인 같은 대상을 또 신고했는지 본다
        @Index(columnList = "user_id, target_type, target_id, status"),
        // 운영자가 회원별로 받은 신고를 모아 본다(#86)
        @Index(columnList = "reported_user_id")
})
@Getter
@ToString
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Report {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 신고한 회원. ERD의 reports.user_id
    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User reporter;

    // 신고당한 회원. 서버가 신고 대상에서 찾는다
    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reported_user_id", nullable = false)
    private User reportedUser;

    // 판정한 운영자. 판정 전에는 null
    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewer_id")
    private User reviewer;

    // 대상 종류(FEEDBACK, RECRUITMENT, USER, CHAT)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReportTargetType targetType;

    // 대상 id. 채팅은 방 id
    @Column(nullable = false)
    private Long targetId;

    // 신고자가 적은 사유
    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    // 처리 상태(PENDING, REJECTED, ACCEPTED)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReportStatus status;

    // 운영자가 기각·인정한 일시. 판정 전에는 null
    private LocalDateTime reviewedAt;

    // 신고 일시. 저장 시 자동 기록
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /**
     * 신고 접수. 상태는 밖에서 받지 않고 항상 PENDING으로 시작한다
     */
    @Builder
    public Report(User reporter, User reportedUser, ReportTargetType targetType, Long targetId, String reason) {
        this.reporter = reporter;
        this.reportedUser = reportedUser;
        this.targetType = targetType;
        this.targetId = targetId;
        this.reason = reason;
        this.status = ReportStatus.PENDING;
    }

    /**
     * 운영자 판정. 검토 대기일 때 한 번만 할 수 있다. 이미 판정했는지는 서비스가 먼저 확인해 409로 알린다
     *
     * @param reviewer 판정한 운영자
     * @param result   기각(REJECTED) 또는 인정(ACCEPTED)
     * @param now      판정 일시
     */
    public void review(User reviewer, ReportStatus result, LocalDateTime now) {
        if (status != ReportStatus.PENDING) throw new IllegalStateException("이미 판정한 신고입니다.");
        if (result == ReportStatus.PENDING) throw new IllegalArgumentException("판정은 기각이나 인정이어야 합니다.");
        this.reviewer = reviewer;
        this.status = result;
        this.reviewedAt = now;
    }
}
