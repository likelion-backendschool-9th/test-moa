package com.testmoa.backend.repository;

import com.testmoa.backend.entity.CreditLedger;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CreditLedgerRepository extends JpaRepository<CreditLedger, Long> {
    List<CreditLedger> findByCreditWalletIdOrderByCreatedAtDesc(Long creditWalletId);

    List<CreditLedger> findByCreditWalletIdAndDeltaGreaterThanOrderByCreatedAtDesc(
            Long creditWalletId,
            Integer delta
    );

    List<CreditLedger> findByCreditWalletIdAndDeltaLessThanOrderByCreatedAtDesc(
            Long creditWalletId,
            Integer delta
    );
}
