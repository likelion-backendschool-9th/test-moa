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

    // 카테고리(BUG, UX, REQUEST, PRAISE, UNCLASSIFIED)
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

    // 등록한 GitHub 이슈 번호. 등록 전에는 null. 나중에 이슈가 닫혔는지 볼 때 쓴다
    private Integer gitIssueNumber;

    // GitHub에 이슈를 등록하는 중이면 시작한 일시. 같은 그룹을 두 번 등록하지 않도록 GitHub를 부르기 전에 먼저 차지한다
    private LocalDateTime gitIssueRegisteringAt;

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

    /**
     * 개발자가 그룹 이름을 고친다.
     *
     * @param name 새 이름. 비어 있으면 안 된다(요청에서 확인)
     */
    public void rename(String name) {
        this.name = name;
    }

    /**
     * 개발자가 확인 우선순위(심각도)를 고친다. 칭찬·미분류 그룹에는 심각도가 없다.
     *
     * @param improvementRank 1 = 치명 ~ 4 = 사소
     */
    public void changeImprovementRank(Integer improvementRank) {
        if (!category.hasIssue()) {
            throw new IllegalStateException("칭찬·미분류 그룹에는 심각도가 없습니다.");
        }
        this.improvementRank = improvementRank;
    }

    /**
     * 개발자가 GitHub 이슈 초안을 고친다. 칭찬·미분류 그룹에는 이슈 초안이 없다.
     *
     * @param gitIssueTitle   이슈 제목
     * @param gitIssueContent 이슈 내용(개선해야 하는 내용)
     */
    public void editIssueDraft(String gitIssueTitle, String gitIssueContent) {
        if (gitIssueUrl != null) {
            throw new IllegalStateException("이미 GitHub에 등록한 이슈 초안은 고칠 수 없습니다.");
        }
        if (!category.hasIssue()) {
            throw new IllegalStateException("칭찬·미분류 그룹에는 이슈 초안이 없습니다.");
        }
        this.gitIssueTitle = gitIssueTitle;
        this.gitIssueContent = gitIssueContent;
    }

    /**
     * GitHub 이슈를 등록한 뒤 링크와 번호를 남기고 등록 중 표시를 푼다.
     *
     * @param gitIssueUrl    등록한 이슈 링크
     * @param gitIssueNumber 등록한 이슈 번호
     */
    public void markIssueRegistered(String gitIssueUrl, int gitIssueNumber) {
        this.gitIssueUrl = gitIssueUrl;
        this.gitIssueNumber = gitIssueNumber;
        this.gitIssueRegisteringAt = null;
    }
}
