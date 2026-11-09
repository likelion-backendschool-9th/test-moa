package com.testmoa.backend.service.impl;

import com.testmoa.backend.dto.response.CheckoutResponse;
import com.testmoa.backend.dto.response.PayableCreditsResponse;
import com.testmoa.backend.dto.response.PlanResponse;
import com.testmoa.backend.dto.response.SubscriptionResponse;
import com.testmoa.backend.entity.CreditWallet;
import com.testmoa.backend.entity.Plan;
import com.testmoa.backend.entity.Subscription;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.global.security.Role;
import com.testmoa.backend.repository.CreditWalletRepository;
import com.testmoa.backend.repository.PlanRepository;
import com.testmoa.backend.repository.SubscriptionRepository;
import com.testmoa.backend.repository.UserRepository;
import com.testmoa.backend.service.SubscriptionService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * 내 구독 상태와 결제 가능 크레딧. 운영자는 구독 대상이 아니라서 eligible=false만 돌려준다.
 * 구독 중인지는 날짜로 판단하고 상태를 바꾸는 배치는 없다.
 */
@Service
@Transactional(readOnly = true)
public class SubscriptionServiceImpl implements SubscriptionService {

    private static final long SECONDS_PER_DAY = 24 * 60 * 60;

    private final UserRepository userRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final CreditWalletRepository creditWalletRepository;
    private final PlanRepository planRepository;

    public SubscriptionServiceImpl(
            UserRepository userRepository,
            SubscriptionRepository subscriptionRepository,
            CreditWalletRepository creditWalletRepository,
            PlanRepository planRepository
    ) {
        this.userRepository = userRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.creditWalletRepository = creditWalletRepository;
        this.planRepository = planRepository;
    }

    @Override
    public SubscriptionResponse getStatus(Long userId) {
        return statusAt(userId, LocalDateTime.now());
    }

    /**
     * 기준 시각의 구독 상태. 지금 기간(start_at <= 기준 < end_at)이 없으면 구독 중이 아니다.
     * 만료일은 지금 기간에서 빈틈없이 이어지는 기간 중 가장 늦은 end_at이고, 이용 중인 플랜은 지금 기간의 플랜이다.
     * 취소된 기간과 이미 끝난 기간은 조회 단계에서 빠진다.
     */
    SubscriptionResponse statusAt(Long userId, LocalDateTime now) {
        User user = requireUser(userId);
        if (user.getRole() == Role.ADMIN) {
            return SubscriptionResponse.notEligible();
        }

        return statusOf(unfinishedPeriods(userId, now), now);
    }

    /** 아직 끝나지 않은 ACTIVE 기간(시작이 빠른 순). 취소된 기간과 이미 끝난 기간은 빠진다 */
    private List<Subscription> unfinishedPeriods(Long userId, LocalDateTime now) {
        return subscriptionRepository
                .findByUserIdAndStatusAndEndAtAfterOrderByStartAtAsc(userId, Subscription.Status.ACTIVE, now);
    }

    private SubscriptionResponse statusOf(List<Subscription> periods, LocalDateTime now) {
        Optional<Subscription> current = periods.stream()
                .filter(period -> !period.getStartAt().isAfter(now))
                .max((a, b) -> a.getEndAt().compareTo(b.getEndAt()));
        if (current.isEmpty()) {
            return SubscriptionResponse.inactive();
        }

        LocalDateTime endAt = chainedEnd(current.get(), periods);
        return SubscriptionResponse.active(
                current.get().getPlan().getId(),
                current.get().getPlan().getTier(),
                endAt,
                remainingDays(now, endAt)
        );
    }

    @Override
    public PayableCreditsResponse getPayableCredits(Long userId) {
        User user = requireUser(userId);
        if (user.getRole() == Role.ADMIN) {
            return PayableCreditsResponse.notEligible();
        }
        return PayableCreditsResponse.of(payableOf(userId));
    }

    /** 결제 가능 크레딧(이벤트 + 적립, 출금 처리 중 제외). 지갑이 없으면 0 */
    private int payableOf(Long userId) {
        return creditWalletRepository.findByUserId(userId)
                .map(CreditWallet::payable)
                .orElse(0);
    }

    @Override
    public CheckoutResponse getCheckout(Long userId, Long planId) {
        return checkoutAt(userId, planId, LocalDateTime.now());
    }

    /**
     * 기준 시각의 결제 화면 값. 이용 시작은 max(기준, ACTIVE 기간 중 가장 늦은 end_at)이고,
     * 결제 실행(#71)이 쓸 규칙과 같다. 이용 끝은 시작 + periodDays일이다. 운영자는 플랜을 찾지 않고 eligible=false만 돌려준다.
     */
    CheckoutResponse checkoutAt(Long userId, Long planId, LocalDateTime now) {
        User user = requireUser(userId);
        if (user.getRole() == Role.ADMIN) {
            return CheckoutResponse.notEligible();
        }
        Plan plan = planRepository.findCurrentPlans().stream()
                .filter(current -> current.getId().equals(planId))
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));

        List<Subscription> periods = unfinishedPeriods(userId, now);
        SubscriptionResponse status = statusOf(periods, now);
        LocalDateTime startAt = periods.stream()
                .map(Subscription::getEndAt)
                .max(LocalDateTime::compareTo)
                .orElse(now);
        int payable = payableOf(userId);

        return CheckoutResponse.of(
                PlanResponse.of(plan),
                payable,
                status.active(),
                status.endAt(),
                new CheckoutResponse.Period(startAt, startAt.plusDays(plan.getPeriodDays()))
        );
    }

    /** 지금 기간 끝에서 시작하는(빈틈 없는) 기간을 이어 붙인 마지막 end_at */
    private LocalDateTime chainedEnd(Subscription current, List<Subscription> periods) {
        LocalDateTime end = current.getEndAt();
        boolean extended;
        do {
            extended = false;
            for (Subscription next : periods) {
                if (!next.getStartAt().isAfter(end) && next.getEndAt().isAfter(end)) {
                    end = next.getEndAt();
                    extended = true;
                }
            }
        } while (extended);
        return end;
    }

    /** 남은 날. 하루가 안 남았어도 올림해서 1이다 */
    private int remainingDays(LocalDateTime now, LocalDateTime endAt) {
        long seconds = Duration.between(now, endAt).getSeconds();
        return (int) ((seconds + SECONDS_PER_DAY - 1) / SECONDS_PER_DAY);
    }

    private User requireUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }
}
