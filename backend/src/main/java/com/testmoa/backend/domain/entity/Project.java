package com.testmoa.backend.domain.entity;

import com.testmoa.backend.global.common.ProjectStatus;
import com.testmoa.backend.global.common.SelectionMode;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity(name = "projects")
@Getter
@ToString
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Project {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 모집글 작성자
    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private User user;

    // 모집글 제목
    @Column(nullable = false)
    private String title;

    // 모집 설명
    @Column(columnDefinition = "TEXT")
    private String description;

    // 모집 인원
    @Column(nullable = false)
    private Integer recruitCount;

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
    private ProjectStatus status;

    // 테스터 선택 방식(FIRST_COME, MANUAL)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SelectionMode selectionMode;

    // 생성 일시. 저장 시 자동 기록
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // 수정 일시. 저장, 수정 시 자동 기록
    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    /**
     * 테스트 모집글 등록 시 새로운 Project 엔티티 생성하기 위해 사용하는 빌더 생성자.
     *
     * @param user              모집글 작성자
     * @param title             모집글 제목
     * @param description       모집 설명
     * @param recruitCount      모집 인원
     * @param conditions        모집 조건
     * @param accessUrl         테스트 대상 접속 링크
     * @param recruitDeadline   모집 마감 일시
     * @param feedbackDeadline  피드백 제출 마감 일시
     * @param status            모집 상태
     * @param selectionMode     테스터 선택 방식
     */
    @Builder
    public Project(
            User user,
            String title,
            String description,
            Integer recruitCount,
            String conditions,
            String accessUrl,
            LocalDateTime recruitDeadline,
            LocalDateTime feedbackDeadline,
            ProjectStatus status,
            SelectionMode selectionMode
    ){
        this.user = user;
        this.title = title;
        this.description = description;
        this.recruitCount = recruitCount;
        this.conditions = conditions;
        this.accessUrl = accessUrl;
        this.recruitDeadline = recruitDeadline;
        this.feedbackDeadline = feedbackDeadline;
        this.status = status;
        this.selectionMode = selectionMode;
    }
}
