package com.testmoa.backend.repository;

import com.testmoa.backend.entity.CreditWallet;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface CreditWalletRepository extends JpaRepository<CreditWallet, Long> {
    Optional<CreditWallet> findByUserId(Long userId);

    /** 출금·결제 시 동시 차감을 막기 위해 지갑 행을 잠근다 */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<CreditWallet> findLockedByUserId(Long userId);

    /**
     * 지갑이 없을 때만 잔액 0으로 만든다. 같은 회원의 첫 결제 둘이 동시에 와도 유일 제약 오류 없이 하나만 생긴다.
     * 만든 뒤에는 findLockedByUserId로 잠근다.
     */
    @Modifying
    @Query(value = "INSERT INTO credit_wallets (user_id, event_credit, earned_balance, locked_balance, created_at, updated_at) "
            + "VALUES (:userId, 0, 0, 0, :now, :now) ON CONFLICT (user_id) DO NOTHING", nativeQuery = true)
    void insertIfAbsent(@Param("userId") Long userId, @Param("now") LocalDateTime now);
}
