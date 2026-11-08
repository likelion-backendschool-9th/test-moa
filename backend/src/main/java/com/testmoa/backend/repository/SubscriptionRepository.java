package com.testmoa.backend.repository;

import com.testmoa.backend.entity.Subscription;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {
    /**
     * 지금 유효한 구독(상태가 맞고 start_at <= 지금 < end_at). 여러 개면 가장 늦게 끝나는 것.
     * 호출 예: (userId, ACTIVE, now, now)
     */
    Optional<Subscription> findFirstByUserIdAndStatusAndStartAtLessThanEqualAndEndAtAfterOrderByEndAtDesc(
            Long userId, Subscription.Status status, LocalDateTime startAtOrBefore, LocalDateTime endAtAfter);

    /**
     * 아직 끝나지 않은 기간(end_at이 지금 뒤)을 시작이 빠른 순으로. 플랜을 함께 읽는다.
     * 취소(CANCELLED)와 이미 끝난 기간은 들어오지 않는다. 호출 예: (userId, ACTIVE, now)
     */
    @EntityGraph(attributePaths = "plan")
    List<Subscription> findByUserIdAndStatusAndEndAtAfterOrderByStartAtAsc(
            Long userId, Subscription.Status status, LocalDateTime endAtAfter);
}
