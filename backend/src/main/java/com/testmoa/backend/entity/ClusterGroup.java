package com.testmoa.backend.entity;

import com.testmoa.backend.entity.enums.ClusterCategory;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity(name = "cluster_groups")
@Getter
@ToString
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ClusterGroup {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 분석한 모집글(버전)
    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private Recruitment recruitment;

    // 분류 코드. 버전이 달라도 같은 문제면 같은 코드를 쓴다
    @Column(nullable = false)
    private String groupCode;

    @Column(nullable = false)
    private String name;

    // 확인 우선순위(= 심각도). 1 = 치명 ~ 4 = 사소. 칭찬·미분류 그룹은 null
    private Integer improvementRank;

    // 카테고리(BUG, PRAISE, UNCLASSIFIED)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ClusterCategory category;

    // GitHub 이슈 초안 제목. 칭찬·미분류 그룹은 null
    private String gitIssueTitle;

    // GitHub 이슈 초안 내용(개선해야 하는 내용). 칭찬·미분류 그룹은 null
    @Column(columnDefinition = "TEXT")
    private String gitIssueContent;

    // 등록한 GitHub 이슈 링크. 등록 전에는 null
    @Column(columnDefinition = "TEXT")
    private String gitIssueUrl;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    /**
     * 피드백 분석 결과를 저장할 때 새로운 ClusterGroup 엔티티 생성하기 위해 사용하는 빌더 생성자.
     * GitHub 이슈 링크는 개발자가 이슈를 등록한 뒤에 채운다.
     */
    @Builder
    public ClusterGroup(
            Recruitment recruitment,
            String groupCode,
            String name,
            Integer improvementRank,
            ClusterCategory category,
            String gitIssueTitle,
            String gitIssueContent
    ){
        this.recruitment = recruitment;
        this.groupCode = groupCode;
        this.name = name;
        this.improvementRank = improvementRank;
        this.category = category;
        this.gitIssueTitle = gitIssueTitle;
        this.gitIssueContent = gitIssueContent;
    }

    /**
     * 분류 코드 변경. 버전 비교에서 직전 버전의 같은 문제 코드를 이어받거나, 새 문제로 새 코드를 받을 때 쓴다.
     *
     * @param groupCode 바꿀 분류 코드. 발급은 백엔드가 한다
     */
    public void updateGroupCode(String groupCode) {
        this.groupCode = groupCode;
    }
}
