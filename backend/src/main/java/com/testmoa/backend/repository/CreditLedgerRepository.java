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

    /** 그 지갑에 같은 종류·같은 원인의 장부 행이 이미 있는지. 가입 크레딧을 두 번 주지 않기 위해 쓴다 */
    boolean existsByCreditWalletIdAndTypeAndDescription(Long creditWalletId, CreditLedger.Type type, String description);
}
