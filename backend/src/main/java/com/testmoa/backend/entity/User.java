package com.testmoa.backend.entity;

import com.testmoa.backend.global.security.Role;
import com.testmoa.backend.entity.enums.UserStatus;
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

    // 실명. 이메일 가입은 필수, 소셜 가입은 받는 방법이 정해지지 않아 비워 둘 수 있다
    @Column(length = 20)
    private String name;

    // 서비스 내 표시 이름. 겹칠 수 없다. 가명 허용 여부 논의 필요
    @Column(nullable = false, unique = true)
    private String nickname;

    // 가입 시 사용하는 이메일
    @Column(nullable = false, unique = true)
    private String email;

    // 권한(USER, ADMIN)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    // 계정 상태(ACTIVE, SUSPENDED, WITHDRAWN, DELETED)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserStatus status;

    // 프로필 이미지 URL
    @Column(columnDefinition = "TEXT")
    private String imageUrl;

    // 탈퇴 신청 일시. 탈퇴 유예 중에만 있다(#84)
    private LocalDateTime withdrawnAt;

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
     * @param name          실명
     * @param nickname      서비스 내 표시 이름
     * @param email         가입 시 사용하는 이메일
     * @param role          사용자 권한
     * @param status        계정 상태
     * @param imageUrl      프로필 이미지 URL
     */
    @Builder
    public User(
            String name,
            String nickname,
            String email,
            Role role,
            UserStatus status,
            String imageUrl
    ){
        this.name = name;
        this.nickname = nickname;
        this.email = email;
        this.role = role;
        this.status = status;
        this.imageUrl = imageUrl;
    }

    public void updateImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    // 내 정보 수정. 검사(닉네임 중복 등)는 서비스가 한다
    /** 탈퇴 신청(#84). 30일 유예 뒤 purge()로 개인정보를 지운다 */
    public void withdraw(LocalDateTime now) {
        if (status != UserStatus.ACTIVE) throw new IllegalStateException("활성 회원만 탈퇴할 수 있습니다.");
        this.status = UserStatus.WITHDRAWN;
        this.withdrawnAt = now;
    }

    /** 유예 기간의 탈퇴 되돌리기 */
    public void restore() {
        if (status != UserStatus.WITHDRAWN) throw new IllegalStateException("탈퇴 유예 회원만 되돌릴 수 있습니다.");
        this.status = UserStatus.ACTIVE;
        this.withdrawnAt = null;
    }

    /**
     * 개인정보 파기. 이름·프로필 이미지는 지우고, 빈 값을 둘 수 없는 이메일·닉네임은 회원 id로 만든 값으로 바꾼다.
     * 이메일이 바뀌어 같은 이메일로 다시 가입할 수 있다. 피드백·결제 같은 기록은 이 회원(id)을 그대로 가리킨다
     */
    public void purge() {
        if (status != UserStatus.WITHDRAWN) throw new IllegalStateException("탈퇴 유예 회원만 파기할 수 있습니다.");
        this.name = null;
        this.imageUrl = null;
        this.email = "deleted-" + id + "@withdrawn.invalid";
        this.nickname = "탈퇴한 회원#" + id;
        this.status = UserStatus.DELETED;
    }

    public void updateProfile(String name, String nickname) {
        this.name = name;
        this.nickname = nickname;
    }
}
