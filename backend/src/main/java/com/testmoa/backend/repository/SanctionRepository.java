package com.testmoa.backend.repository;

import com.testmoa.backend.entity.Sanction;
import com.testmoa.backend.entity.enums.SanctionType;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface SanctionRepository extends JpaRepository<Sanction, Long> {
    // 회원이 받은 경고·정지, 최근 순
    @EntityGraph(attributePaths = {"sanctionedBy", "releasedBy"})
    List<Sanction> findByUserIdOrderByStartedAtDescIdDesc(Long userId);

    // 지금 걸린 정지(해제 전, 시작함, 끝나지 않음). 경고는 막지 않아서 뺀다
    @Query("""
            select s from sanctions s
            where s.user.id in :userIds and s.type <> :warning and s.releasedAt is null
              and s.startedAt <= :now and (s.endsAt is null or s.endsAt > :now)""")
    List<Sanction> findActive(@Param("userIds") Collection<Long> userIds, @Param("now") LocalDateTime now,
                              @Param("warning") SanctionType warning);

    // 회원별 제재 이력 수
    @Query("select s.user.id, count(s) from sanctions s where s.user.id in :userIds group by s.user.id")
    List<Object[]> countByUserIds(@Param("userIds") Collection<Long> userIds);

    // 해제할 때 제재 행을 잠그고 읽는다. 두 운영자가 동시에 해제해도 하나만 된다
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from sanctions s where s.id = :id")
    Optional<Sanction> findByIdForUpdate(@Param("id") Long id);
}
