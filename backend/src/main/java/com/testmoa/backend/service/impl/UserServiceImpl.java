package com.testmoa.backend.service.impl;

import com.testmoa.backend.domain.dto.response.MeResponse;
import com.testmoa.backend.domain.dto.response.MeResponse.SubscriptionStatusResponse;
import com.testmoa.backend.domain.entity.User;
import com.testmoa.backend.domain.repository.AccountRepository;
import com.testmoa.backend.domain.repository.UserRepository;
import com.testmoa.backend.global.common.Role;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.service.SubscriptionChecker;
import com.testmoa.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final SubscriptionChecker subscriptionChecker;

    /**
     * 내 정보와 지금 구독 상태
     */
    @Override
    public MeResponse getMe(Long userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));

        SubscriptionStatusResponse subscription = user.getRole() == Role.ADMIN ? null
                : subscriptionChecker.findActive(userId)
                        .map(found -> new SubscriptionStatusResponse(true, found.getPlan().getTier(), found.getEndAt()))
                        .orElse(new SubscriptionStatusResponse(false, null, null));

        return MeResponse.of(user, accountRepository.findByUserId(userId), subscription);
    }
}
