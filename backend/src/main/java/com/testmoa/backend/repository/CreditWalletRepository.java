package com.testmoa.backend.repository;

import com.testmoa.backend.entity.CreditWallet;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface CreditWalletRepository extends JpaRepository<CreditWallet, Long> {
    Optional<CreditWallet> findByUserId(Long userId);

    /** 출금·결제 시 동시 차감을 막기 위해 지갑 행을 잠근다 */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select w from credit_wallets w where w.user.id = :userId")
    Optional<CreditWallet> findByUserIdForUpdate(@Param("userId") Long userId);
}
