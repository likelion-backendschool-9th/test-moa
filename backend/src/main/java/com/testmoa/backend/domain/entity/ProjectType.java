package com.testmoa.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity(name = "project_types")
@Getter
@ToString
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ProjectType {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 테스트 타입
    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private Type type;

    // 대상 프로젝트
    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private Project project;

    // 생성 일시. 저장 시 자동 기록
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // 수정 일시. 저장, 수정 시 자동 기록
    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    /**
     * 프로젝트에 테스트 타입 지정 시 새로운 ProjectType 엔티티 생성하기 위해 사용하는 빌더 생성자.
     *
     * @param type      테스트 타입
     * @param project   대상 프로젝트
     */
    @Builder
    public ProjectType(
            Type type,
            Project project
    ){
        this.type = type;
        this.project = project;
    }
}
