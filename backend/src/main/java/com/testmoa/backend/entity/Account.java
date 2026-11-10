package com.testmoa.backend.entity;

import com.testmoa.backend.global.security.Provider;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity(name = "accounts")
@Table(uniqueConstraints = {
        // 같은 소셜 계정은 한 회원에만 연동된다
        @UniqueConstraint(columnNames = {"provider", "provider_code"}),
        // 한 회원은 로그인 방식마다 계정을 하나만 가진다
        @UniqueConstraint(columnNames = {"user_id", "provider"})
})
@Getter
@ToString
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Account {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 계정 소유 사용자
    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private User user;

    // 비밀번호. 소셜 로그인은 null
    @ToString.Exclude
    private String password;

    // 로그인 방식(LOCAL, NAVER, KAKAO, GOOGLE, GITHUB)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Provider provider;

    // 소셜 로그인 고유 식별자. 로컬 로그인은 null
    @Column(columnDefinition = "TEXT")
    private String providerCode;

    // 제공자가 알려 준 이 소셜 계정의 이메일(#84). 연동된 계정 화면에 보인다. 로컬 로그인과, 저장 전에 연동한 계정은 null
    private String providerEmail;

    // 생성 일시. 저장 시 자동 기록
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // 수정 일시. 저장, 수정 시 자동 기록
    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    /**
     * 회원가입 또는 소셜 계정 연동 시 새로운 Account 엔티티 생성하기 위해 사용하는 빌더 생성자.
     *
     * @param user          계정 소유 사용자
     * @param password      비밀번호 (소셜 로그인은 null)
     * @param provider      로그인 방식
     * @param providerCode  소셜 로그인 고유 식별자 (로컬 로그인은 null)
     * @param providerEmail 제공자가 알려 준 소셜 계정 이메일 (로컬 로그인은 null)
     */
    @Builder
    public Account(
            User user,
            String password,
            Provider provider,
            String providerCode,
            String providerEmail
    ){
        this.user = user;
        this.password = password;
        this.provider = provider;
        this.providerCode = providerCode;
        this.providerEmail = providerEmail;
    }

    // 소셜 로그인 때 제공자 이메일이 바뀌었거나 비어 있으면 새 값으로 바꾼다. 제공자가 이메일을 주지 않으면 그대로 둔다
    public void rememberProviderEmail(String email) {
        if (email != null && !email.equals(this.providerEmail)) this.providerEmail = email;
    }

    // 비밀번호 변경. 이미 암호화한 값을 받는다
    public void changePassword(String encodedPassword) {
        this.password = encodedPassword;
    }
}
