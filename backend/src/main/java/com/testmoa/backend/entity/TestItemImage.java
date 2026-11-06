package com.testmoa.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity(name = "test_item_images")
@Getter
@ToString
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TestItemImage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 대상 테스트 항목
    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
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
     * 테스트 항목 이미지 등록 시 새로운 TestItemImage 엔티티 생성하기 위해 사용하는 빌더 생성자.
     *
     * @param testItem      대상 테스트 항목
     * @param url           이미지 URL
     * @param sortOrder     화면 배치 순서
     */
    @Builder
    public TestItemImage(
            TestItem testItem,
            String url,
            Integer sortOrder
    ){
        this.testItem = testItem;
        this.url = url;
        this.sortOrder = sortOrder;
    }
}
