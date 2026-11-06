package com.testmoa.backend.service.impl;

import com.testmoa.backend.domain.dto.request.LoginRequest;
import com.testmoa.backend.domain.dto.request.SignupRequest;
import com.testmoa.backend.domain.dto.response.TokenResponse;
import com.testmoa.backend.domain.entity.Account;
import com.testmoa.backend.domain.entity.RefreshToken;
import com.testmoa.backend.domain.entity.User;
import com.testmoa.backend.domain.repository.AccountRepository;
import com.testmoa.backend.domain.repository.RefreshTokenRepository;
import com.testmoa.backend.domain.repository.UserRepository;
import com.testmoa.backend.global.common.Provider;
import com.testmoa.backend.global.common.Role;
import com.testmoa.backend.global.common.UserStatus;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.global.security.JwtProvider;
import com.testmoa.backend.service.AuthService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@Transactional
public class AuthServiceImpl implements AuthService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final Duration refreshTokenTtl;

    public AuthServiceImpl(UserRepository userRepository,
                           AccountRepository accountRepository,
                           RefreshTokenRepository refreshTokenRepository,
                           PasswordEncoder passwordEncoder,
                           JwtProvider jwtProvider,
                           @Value("${jwt.refresh-token-ttl}") Duration refreshTokenTtl) {
        this.userRepository = userRepository;
        this.accountRepository = accountRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtProvider = jwtProvider;
        this.refreshTokenTtl = refreshTokenTtl;
    }

    /**
     * 이메일 회원가입. 회원(User)과 이메일 로그인 계정(Account, LOCAL)을 함께 만든다.
     * 토큰은 주지 않는다. 프론트가 가입 후 로그인 화면으로 보낸다
     */
    @Override
    public void signup(SignupRequest request) {
        String email = normalizeEmail(request.email());
        String nickname = request.nickname().trim();

        if (userRepository.existsByEmail(email)) throw new BusinessException(ErrorCode.EMAIL_TAKEN);
        if (userRepository.existsByNickname(nickname)) throw new BusinessException(ErrorCode.NICKNAME_TAKEN);

        User user = userRepository.save(User.builder()
                .name(request.name().trim())
                .nickname(nickname)
                .email(email)
                .role(Role.USER)
                .status(UserStatus.ACTIVE)
                .build());

        accountRepository.save(Account.builder()
                .user(user)
                .provider(Provider.LOCAL)
                .password(passwordEncoder.encode(request.password()))
                .build());
    }

    /**
     * 이메일 로그인. 이메일이 없거나 비밀번호가 틀리면 어느 쪽인지 알리지 않는다.
     * 탈퇴한 회원은 없는 계정처럼, 정지된 회원은 정지 안내로 막는다
     */
    @Override
    public TokenResponse login(LoginRequest request) {
        Account account = accountRepository.findByUser_EmailAndProvider(normalizeEmail(request.email()), Provider.LOCAL)
                .filter(found -> passwordEncoder.matches(request.password(), found.getPassword()))
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_CREDENTIALS));

        User user = account.getUser();
        if (user.getStatus() == UserStatus.WITHDRAWN) throw new BusinessException(ErrorCode.INVALID_CREDENTIALS);
        if (user.getStatus() == UserStatus.SUSPENDED) throw new BusinessException(ErrorCode.SUSPENDED);

        refreshTokenRepository.deleteByUserAndExpiresAtBefore(user, LocalDateTime.now());
        return issueTokens(user, UUID.randomUUID().toString());
    }

    /**
     * 토큰 갱신. 같은 세션의 새 쌍을 주고, 쓴 토큰은 다시 쓸 수 없게 표시한다. 같은 토큰을 두 번 쓰면 두 번째는 실패한다.
     * 세션의 토큰 행을 잠근 뒤 확인하고 표시해서, 같은 토큰이 동시에 와도 하나만 성공하고 진행 중인 로그아웃과 겹치지 않는다
     */
    @Override
    public TokenResponse refresh(String refreshToken) {
        String tokenHash = hash(refreshToken);
        String sessionId = refreshTokenRepository.findSessionIdByTokenHash(tokenHash)
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN));

        // 잠금을 기다리는 동안 다른 요청이 쓰거나 로그아웃으로 지웠으면, 여기서 읽는 최신 값에 반영돼 있다
        List<RefreshToken> session = refreshTokenRepository.findBySessionIdOrderByIdAsc(sessionId);
        RefreshToken saved = session.stream()
                .filter(token -> token.getTokenHash().equals(tokenHash))
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN));

        LocalDateTime now = LocalDateTime.now();
        User user = saved.getUser();
        if (saved.isUsed() || saved.isExpired(now) || user.getStatus() != UserStatus.ACTIVE) {
            throw new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN);
        }

        // 쓴 토큰은 만료될 때까지 남긴다. 몇 번을 갱신했든 예전 토큰으로 온 로그아웃도 세션을 찾아 끝낼 수 있다
        session.stream().filter(token -> token.isExpired(now)).forEach(refreshTokenRepository::delete);
        saved.markUsed(now);
        return issueTokens(user, sessionId);
    }

    /**
     * 로그아웃. 그 토큰의 로그인 세션을 통째로 끝낸다. 로그아웃 전에 시작한 갱신이 나중에 끝나도 그 토큰은 쓸 수 없다.
     * 세션을 잠근 뒤 지워서, 동시에 진행 중인 갱신이 끝나기를 기다렸다가 그 갱신이 만든 토큰까지 지운다.
     * 다른 기기의 로그인(다른 세션)은 그대로다. 이미 없는 토큰이어도 성공으로 본다
     */
    @Override
    public void logout(String refreshToken) {
        String tokenHash = hash(refreshToken);
        refreshTokenRepository.findSessionIdByTokenHash(tokenHash).ifPresentOrElse(sessionId -> {
            refreshTokenRepository.findBySessionIdOrderByIdAsc(sessionId);
            refreshTokenRepository.deleteBySessionId(sessionId);
        }, () -> refreshTokenRepository.deleteByTokenHash(tokenHash));
    }

    // ponytail: 쓴 토큰 행은 만료(14일)까지 남아 세션마다 갱신 횟수만큼 쌓인다(30분마다 갱신하면 최대 약 670행).
    // 만료 행은 갱신(그 세션)과 로그인(그 회원) 때 지운다. 다시 오지 않는 회원의 행은 남으니, 많아지면 만료 행을 지우는 스케줄러를 더한다
    private TokenResponse issueTokens(User user, String sessionId) {
        String refreshToken = newRefreshToken();
        refreshTokenRepository.save(RefreshToken.builder()
                .user(user)
                .sessionId(sessionId)
                .tokenHash(hash(refreshToken))
                .expiresAt(LocalDateTime.now().plus(refreshTokenTtl))
                .build());

        return new TokenResponse(
                jwtProvider.createAccessToken(user.getId(), sessionId),
                refreshToken,
                jwtProvider.getAccessTokenTtl().toSeconds(),
                refreshTokenTtl.toSeconds());
    }

    // 추측할 수 없는 32바이트 무작위 값
    private static String newRefreshToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e); // 모든 JVM에 SHA-256이 있어서 일어나지 않는다
        }
    }

    // 이메일은 대소문자를 가리지 않는다
    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
