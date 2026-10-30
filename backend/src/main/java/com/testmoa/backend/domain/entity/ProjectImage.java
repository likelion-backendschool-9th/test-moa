package com.testmoa.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity(name = "project_images")
@Getter
@ToString
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ProjectImage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 대상 프로젝트
    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private Project project;

    // 연결된 테스트 작업. 프로젝트 공통 이미지는 null
    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    private TestItem testItem;

    // 이미지 URL
    @Column(nullable = false, columnDefinition = "TEXT")
    private String url;

    // 화면 배치 순서
    @Column(nullable = false)
    private Integer sortOrder;

    // 생성 일시. 저장 시 자동 기록
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // 수정 일시. 저장, 수정 시 자동 기록
    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    /**
     * 프로젝트 이미지 등록 시 새로운 ProjectImage 엔티티 생성하기 위해 사용하는 빌더 생성자.
     *
     * @param project       대상 프로젝트
     * @param testItem      연결된 테스트 작업 (프로젝트 공통 이미지는 null)
     * @param url           이미지 URL
     * @param sortOrder     화면 배치 순서
     */
    @Builder
    public ProjectImage(
            Project project,
            TestItem testItem,
            String url,
            Integer sortOrder
    ){
        this.project = project;
        this.testItem = testItem;
        this.url = url;
        this.sortOrder = sortOrder;
    }
}
