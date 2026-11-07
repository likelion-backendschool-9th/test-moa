package com.testmoa.backend.service.admin.impl;

import com.testmoa.backend.dto.request.CashoutRejectRequest;
import com.testmoa.backend.entity.Cashout;
import com.testmoa.backend.entity.CreditWallet;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.repository.CashoutRepository;
import com.testmoa.backend.repository.CreditLedgerRepository;
import com.testmoa.backend.repository.CreditWalletRepository;
import com.testmoa.backend.repository.UserRepository;
import com.testmoa.backend.global.security.Role;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.service.admin.CashoutService;
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
 * #68-S9 같은 요청에 지급과 반려가 동시에 들어와도 한쪽만 적용된다.
 * 테스트 메서드에 @Transactional을 두지 않는다(스레드가 각자 커밋해야 함).
 */
@SpringBootTest
class CashoutConcurrencyTest {

    @Autowired CashoutService cashoutService;
    @Autowired UserRepository userRepository;
    @Autowired CreditWalletRepository creditWalletRepository;
    @Autowired CreditLedgerRepository creditLedgerRepository;
    @Autowired CashoutRepository cashoutRepository;
    @Autowired PlatformTransactionManager transactionManager;

    @Test
    @DisplayName("#68-S9 같은 요청을 동시에 처리하면 한쪽만 적용된다")
    void payAndRejectAtOnceApplyOnlyOne() throws Exception {
        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long[] ids = tx.execute(status -> {
            User user = userRepository.save(User.builder()
                    .name("한서윤")
                    .nickname("admincashout" + suffix)
                    .email("admincashout" + suffix + "@example.com")
                    .role(Role.USER)
                    .status(UserStatus.ACTIVE)
                    .build());
            CreditWallet wallet = CreditWallet.builder().user(user).build();
            wallet.grantEarned(5000);
            wallet.lockForCashout(5000);
            creditWalletRepository.save(wallet);
            Cashout cashout = cashoutRepository.save(Cashout.builder()
                    .user(user)
                    .amount(5000)
                    .bank("토스뱅크")
                    .accountNumber("100012345678")
                    .accountHolder("한서윤")
                    .build());
            return new Long[]{user.getId(), cashout.getId()};
        });
        Long userId = ids[0];
        Long cashoutId = ids[1];

        AtomicInteger successes = new AtomicInteger();
        AtomicInteger conflicts = new AtomicInteger();
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(2);
        ExecutorService pool = Executors.newFixedThreadPool(2);

        Runnable pay = () -> cashoutService.pay(cashoutId);
        Runnable reject = () -> cashoutService.reject(
                cashoutId, new CashoutRejectRequest(Cashout.RejectReason.ACCOUNT, null));
        for (Runnable action : new Runnable[]{pay, reject}) {
            pool.submit(() -> {
                ready.countDown();
                try {
                    start.await(5, TimeUnit.SECONDS);
                    action.run();
                    successes.incrementAndGet();
                } catch (BusinessException e) {
                    if (e.getErrorCode() == ErrorCode.CASHOUT_ALREADY_PROCESSED) {
                        conflicts.incrementAndGet();
                    }
                } catch (Exception ignored) {
                    // 다른 실패는 아래 개수 검사에서 드러난다
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
        assertEquals(1, successes.get());
        assertEquals(1, conflicts.get());
        assertEquals(0, wallet.getLockedBalance());
        /* 지급이면 적립 0과 장부 1줄, 반려면 적립 5,000과 장부 0줄이다. 둘이 같이 적용되지 않는다 */
        long ledgers = creditLedgerRepository.findAll().stream()
                .filter(ledger -> ledger.getCreditWallet().getId().equals(wallet.getId())).count();
        if (wallet.getEarnedBalance() == 0) {
            assertEquals(1, ledgers);
        } else {
            assertEquals(5000, wallet.getEarnedBalance());
            assertEquals(0, ledgers);
        }

        tx.executeWithoutResult(status -> {
            creditLedgerRepository.findAll().stream()
                    .filter(ledger -> ledger.getCreditWallet().getId().equals(wallet.getId()))
                    .forEach(creditLedgerRepository::delete);
            cashoutRepository.deleteById(cashoutId);
            creditWalletRepository.deleteById(wallet.getId());
            userRepository.deleteById(userId);
        });
    }
}
