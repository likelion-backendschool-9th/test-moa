package com.testmoa.backend.repository;

import com.testmoa.backend.entity.Subscription;
import com.testmoa.backend.entity.enums.SubscriptionStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Optional;

public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {
    /**
     * 지금 유효한 구독(상태가 맞고 start_at <= 지금 < end_at). 여러 개면 가장 늦게 끝나는 것.
     * 호출 예: (userId, ACTIVE, now, now)
     */
    Optional<Subscription> findFirstByUserIdAndStatusAndStartAtLessThanEqualAndEndAtAfterOrderByEndAtDesc(
            Long userId, SubscriptionStatus status, LocalDateTime startAtOrBefore, LocalDateTime endAtAfter);
}
