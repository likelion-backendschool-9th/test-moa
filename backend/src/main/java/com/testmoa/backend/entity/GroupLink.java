package com.testmoa.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity(name = "group_links")
// 버전 비교의 짝. 그룹 하나가 여러 그룹과 이어질 수 있지만(N:M), 같은 두 그룹은 한 번만 잇는다
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"current_group_id", "previous_group_id"}))
@Getter
@ToString
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class GroupLink {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 이번 버전(비교한 모집글)의 그룹
    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private ClusterGroup currentGroup;

    // 같은 문제로 이어진 직전 버전의 그룹
    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private ClusterGroup previousGroup;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    /**
     * 버전 비교 결과나 개발자가 고친 짝을 저장할 때 새로운 GroupLink 엔티티 생성하기 위해 사용하는 빌더 생성자.
     */
    @Builder
    public GroupLink(ClusterGroup currentGroup, ClusterGroup previousGroup) {
        this.currentGroup = currentGroup;
        this.previousGroup = previousGroup;
    }
}
