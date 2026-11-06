package com.testmoa.backend.domain.repository;

import com.testmoa.backend.domain.entity.CashoutRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CashoutRequestRepository extends JpaRepository<CashoutRequest, Long> {
    List<CashoutRequest> findByUserIdOrderByCreatedAtDesc(Long userId);
}
