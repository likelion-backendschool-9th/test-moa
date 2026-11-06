package com.testmoa.backend.entity;

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

    // 대상 모집글
    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private Recruitment recruitment;

    // 테스트 작업 제목
    @Column(nullable = false)
    private String title;

    // 테스트 작업 설명
    @Column(columnDefinition = "TEXT")
    private String description;

    // 필수 여부. 필수 항목은 피드백을 써야 제출할 수 있다
    @Column(name = "is_required", nullable = false)
    private boolean required;

    // 생성 일시. 저장 시 자동 기록
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // 수정 일시. 저장, 수정 시 자동 기록
    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    /**
     * 테스트 작업 등록 시 새로운 TestItem 엔티티 생성하기 위해 사용하는 빌더 생성자.
     *
     * @param recruitment   대상 모집글
     * @param title         테스트 작업 제목
     * @param description   테스트 작업 설명
     * @param required      필수 여부
     */
    @Builder
    public TestItem(
            Recruitment recruitment,
            String title,
            String description,
            boolean required
    ){
        this.recruitment = recruitment;
        this.title = title;
        this.description = description;
        this.required = required;
    }
}
