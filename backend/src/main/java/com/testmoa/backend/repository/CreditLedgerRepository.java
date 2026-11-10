package com.testmoa.backend.repository;

import com.testmoa.backend.entity.CreditLedger;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CreditLedgerRepository extends JpaRepository<CreditLedger, Long> {
    List<CreditLedger> findByCreditWalletIdOrderByCreatedAtDesc(Long creditWalletId);

    /** 최신순으로 limit 개까지. Limit.unlimited()면 전부 */
    List<CreditLedger> findByCreditWalletIdOrderByCreatedAtDesc(Long creditWalletId, Limit limit);

    List<CreditLedger> findByCreditWalletIdAndDeltaGreaterThanOrderByCreatedAtDesc(
            Long creditWalletId,
            Integer delta,
            Limit limit
    );

    List<CreditLedger> findByCreditWalletIdAndDeltaLessThanOrderByCreatedAtDesc(
            Long creditWalletId,
            Integer delta,
            Limit limit
    );
}
