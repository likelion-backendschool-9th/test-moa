package com.testmoa.backend.repository;

import com.testmoa.backend.entity.CashoutRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CashoutRequestRepository extends JpaRepository<CashoutRequest, Long> {
    List<CashoutRequest> findByUserIdOrderByCreatedAtDesc(Long userId);
}
