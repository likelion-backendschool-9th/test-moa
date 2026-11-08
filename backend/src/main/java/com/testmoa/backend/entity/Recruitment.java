package com.testmoa.backend.entity;

import com.testmoa.backend.entity.enums.AnalysisStatus;
import com.testmoa.backend.entity.enums.RecruitmentStatus;
import com.testmoa.backend.entity.enums.SelectionMode;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity(name = "recruitments")
@Getter
@ToString
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Recruitment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 대상 프로젝트
    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private Project project;

    // 모집글 제목
    @Column(nullable = false)
    private String title;

    // 모집 설명
    @Column(columnDefinition = "TEXT")
    private String description;

    // 모집 조건
    @Column(columnDefinition = "TEXT")
    private String conditions;

    // 테스트 대상 접속 링크
    @Column(columnDefinition = "TEXT")
    private String accessUrl;

    // 모집 마감 일시
    @Column(nullable = false)
    private LocalDateTime recruitDeadline;

    // 피드백 제출 마감 일시
    @Column(nullable = false)
    private LocalDateTime feedbackDeadline;

    // 모집 상태(RECRUITING, CLOSED, CANCELLED)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RecruitmentStatus status;

    // 테스터 선택 방식(FIRST_COME, MANUAL)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SelectionMode selectionMode;

    // 모집글 버전. 1로 시작
    @Column(nullable = false)
    private Integer version;

    // 피드백 분석 상태(NONE, PENDING, DONE, FAILED)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AnalysisStatus analysisStatus;

    // 피드백 분석 완료 일시. 분석 전에는 null. 있으면 분석 결과가 있어 버전 비교에 쓸 수 있고, 비교가 이보다 이르면 오래된 비교다
    private LocalDateTime analyzedAt;

    // 마지막 분석 요청(접수) 일시. 분석 중이면 화면이 "n분째 분석 중"을 보여 준다. 요청한 적이 없으면 null
    private LocalDateTime analysisRequestedAt;

    // 칭찬 리뷰 한 줄 요약. 분석 전이거나 칭찬이 없으면 null
    @Column(columnDefinition = "TEXT")
    private String praiseSummary;

    // 취소 사유. 사유 없이 취소하면 null
    @Column(columnDefinition = "TEXT")
    private String cancelReason;

    // 취소 일시. 취소 전에는 null
    private LocalDateTime cancelledAt;

    // 생성 일시. 저장 시 자동 기록
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // 수정 일시. 저장, 수정 시 자동 기록
    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    /**
     * 테스트 모집글 등록 시 새로운 Recruitment 엔티티 생성하기 위해 사용하는 빌더 생성자.
     *
     * @param project           대상 프로젝트
     * @param title             모집글 제목
     * @param description       모집 설명
     * @param conditions        모집 조건
     * @param accessUrl         테스트 대상 접속 링크
     * @param recruitDeadline   모집 마감 일시
     * @param feedbackDeadline  피드백 제출 마감 일시
     * @param selectionMode     테스터 선택 방식
     *
     * 상태는 RECRUITING, 버전은 1, 분석 상태는 NONE으로 시작한다.
     */
    @Builder
    public Recruitment(
            Project project,
            String title,
            String description,
            String conditions,
            String accessUrl,
            LocalDateTime recruitDeadline,
            LocalDateTime feedbackDeadline,
            SelectionMode selectionMode
    ){
        this.project = project;
        this.title = title;
        this.description = description;
        this.conditions = conditions;
        this.accessUrl = accessUrl;
        this.recruitDeadline = recruitDeadline;
        this.feedbackDeadline = feedbackDeadline;
        this.selectionMode = selectionMode;
        this.status = RecruitmentStatus.RECRUITING;
        this.version = 1;
        this.analysisStatus = AnalysisStatus.NONE;
    }

    /**
     * 모집 취소. 모집 중일 때만 할 수 있다.
     * 사유가 꼭 필요한 경우인지는 확정 테스터와 일정을 함께 봐야 해서 서비스가 확인한다.
     *
     * @param reason 취소 사유. 비어 있으면 저장하지 않는다
     * @param now    취소 일시
     */
    public void cancel(String reason, LocalDateTime now) {
        if (status != RecruitmentStatus.RECRUITING) {
            throw new IllegalStateException("모집 중일 때만 취소할 수 있습니다.");
        }
        String trimmed = reason == null ? "" : reason.trim();
        this.status = RecruitmentStatus.CANCELLED;
        this.cancelReason = trimmed.isEmpty() ? null : trimmed;
        this.cancelledAt = now;
    }

    /**
     * 피드백 분석 완료. 분석 상태를 DONE으로 바꾸고 칭찬 요약과 완료 일시를 남긴다.
     * 분석 시작(PENDING)과 실패(FAILED)는 동시에 두 번 시작하지 않도록 조건부 UPDATE로 바꾼다(RecruitmentRepository).
     *
     * @param praiseSummary 칭찬 리뷰 한 줄 요약. 칭찬이 없으면 null
     * @param now           분석 완료 일시
     */
    public void completeAnalysis(String praiseSummary, LocalDateTime now) {
        this.analysisStatus = AnalysisStatus.DONE;
        this.praiseSummary = praiseSummary;
        this.analyzedAt = now;
    }
}
