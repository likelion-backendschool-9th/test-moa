package com.testmoa.backend.repository;

import com.testmoa.backend.entity.PaymentAttempt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PaymentAttemptRepository extends JpaRepository<PaymentAttempt, Long> {
    /** 주문번호로 찾는다. 남의 시도인지는 서비스가 본다 */
    Optional<PaymentAttempt> findByOrderId(String orderId);
}
