package com.testmoa.backend.repository;

import com.testmoa.backend.entity.PaymentAttempt;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PaymentAttemptRepository extends JpaRepository<PaymentAttempt, Long> {
    /** 주문번호로 찾는다. 남의 시도인지는 서비스가 본다 */
    Optional<PaymentAttempt> findByOrderId(String orderId);

    /** 기준 시각보다 오래 APPROVING이거나 NEEDS_REVIEW인 시도를 최근 것부터 가져온다(#274). 회원은 같이 읽는다 */
    @Query("select a from PaymentAttempt a join fetch a.user "
            + "where a.status = com.testmoa.backend.entity.PaymentAttempt.Status.NEEDS_REVIEW "
            + "or (a.status = com.testmoa.backend.entity.PaymentAttempt.Status.APPROVING and a.updatedAt < :threshold) "
            + "order by a.updatedAt desc, a.id desc")
    List<PaymentAttempt> findStuck(@Param("threshold") LocalDateTime threshold);
}
