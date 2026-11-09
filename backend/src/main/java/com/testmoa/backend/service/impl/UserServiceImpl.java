package com.testmoa.backend.service.impl;

import com.testmoa.backend.dto.AuthenticatedUser;
import com.testmoa.backend.dto.response.MeResponse;
import com.testmoa.backend.dto.response.MeResponse.SubscriptionStatusResponse;
import com.testmoa.backend.dto.response.SubscriptionResponse;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.repository.AccountRepository;
import com.testmoa.backend.repository.RefreshTokenRepository;
import com.testmoa.backend.repository.UserRepository;
import com.testmoa.backend.global.security.Role;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.service.SubscriptionService;
import com.testmoa.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final SubscriptionService subscriptionService;

    /**
     * 내 정보와 지금 구독 상태. 구독 상태는 구독 화면(/my/subscription/status)과 같은 계산을 쓴다.
     * 운영자는 구독 대상이 아니라서 null이다.
     */
    @Override
    public MeResponse getMe(Long userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));

        SubscriptionResponse status = subscriptionService.getStatus(userId);
        SubscriptionStatusResponse subscription = status.eligible()
                ? new SubscriptionStatusResponse(Boolean.TRUE.equals(status.active()), status.plan(), status.endAt())
                : null;

        return MeResponse.of(user, accountRepository.findByUserId(userId), subscription);
    }

    /**
     * 토큰 인증은 ACTIVE 회원만 통과한다. 로그인(AuthService)과 달리 정지 회원도 403이 아니라 빈 값(→ 401)이다
     */
    @Override
    public Optional<AuthenticatedUser> findAuthenticatable(Long userId, String sessionId) {
        if (sessionId != null && !refreshTokenRepository.existsBySessionIdAndExpiresAtAfter(sessionId, LocalDateTime.now())) {
            return Optional.empty();
        }
        return userRepository.findById(userId)
                .filter(user -> user.getStatus() == UserStatus.ACTIVE)
                .map(user -> new AuthenticatedUser(user.getId(), user.getRole()));
    }
}
