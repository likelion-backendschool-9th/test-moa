package com.testmoa.backend.service.impl;

import com.testmoa.backend.dto.request.CashoutCreateRequest;
import com.testmoa.backend.entity.CreditWallet;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.repository.CashoutRequestRepository;
import com.testmoa.backend.repository.CreditWalletRepository;
import com.testmoa.backend.repository.UserRepository;
import com.testmoa.backend.global.security.Role;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.service.CreditService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * #67-S5 동시 출금. 실제 DB에서 지갑 행 잠금이 잔액 초과를 막는지 본다.
 * 테스트 메서드에 @Transactional을 두지 않는다(스레드가 각자 커밋해야 함).
 */
@SpringBootTest
class CreditCashoutConcurrencyTest {

    @Autowired
    private CreditService creditService;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private CreditWalletRepository creditWalletRepository;
    @Autowired
    private CashoutRequestRepository cashoutRequestRepository;
    @Autowired
    private PlatformTransactionManager transactionManager;

    @Test
    @DisplayName("#67-S5 동시 신청이 잔액을 넘지 않음")
    void concurrentCashoutsDoNotExceedCashable() throws Exception {
        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long userId = tx.execute(status -> {
            User user = userRepository.save(User.builder()
                    .name("한서윤")
                    .nickname("cashout" + suffix)
                    .email("cashout" + suffix + "@example.com")
                    .role(Role.USER)
                    .status(UserStatus.ACTIVE)
                    .build());
            CreditWallet wallet = CreditWallet.builder().user(user).build();
            wallet.grantEarned(5000);
            creditWalletRepository.save(wallet);
            return user.getId();
        });

        CashoutCreateRequest request = new CashoutCreateRequest(5000, "토스뱅크", "100012345678", "한서윤");
        AtomicInteger successes = new AtomicInteger();
        AtomicInteger failures = new AtomicInteger();
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(2);
        ExecutorService pool = Executors.newFixedThreadPool(2);

        for (int i = 0; i < 2; i++) {
            pool.submit(() -> {
                ready.countDown();
                try {
                    start.await(5, TimeUnit.SECONDS);
                    creditService.requestCashout(userId, request);
                    successes.incrementAndGet();
                } catch (BusinessException e) {
                    failures.incrementAndGet();
                } catch (Exception e) {
                    failures.incrementAndGet();
                } finally {
                    done.countDown();
                }
            });
        }

        assertTrue(ready.await(5, TimeUnit.SECONDS));
        start.countDown();
        assertTrue(done.await(15, TimeUnit.SECONDS));
        pool.shutdown();

        CreditWallet wallet = creditWalletRepository.findByUserId(userId).orElseThrow();
        assertEquals(2, successes.get() + failures.get());
        assertEquals(1, successes.get());
        assertEquals(1, failures.get());
        assertEquals(5000, wallet.getLockedBalance());
        assertEquals(0, wallet.getEarnedBalance());
        assertEquals(1, cashoutRequestRepository.findByUserIdOrderByCreatedAtDesc(userId).size());

        tx.executeWithoutResult(status -> {
            cashoutRequestRepository.findByUserIdOrderByCreatedAtDesc(userId)
                    .forEach(cashoutRequestRepository::delete);
            creditWalletRepository.findByUserId(userId).ifPresent(creditWalletRepository::delete);
            userRepository.deleteById(userId);
        });
    }
}
