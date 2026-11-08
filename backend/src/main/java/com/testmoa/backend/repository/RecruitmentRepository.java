package com.testmoa.backend.repository;

import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.enums.AnalysisStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface RecruitmentRepository extends JpaRepository<Recruitment, Long> {
    // 여러 프로젝트의 모집글. 최신순
    List<Recruitment> findByProjectIdInOrderByCreatedAtDescIdDesc(Collection<Long> projectIds);

    // 상태를 바꾸려고 읽는 내 모집글과 프로젝트. 취소와 지원이 겹치지 않게 행을 잠근다(#116). 다른 회원의 모집글은 잠그지 않고 없는 것과 같다
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from recruitments r join fetch r.project p where r.id = :id and p.user.id = :userId")
    Optional<Recruitment> findMineForUpdate(@Param("id") Long id, @Param("userId") Long userId);

    // 내 모집글과 그 프로젝트. 다른 회원의 모집글은 없는 것과 같다
    @Query("select r from recruitments r join fetch r.project p where r.id = :id and p.user.id = :userId")
    Optional<Recruitment> findMineWithProject(@Param("id") Long id, @Param("userId") Long userId);

    // 같은 프로젝트에서 version보다 작은 버전 중 가장 큰 것(직전 버전). 같은 버전이 여럿이면 나중에 만든 모집글
    Optional<Recruitment> findFirstByProjectIdAndVersionLessThanOrderByVersionDescIdDesc(Long projectId, Integer version);

    /**
     * 분석 시작. 진행 중(PENDING)이 아닐 때만 PENDING으로 바꾸고 접수 시각을 남겨, 동시에 두 번 눌러도 한 번만 바뀐다. 바뀐 행 수를 돌려준다
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
            update recruitments r set r.analysisStatus = :pending, r.analysisRequestedAt = :requestedAt
            where r.id = :id and r.analysisStatus <> :pending
            """)
    int markAnalysisPending(@Param("id") Long id, @Param("pending") AnalysisStatus pending,
                            @Param("requestedAt") LocalDateTime requestedAt);

    // 분석 실패. 진행 중(PENDING)일 때만 바꾼다
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update recruitments r set r.analysisStatus = :failed where r.id = :id and r.analysisStatus = :pending")
    int markAnalysisFailed(@Param("id") Long id, @Param("pending") AnalysisStatus pending, @Param("failed") AnalysisStatus failed);

    // 서버가 다시 시작되면 끝나지 않는 진행 중 분석을 모두 실패로 바꾼다
    @Modifying
    @Query("update recruitments r set r.analysisStatus = :failed where r.analysisStatus = :pending")
    int failAllPendingAnalyses(@Param("pending") AnalysisStatus pending, @Param("failed") AnalysisStatus failed);
}
