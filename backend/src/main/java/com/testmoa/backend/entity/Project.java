package com.testmoa.backend.entity;

import com.testmoa.backend.global.crypto.EncryptedStringConverter;
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

    // 이슈를 등록할 GitHub 레포("owner/repo"). 연결하지 않았으면 null (#227)
    @Column(length = 140)
    private String githubRepository;

    // 레포에 이슈를 만들 때 쓰는 GitHub 토큰. 개발자가 입력하고, DB에는 AES-GCM 암호문으로 저장한다. 연결하지 않았으면 null
    @ToString.Exclude
    @Convert(converter = EncryptedStringConverter.class)
    @Column(length = 512)
    private String githubToken;

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

    /**
     * GitHub 레포 연결. 이미 연결했으면 바꾼다. 레포와 토큰은 함께 바뀌어야 한다.
     *
     * @param githubRepository  이슈를 등록할 레포 ("owner/repo")
     * @param githubToken       그 레포에 이슈를 만들 수 있는 토큰
     */
    public void connectRepository(String githubRepository, String githubToken) {
        this.githubRepository = githubRepository;
        this.githubToken = githubToken;
    }

    /**
     * GitHub 레포 연결 해제. 토큰도 함께 지운다.
     */
    public void disconnectRepository() {
        this.githubRepository = null;
        this.githubToken = null;
    }
}
