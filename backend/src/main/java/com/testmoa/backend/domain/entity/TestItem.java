package com.testmoa.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity(name = "test_items")
@Getter
@ToString
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TestItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 대상 프로젝트
    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private Project project;

    // 테스트 작업 제목
    @Column(nullable = false)
    private String title;

    // 테스트 작업 설명
    @Column(columnDefinition = "TEXT")
    private String description;

    // 생성 일시. 저장 시 자동 기록
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // 수정 일시. 저장, 수정 시 자동 기록
    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    /**
     * 필수 테스트 작업 등록 시 새로운 TestItem 엔티티 생성하기 위해 사용하는 빌더 생성자.
     *
     * @param project       대상 프로젝트
     * @param title         테스트 작업 제목
     * @param description   테스트 작업 설명
     */
    @Builder
    public TestItem(
            Project project,
            String title,
            String description
    ){
        this.project = project;
        this.title = title;
        this.description = description;
    }
}
