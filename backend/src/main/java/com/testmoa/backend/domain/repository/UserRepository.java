package com.testmoa.backend.domain.repository;

import com.testmoa.backend.domain.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
    // 가입할 때 이메일 중복 확인
    boolean existsByEmail(String email);

    // 가입할 때 닉네임 중복 확인
    boolean existsByNickname(String nickname);
}
