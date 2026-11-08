package com.testmoa.backend.repository;

import com.testmoa.backend.entity.Project;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProjectRepository extends JpaRepository<Project, Long> {
    // 내 프로젝트 목록. 최신순
    List<Project> findByUserIdOrderByCreatedAtDescIdDesc(Long userId);

    // 내 프로젝트 하나. 다른 회원의 프로젝트는 없는 것과 같다
    Optional<Project> findByIdAndUserId(Long id, Long userId);

    /** 프로젝트 행을 잠근다. 그룹 코드 발급과 모집글 버전 매기기(#177)에서 같은 프로젝트의 번호를 두 번 내지 않게 한다 */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from projects p where p.id = :id")
    Optional<Project> findByIdForUpdate(@Param("id") Long id);
}
