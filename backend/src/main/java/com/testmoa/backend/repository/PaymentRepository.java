package com.testmoa.backend.repository;

import com.testmoa.backend.entity.Payment;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    /** 그 회원의 가장 최근 결제. 더블클릭 검사에 쓴다 */
    Optional<Payment> findFirstBySubscriptionUserIdOrderByPaidAtDescIdDesc(Long userId);

    /** 결제 이력(최신순). 구독과 플랜을 함께 읽는다 */
    @EntityGraph(attributePaths = {"subscription", "subscription.plan"})
    List<Payment> findBySubscriptionUserIdOrderByPaidAtDescIdDesc(Long userId);
}
