package com.testmoa.backend.service;

import com.testmoa.backend.domain.entity.Subscription;
import com.testmoa.backend.domain.repository.SubscriptionRepository;
import com.testmoa.backend.global.common.SubscriptionStatus;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * 유료 구독 여부 확인. 토큰에 구독 여부를 넣지 않고 요청할 때마다 subscriptions를 읽어서,
 * 결제·만료가 바로 반영된다. 만료 배치가 없어도 end_at으로 판단하므로 맞다.
 *
 * 다른 기능에서 쓰는 법:
 * - 구독자만 쓸 수 있는 기능: 서비스 맨 위에서 subscriptionChecker.require(userId) (아니면 403 SUBSCRIPTION_REQUIRED)
 * - 구독 여부로 값이 달라지는 기능(모집 인원 한도 등): if (subscriptionChecker.isActive(userId)) ...
 */
@Component
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SubscriptionChecker {
    private final SubscriptionRepository subscriptionRepository;

    // 지금 유효한 구독. CANCELLED를 "만료일까지 이용"으로 볼지는 구독 담당과 정해서 여기만 고친다
    public Optional<Subscription> findActive(Long userId) {
        LocalDateTime now = LocalDateTime.now();
        return subscriptionRepository.findFirstByUserIdAndStatusAndStartAtLessThanEqualAndEndAtAfterOrderByEndAtDesc(
                userId, SubscriptionStatus.ACTIVE, now, now);
    }

    public boolean isActive(Long userId) {
        return findActive(userId).isPresent();
    }

    public void require(Long userId) {
        if (!isActive(userId)) throw new BusinessException(ErrorCode.SUBSCRIPTION_REQUIRED);
    }
}
