package com.testmoa.backend.service.impl;

import com.testmoa.backend.dto.AuthenticatedUser;
import com.testmoa.backend.dto.request.PasswordChangeRequest;
import com.testmoa.backend.dto.request.ProfileUpdateRequest;
import com.testmoa.backend.dto.response.MeResponse;
import com.testmoa.backend.dto.response.MeResponse.SubscriptionStatusResponse;
import com.testmoa.backend.dto.response.SubscriptionResponse;
import com.testmoa.backend.entity.Account;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.repository.AccountRepository;
import com.testmoa.backend.repository.RefreshTokenRepository;
import com.testmoa.backend.repository.UserRepository;
import com.testmoa.backend.global.security.Provider;
import com.testmoa.backend.global.security.Role;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.service.SubscriptionService;
import com.testmoa.backend.service.UserService;
import com.testmoa.backend.dto.request.WithdrawRequest;
import com.testmoa.backend.entity.Cashout;
import com.testmoa.backend.repository.CashoutRepository;
import org.springframework.scheduling.annotation.Scheduled;
import java.time.Duration;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserServiceImpl implements UserService {
    /** 탈퇴 유예 기간(#84, 팀 확정) */
    public static final Duration WITHDRAWAL_GRACE = Duration.ofDays(30);

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final CashoutRepository cashoutRepository;
    private final SubscriptionService subscriptionService;
    private final PasswordEncoder passwordEncoder;

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
     * 이름·닉네임 수정. 닉네임을 그대로 두면 중복 검사를 하지 않는다.
     * ponytail: 검사와 저장 사이에 같은 닉네임이 생기면 unique 제약으로 500. 가입과 같이 드물어서 그대로 둔다
     */
    @Override
    @Transactional
    public MeResponse updateProfile(Long userId, ProfileUpdateRequest request) {
        User user = userRepository.findById(userId).orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        String nickname = request.nickname().trim();
        if (!nickname.equals(user.getNickname()) && userRepository.existsByNickname(nickname)) {
            throw new BusinessException(ErrorCode.NICKNAME_TAKEN, ErrorCode.NICKNAME_TAKEN.getMessage(),
                    Map.of("nickname", ErrorCode.NICKNAME_TAKEN.getMessage()));
        }
        user.updateProfile(request.name().trim(), nickname);
        return getMe(userId);
    }

    /**
     * 비밀번호 변경. 이메일 로그인 계정이 있으면 현재 비밀번호를 확인하고, 없는 소셜 회원은 이메일 로그인 계정을 새로 만든다.
     * 바꾸면 지금 세션을 뺀 refresh 토큰을 지운다. 그 세션의 access 토큰도 요청마다 세션을 확인해서 바로 401이 된다
     */
    @Override
    @Transactional
    public void changePassword(Long userId, String sessionId, PasswordChangeRequest request) {
        User user = userRepository.findById(userId).orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        Optional<Account> local = accountRepository.findByUserId(userId).stream()
                .filter(account -> account.getProvider() == Provider.LOCAL)
                .findFirst();

        if (local.isPresent()) {
            String current = request.currentPassword();
            if (current == null || current.isEmpty() || !passwordEncoder.matches(current, local.get().getPassword())) {
                throw fieldError("currentPassword", "현재 비밀번호가 맞지 않아요");
            }
            if (passwordEncoder.matches(request.newPassword(), local.get().getPassword())) {
                throw fieldError("newPassword", "지금 쓰는 비밀번호와 달라야 해요");
            }
            local.get().changePassword(passwordEncoder.encode(request.newPassword()));
        } else {
            // ponytail: 비밀번호 만들기를 동시에 두 번 보내면 두 번째가 (user_id, provider) unique 제약으로 500. 닉네임 경쟁과 같이 드물어서 그대로 둔다
            accountRepository.save(Account.builder()
                    .user(user)
                    .provider(Provider.LOCAL)
                    .password(passwordEncoder.encode(request.newPassword()))
                    .build());
        }

        if (sessionId == null) refreshTokenRepository.deleteByUser(user);
        else refreshTokenRepository.deleteOtherSessions(user, sessionId);
    }

    /**
     * 탈퇴 신청. 비밀번호(소셜로만 가입했으면 확인 문구)를 확인하고 탈퇴 유예로 바꾼 뒤 모든 기기의 로그인을 끊는다.
     * 출금 처리 중인 요청이 있으면 처리될 때까지 막는다. 남은 크레딧은 파기 때 함께 쓸 수 없게 된다(지갑은 기록으로 남는다).
     * 출금 신청도 회원 행을 먼저 잠가서, 동시에 와도 둘 중 하나만 된다
     */
    @Override
    @Transactional
    public void withdraw(Long userId, WithdrawRequest request) {
        User user = userRepository.findByIdForUpdate(userId).orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        Optional<Account> local = accountRepository.findByUserId(userId).stream()
                .filter(account -> account.getProvider() == Provider.LOCAL)
                .findFirst();
        if (local.isPresent()) {
            String password = request.password();
            if (password == null || password.isEmpty() || !passwordEncoder.matches(password, local.get().getPassword())) {
                throw fieldError("password", "비밀번호가 맞지 않아요");
            }
        } else if (!WithdrawRequest.CONFIRM_TEXT.equals(request.confirmText() == null ? null : request.confirmText().trim())) {
            throw fieldError("confirmText", "'" + WithdrawRequest.CONFIRM_TEXT + "'를 그대로 입력해 주세요");
        }
        if (cashoutRepository.existsByUserIdAndStatus(userId, Cashout.Status.REQUESTED)) {
            throw new BusinessException(ErrorCode.CASHOUT_IN_PROGRESS);
        }
        user.withdraw(LocalDateTime.now());
        refreshTokenRepository.deleteByUser(user);
    }

    /** 매일 새벽 4시, 탈퇴 신청 뒤 30일이 지난 회원을 파기한다 */
    @Scheduled(cron = "${withdrawal.purge-cron:0 0 4 * * *}")
    @Transactional
    public void purgeExpiredWithdrawals() {
        purgeWithdrawnBefore(LocalDateTime.now().minus(WITHDRAWAL_GRACE));
    }

    /** 로그인 계정(이메일·소셜)과 로그인 세션을 지우고 회원의 개인정보를 파기한다. 이름·이메일로 다시 찾을 수 없다 */
    @Override
    @Transactional
    public int purgeWithdrawnBefore(LocalDateTime cutoff) {
        List<User> expired = userRepository.findByStatusAndWithdrawnAtBefore(UserStatus.WITHDRAWN, cutoff);
        for (User user : expired) {
            accountRepository.deleteAll(accountRepository.findByUserId(user.getId()));
            refreshTokenRepository.deleteByUser(user);
            user.purge();
        }
        return expired.size();
    }

    private static BusinessException fieldError(String field, String message) {
        return new BusinessException(ErrorCode.INVALID_INPUT, message, Map.of(field, message));
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
