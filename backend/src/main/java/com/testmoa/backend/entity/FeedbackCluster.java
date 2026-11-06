package com.testmoa.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity(name = "feedback_clusters")
// 리뷰 하나는 여러 그룹에 들어갈 수 있지만, 같은 그룹에는 한 번만 들어간다
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"cluster_group_id", "feedback_id"}))
@Getter
@ToString
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class FeedbackCluster {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private ClusterGroup clusterGroup;

    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private Feedback feedback;

    // 그룹을 대표하는 리뷰인지
    @Column(name = "is_representative", nullable = false)
    private boolean representative;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    /**
     * 분석 그룹에 리뷰를 넣을 때 새로운 FeedbackCluster 엔티티 생성하기 위해 사용하는 빌더 생성자.
     */
    @Builder
    public FeedbackCluster(
            ClusterGroup clusterGroup,
            Feedback feedback,
            boolean representative
    ){
        this.clusterGroup = clusterGroup;
        this.feedback = feedback;
        this.representative = representative;
    }
}
