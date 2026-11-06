package com.testmoa.backend.domain.repository;

import com.testmoa.backend.domain.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    // 가입할 때 이메일 중복 확인
    boolean existsByEmail(String email);

    // 가입할 때 닉네임 중복 확인
    boolean existsByNickname(String nickname);

    // 소셜 로그인: 제공자가 확인한 이메일과 같은 회원에 연동한다
    Optional<User> findByEmail(String email);
}
