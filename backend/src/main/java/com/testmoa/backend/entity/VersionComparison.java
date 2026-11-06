package com.testmoa.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity(name = "version_comparisons")
@Getter
@ToString
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class VersionComparison {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 지금 버전 모집글. 모집글당 비교는 하나이고, 다시 비교하면 덮어쓴다
    @ToString.Exclude
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private Recruitment recruitment;

    // 비교한 직전 버전 모집글
    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private Recruitment previousRecruitment;

    // AI가 쓴 변화 요약 문장
    @Column(nullable = false, columnDefinition = "TEXT")
    private String summary;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // 비교 갱신 시각. 두 모집글의 분석 시각보다 이르면 오래된 비교다
    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    /**
     * 버전 비교 결과를 처음 저장할 때 새로운 VersionComparison 엔티티 생성하기 위해 사용하는 빌더 생성자.
     */
    @Builder
    public VersionComparison(
            Recruitment recruitment,
            Recruitment previousRecruitment,
            String summary
    ){
        this.recruitment = recruitment;
        this.previousRecruitment = previousRecruitment;
        this.summary = summary;
    }
}
