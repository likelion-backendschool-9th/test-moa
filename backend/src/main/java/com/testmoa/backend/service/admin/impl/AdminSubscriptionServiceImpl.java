package com.testmoa.backend.service.admin.impl;

import com.testmoa.backend.dto.request.AdminSubscriptionGrantRequest;
import com.testmoa.backend.dto.response.AdminSubscriptionResponse;
import com.testmoa.backend.entity.Plan;
import com.testmoa.backend.entity.Subscription;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.global.security.Role;
import com.testmoa.backend.repository.PlanRepository;
import com.testmoa.backend.repository.SubscriptionRepository;
import com.testmoa.backend.repository.UserRepository;
import com.testmoa.backend.service.SubscriptionService;
import com.testmoa.backend.service.admin.AdminSubscriptionService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 운영자 구독 부여·해제(#204). 결제(payments)와 크레딧은 건드리지 않고 구독 기간(subscriptions)만 만들거나 취소한다.
 * 같은 회원의 동시 부여·해제는 회원 행을 잠가 한 줄로 처리한다.
 */
@Service
@Transactional(readOnly = true)
public class AdminSubscriptionServiceImpl implements AdminSubscriptionService {

    private final UserRepository userRepository;
    private final PlanRepository planRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final SubscriptionService subscriptionService;

    public AdminSubscriptionServiceImpl(
            UserRepository userRepository,
            PlanRepository planRepository,
            SubscriptionRepository subscriptionRepository,
            SubscriptionService subscriptionService
    ) {
        this.userRepository = userRepository;
        this.planRepository = planRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.subscriptionService = subscriptionService;
    }

    @Override
    public AdminSubscriptionResponse find(String email) {
        return responseOf(requireByEmail(email));
    }

    @Override
    @Transactional
    public AdminSubscriptionResponse grant(AdminSubscriptionGrantRequest request) {
        User user = requireByEmailForUpdate(request.email());
        if (user.getRole() == Role.ADMIN) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        Plan plan = planRepository.findCurrentPlans().stream()
                .filter(current -> current.getId().equals(request.planId()))
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));

        // 이용 시작은 결제(#71)와 같은 규칙이다: max(지금, 끝나지 않은 ACTIVE 기간 중 가장 늦은 end_at)
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startAt = unfinished(user, now).stream()
                .map(Subscription::getEndAt)
                .max(LocalDateTime::compareTo)
                .orElse(now);
        subscriptionRepository.save(Subscription.builder()
                .user(user).plan(plan).startAt(startAt).endAt(startAt.plusDays(plan.getPeriodDays())).build());
        return responseOf(user);
    }

    @Override
    @Transactional
    public AdminSubscriptionResponse revoke(String email) {
        User user = requireByEmailForUpdate(email);
        if (user.getRole() != Role.ADMIN) {
            unfinished(user, LocalDateTime.now()).forEach(Subscription::cancel);
        }
        return responseOf(user);
    }

    private AdminSubscriptionResponse responseOf(User user) {
        return AdminSubscriptionResponse.of(user, subscriptionService.getStatus(user.getId()));
    }

    private List<Subscription> unfinished(User user, LocalDateTime now) {
        return subscriptionRepository.findByUserIdAndStatusAndEndAtAfterOrderByStartAtAsc(
                user.getId(), Subscription.Status.ACTIVE, now);
    }

    private User requireByEmail(String email) {
        return userRepository.findByEmail(normalize(email))
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    /** 찾은 회원의 행을 잠그고 다시 읽는다 */
    private User requireByEmailForUpdate(String email) {
        User found = requireByEmail(email);
        return userRepository.findByIdForUpdate(found.getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    private String normalize(String email) {
        if (email == null || email.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
        return email.trim();
    }
}
