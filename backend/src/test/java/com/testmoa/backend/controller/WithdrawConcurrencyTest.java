package com.testmoa.backend.controller;

import com.testmoa.backend.dto.request.CashoutCreateRequest;
import com.testmoa.backend.dto.request.WithdrawRequest;
import com.testmoa.backend.entity.CreditWallet;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.security.Role;
import com.testmoa.backend.repository.CreditWalletRepository;
import com.testmoa.backend.repository.UserRepository;
import com.testmoa.backend.global.security.JwtProvider;
import com.testmoa.backend.service.AuthService;
import com.testmoa.backend.service.CashoutService;
import com.testmoa.backend.service.UserService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 탈퇴 신청과 출금 신청의 동시 요청(#84). 테스트 전체를 트랜잭션으로 감싸면 확인할 수 없어서 따로 두고, 만든 행은 직접 지운다
 */
@SpringBootTest
class WithdrawConcurrencyTest {
    @Autowired UserRepository userRepository;
    @Autowired CreditWalletRepository creditWalletRepository;
    @Autowired UserService userService;
    @Autowired CashoutService cashoutService;
    @Autowired AuthService authService;
    @Autowired JwtProvider jwtProvider;
    @Autowired JdbcTemplate jdbc;

    private final List<Long> userIds = new ArrayList<>();

    @AfterEach
    void cleanUp() {
        for (Long id : userIds) {
            jdbc.update("delete from cashouts where user_id = ?", id);
            jdbc.update("delete from credit_wallets where user_id = ?", id);
            jdbc.update("delete from refresh_tokens where user_id = ?", id);
            jdbc.update("delete from users where id = ?", id);
        }
    }

    // 소셜로만 가입한 회원(확인 문구로 탈퇴)과 출금할 수 있는 크레딧 5,000
    private User member(int round) {
        String nickname = "동시탈퇴" + round + UUID.randomUUID().toString().substring(0, 6);
        User user = userRepository.save(User.builder().nickname(nickname).email(nickname + "@example.com")
                .role(Role.USER).status(UserStatus.ACTIVE).build());
        userIds.add(user.getId());
        CreditWallet wallet = CreditWallet.builder().user(user).build();
        wallet.grantEarned(5000);
        creditWalletRepository.save(wallet);
        return user;
    }

    private static boolean succeeded(Runnable action) {
        try {
            action.run();
            return true;
        } catch (RuntimeException e) {
            return false;
        }
    }

    @Test
    @DisplayName("#84-S21 탈퇴 신청과 출금 신청이 동시에 와도 둘 중 하나만 된다")
    void 탈퇴와_출금은_동시에_되지_않는다() throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(2);
        for (int round = 0; round < 5; round++) {
            Long userId = member(round).getId();
            CountDownLatch start = new CountDownLatch(1);
            Future<Boolean> withdrew = pool.submit(() -> {
                start.await();
                return succeeded(() -> userService.withdraw(userId, new WithdrawRequest(null, WithdrawRequest.CONFIRM_TEXT)));
            });
            Future<Boolean> cashedOut = pool.submit(() -> {
                start.await();
                return succeeded(() -> cashoutService.requestCashout(userId,
                        new CashoutCreateRequest(3000, "국민은행", "1234567890", "김동시")));
            });
            start.countDown();

            assertThat(withdrew.get() ^ cashedOut.get()).as("round %d", round).isTrue();
            String status = jdbc.queryForObject("select status from users where id = ?", String.class, userId);
            Integer requested = jdbc.queryForObject(
                    "select count(*) from cashouts where user_id = ? and status = 'REQUESTED'", Integer.class, userId);
            assertThat(status.equals("WITHDRAWN") && requested > 0).as("round %d", round).isFalse();
        }
        pool.shutdown();
    }

    @Test
    @DisplayName("#84-S26 파기 작업과 되돌리기가 동시에 와도 되돌린 회원은 파기하지 않는다")
    void 되돌린_회원은_파기하지_않는다() throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(2);
        for (int round = 0; round < 10; round++) {
            Long userId = member(round).getId();
            userService.withdraw(userId, new WithdrawRequest(null, WithdrawRequest.CONFIRM_TEXT));
            String token = jwtProvider.createRestoreToken(userId, userRepository.findById(userId).orElseThrow().getWithdrawnAt());
            CountDownLatch start = new CountDownLatch(1);
            Future<Boolean> restored = pool.submit(() -> {
                start.await();
                return succeeded(() -> authService.restore(token));
            });
            Future<Integer> purge = pool.submit(() -> {
                start.await();
                return userService.purgeWithdrawnBefore(LocalDateTime.now().plusMinutes(1));
            });
            start.countDown();

            boolean wasRestored = restored.get();
            purge.get();
            String status = jdbc.queryForObject("select status from users where id = ?", String.class, userId);
            assertThat(status).as("round %d", round).isEqualTo(wasRestored ? "ACTIVE" : "DELETED");
        }
        pool.shutdown();
    }
}
