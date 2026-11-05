package com.testmoa.backend.domain.entity;

import com.testmoa.backend.global.common.Provider;
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
     */
    @Builder
    public Account(
            User user,
            String password,
            Provider provider,
            String providerCode
    ){
        this.user = user;
        this.password = password;
        this.provider = provider;
        this.providerCode = providerCode;
    }
}
