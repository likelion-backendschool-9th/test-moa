package com.testmoa.backend.domain.repository;

import com.testmoa.backend.domain.entity.CreditWallet;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CreditWalletRepository extends JpaRepository<CreditWallet, Long> {
    Optional<CreditWallet> findByUserId(Long userId);
}
