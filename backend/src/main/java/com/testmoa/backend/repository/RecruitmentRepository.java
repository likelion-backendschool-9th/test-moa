package com.testmoa.backend.repository;

import com.testmoa.backend.entity.Recruitment;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface RecruitmentRepository extends JpaRepository<Recruitment, Long> {
    // 여러 프로젝트의 모집글. 최신순
    List<Recruitment> findByProjectIdInOrderByCreatedAtDescIdDesc(Collection<Long> projectIds);

    // 상태를 바꾸려고 읽는 모집글과 프로젝트. 취소와 지원이 겹치지 않게 행을 잠근다(#116)
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from recruitments r join fetch r.project where r.id = :id")
    Optional<Recruitment> findForUpdateById(@Param("id") Long id);
}
