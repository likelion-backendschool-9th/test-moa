package com.testmoa.backend.service.impl;

import com.testmoa.backend.entity.CreditLedger;
import com.testmoa.backend.entity.CreditWallet;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.security.Role;
import com.testmoa.backend.repository.CreditLedgerRepository;
import com.testmoa.backend.repository.CreditWalletRepository;
import com.testmoa.backend.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 가입 크레딧 지급 한 건(#255). 지급액은 생성자로 바꿔 끼워서 설정 값이 달라도 같은 규칙인지 본다
 */
@SpringBootTest
@Transactional
class SignupCreditServiceImplTest {

    @Autowired UserRepository userRepository;
    @Autowired CreditWalletRepository creditWalletRepository;
    @Autowired CreditLedgerRepository creditLedgerRepository;

    private User saveUser() {
        return userRepository.save(User.builder()
                .name("김회원").nickname("t" + UUID.randomUUID().toString().substring(0, 8))
                .email(UUID.randomUUID() + "@example.com")
                .role(Role.USER).status(UserStatus.ACTIVE).build());
    }

    private SignupCreditServiceImpl service(int amount) {
        return new SignupCreditServiceImpl(userRepository, creditWalletRepository, creditLedgerRepository, amount, Clock.systemDefaultZone());
    }

    @Test
    @DisplayName("#255-S4 지급액은 설정 값이라 5,000이면 이벤트 크레딧 5,000과 장부 +5,000이 남는다")
    void 지급액은_설정_값이다() {
        User user = saveUser();

        assertThat(service(5000).grant(user.getId())).isTrue();

        CreditWallet wallet = creditWalletRepository.findByUserId(user.getId()).orElseThrow();
        assertThat(wallet.getEventCredit()).isEqualTo(5000);
        List<CreditLedger> ledgers = creditLedgerRepository.findByCreditWalletIdOrderByCreatedAtDesc(wallet.getId());
        assertThat(ledgers).hasSize(1);
        assertThat(ledgers.get(0).getDelta()).isEqualTo(5000);
    }

    @Test
    @DisplayName("#255-S4 지급액이 0 이하이면 지급하지 않고 지갑도 장부도 만들지 않는다")
    void 지급액이_0이하이면_지급하지_않는다() {
        User user = saveUser();
        long ledgers = creditLedgerRepository.count();

        assertThat(service(0).grant(user.getId())).isFalse();
        assertThat(service(-100).grant(user.getId())).isFalse();

        assertThat(creditWalletRepository.findByUserId(user.getId())).isEmpty();
        assertThat(creditLedgerRepository.count()).isEqualTo(ledgers);
    }

    @Test
    @DisplayName("#255-S8 이미 받은 회원에게는 다시 지급하지 않는다")
    void 이미_받았으면_다시_지급하지_않는다() {
        User user = saveUser();
        SignupCreditServiceImpl service = service(3000);

        assertThat(service.grant(user.getId())).isTrue();
        assertThat(service.grant(user.getId())).isFalse();

        CreditWallet wallet = creditWalletRepository.findByUserId(user.getId()).orElseThrow();
        assertThat(wallet.getEventCredit()).isEqualTo(3000);
        assertThat(creditLedgerRepository.findByCreditWalletIdOrderByCreatedAtDesc(wallet.getId())).hasSize(1);
    }
}
