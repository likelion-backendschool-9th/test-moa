package com.testmoa.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity(name = "projects")
@Getter
@ToString
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Project {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 프로젝트 주인
    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private User user;

    // 테스트받을 소프트웨어 이름
    @Column(nullable = false)
    private String title;

    // 프로젝트 설명
    @Column(columnDefinition = "TEXT")
    private String description;

    // 대표 이미지 URL
    @Column(columnDefinition = "TEXT")
    private String imageUrl;

    // 생성 일시. 저장 시 자동 기록
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // 수정 일시. 저장, 수정 시 자동 기록
    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    /**
     * 프로젝트 등록 시 새로운 Project 엔티티 생성하기 위해 사용하는 빌더 생성자.
     *
     * @param user          프로젝트 주인
     * @param title         소프트웨어 이름
     * @param description   프로젝트 설명
     * @param imageUrl      대표 이미지 URL
     */
    @Builder
    public Project(
            User user,
            String title,
            String description,
            String imageUrl
    ){
        this.user = user;
        this.title = title;
        this.description = description;
        this.imageUrl = imageUrl;
    }

    /**
     * 프로젝트 정보 수정.
     *
     * @param title         소프트웨어 이름
     * @param description   프로젝트 설명 (없으면 null)
     * @param imageUrl      대표 이미지 URL (없으면 null)
     */
    public void update(String title, String description, String imageUrl) {
        this.title = title;
        this.description = description;
        this.imageUrl = imageUrl;
    }
}
