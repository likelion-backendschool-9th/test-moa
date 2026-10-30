package com.testmoa.backend.domain.entity;

import com.testmoa.backend.global.common.Role;
import com.testmoa.backend.global.common.UserStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.List;

@Entity(name = "users")
@Getter
@ToString
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 서비스 내 표시 이름. 가명 허용 여부 논의 필요
    private String nickname;

    // 가입 시 사용하는 이메일
    @Column(nullable = false, unique = true)
    private String email;

    // 권한(USER, ADMIN)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    // 계정 상태(ACTIVE, SUSPENDED, WITHDRAWN)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserStatus status;

    // 프로필 이미지 URL
    @Column(columnDefinition = "TEXT")
    private String imageUrl;

    // 로그인 방식 및 정보
    @ToString.Exclude
    @OneToMany(mappedBy = "user", fetch = FetchType.LAZY)
    private List<Account> accounts;

    // 생성 일시. 저장 시 자동 기록
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // 수정 일시. 저장, 수정 시 자동 기록
    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    /**
     * 회원가입 시 새로운 User 엔티티 생성하기 위해 사용하는 빌더 생성자.
     *
     * @param nickname      서비스 내 표시 이름
     * @param email         가입 시 사용하는 이메일
     * @param role          사용자 권한
     * @param status        계정 상태
     * @param imageUrl      프로필 이미지 URL
     */
    @Builder
    public User(
            String nickname,
            String email,
            Role role,
            UserStatus status,
            String imageUrl
    ){
        this.nickname = nickname;
        this.email = email;
        this.role = role;
        this.status = status;
        this.imageUrl = imageUrl;
    }

    public void updateImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
}
