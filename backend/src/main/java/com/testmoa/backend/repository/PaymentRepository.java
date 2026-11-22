package com.testmoa.backend.repository;

import com.testmoa.backend.entity.Payment;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    /** 그 회원의 가장 최근 결제. 더블클릭 검사에 쓴다 */
    Optional<Payment> findFirstBySubscriptionUserIdOrderByPaidAtDescIdDesc(Long userId);

    /** 결제 이력(최신순). 구독과 플랜을 함께 읽는다 */
    @EntityGraph(attributePaths = {"subscription", "subscription.plan"})
    List<Payment> findBySubscriptionUserIdOrderByPaidAtDescIdDesc(Long userId);

    /** 결제를 한 회원 id. 회원 행을 먼저 잠그려고 결제를 읽기 전에 쓴다 */
    @Query("select s.user.id from payments p join p.subscription s where p.id = :paymentId")
    Optional<Long> findUserIdByPaymentId(@Param("paymentId") Long paymentId);

    /** 기준 시각보다 오래 환불 중으로 남은 결제(#281). 최근 것부터. 회원 이메일을 함께 읽는다 */
    @Query("select p from payments p join fetch p.subscription s join fetch s.user "
            + "where p.status = com.testmoa.backend.entity.Payment.Status.REFUNDING and p.updatedAt < :threshold "
            + "order by p.updatedAt desc, p.id desc")
    List<Payment> findStuckRefunding(@Param("threshold") LocalDateTime threshold);
}
