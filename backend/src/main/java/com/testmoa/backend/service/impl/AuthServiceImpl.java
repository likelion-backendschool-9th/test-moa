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
import java.util.Locale;

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

        return issueTokens(user);
    }

    /**
     * 토큰 갱신. 쓴 refresh 토큰은 지우고 새 쌍을 준다. 같은 토큰을 두 번 쓰면 두 번째는 실패한다
     */
    @Override
    public TokenResponse refresh(String refreshToken) {
        RefreshToken saved = refreshTokenRepository.findByTokenHash(hash(refreshToken))
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN));
        refreshTokenRepository.delete(saved);

        User user = saved.getUser();
        if (saved.isExpired(LocalDateTime.now()) || user.getStatus() != UserStatus.ACTIVE) {
            throw new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN);
        }

        return issueTokens(user);
    }

    /**
     * 로그아웃. 이미 없는 토큰이어도 성공으로 본다
     */
    @Override
    public void logout(String refreshToken) {
        refreshTokenRepository.deleteByTokenHash(hash(refreshToken));
    }

    // ponytail: 만료된 refresh 토큰 행은 지우지 않고 쌓인다. 많아지면 만료 행을 지우는 스케줄러를 더한다
    private TokenResponse issueTokens(User user) {
        String refreshToken = newRefreshToken();
        refreshTokenRepository.save(RefreshToken.builder()
                .user(user)
                .tokenHash(hash(refreshToken))
                .expiresAt(LocalDateTime.now().plus(refreshTokenTtl))
                .build());

        return new TokenResponse(
                jwtProvider.createAccessToken(user.getId()),
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
