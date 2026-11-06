package com.testmoa.backend.repository;

import com.testmoa.backend.entity.Account;
import com.testmoa.backend.global.security.Provider;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AccountRepository extends JpaRepository<Account, Long> {
    List<Account> findByUserId(Long userId);

    // 이메일 로그인: 그 이메일 회원의 LOCAL 계정
    Optional<Account> findByUser_EmailAndProvider(String email, Provider provider);

    // 소셜 로그인: 그 제공자 계정이 연동된 회원
    Optional<Account> findByProviderAndProviderCode(Provider provider, String providerCode);
}
