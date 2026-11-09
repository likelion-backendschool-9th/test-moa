package com.testmoa.backend.repository;

import com.testmoa.backend.entity.User;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.testmoa.backend.entity.enums.UserStatus;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    // 가입할 때 이메일 중복 확인
    boolean existsByEmail(String email);

    // 가입할 때 닉네임 중복 확인
    boolean existsByNickname(String nickname);

    // 소셜 로그인: 제공자가 확인한 이메일과 같은 회원에 연동한다
    Optional<User> findByEmail(String email);

    // 회원 행을 잠그고 읽는다(select ... for update). 같은 회원의 신고 접수처럼 확인 뒤 저장하는 작업을 한 번에 하나씩 처리한다
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from users u where u.id = :id")
    Optional<User> findByIdForUpdate(@Param("id") Long id);

    // 탈퇴 신청이 cutoff보다 앞선 유예 회원(#84 파기 작업)
    List<User> findByStatusAndWithdrawnAtBefore(UserStatus status, java.time.LocalDateTime cutoff);
}
