package com.testmoa.backend.repository;

import com.testmoa.backend.entity.Cashout;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface CashoutRepository extends JpaRepository<Cashout, Long> {
    List<Cashout> findByUserIdOrderByCreatedAtDesc(Long userId);

    // 탈퇴 전 출금 처리 중인 요청이 있는지(#84)
    boolean existsByUserIdAndStatus(Long userId, Cashout.Status status);

    /** 운영자 처리 대기 목록. 신청이 오래된 순. 요청자를 함께 읽는다 */
    @EntityGraph(attributePaths = "user")
    List<Cashout> findByStatusOrderByCreatedAtAsc(Cashout.Status status);

    /** 운영자 처리 완료 목록. 최근 처리 순. 요청자를 함께 읽는다 */
    @EntityGraph(attributePaths = "user")
    List<Cashout> findByStatusInOrderByProcessedAtDesc(Collection<Cashout.Status> statuses);

    /** 운영자 상세. 요청자를 함께 읽는다 */
    @EntityGraph(attributePaths = "user")
    Optional<Cashout> findWithUserById(Long id);

    /** 같은 요청을 동시에 처리하지 못하게 요청 행을 잠근다. 지갑 행보다 먼저 잠근다 */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Cashout c where c.id = :id")
    Optional<Cashout> findByIdForUpdate(@Param("id") Long id);
}
