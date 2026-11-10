package com.testmoa.backend.service;

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
import org.springframework.context.ApplicationContext;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 이미 가입한 회원에게 가입 크레딧을 한 번 지급하는 실행기(#255)
 */
@SpringBootTest
@Transactional
class SignupCreditBackfillRunnerTest {

    @Autowired UserRepository userRepository;
    @Autowired CreditWalletRepository creditWalletRepository;
    @Autowired CreditLedgerRepository creditLedgerRepository;
    @Autowired SignupCreditService signupCreditService;
    @Autowired ApplicationContext context;

    private User saveUser(Role role, UserStatus status) {
        return userRepository.save(User.builder()
                .name("김회원").nickname("t" + UUID.randomUUID().toString().substring(0, 8))
                .email(UUID.randomUUID() + "@example.com")
                .role(role).status(status).build());
    }

    private SignupCreditBackfillRunner runner() {
        return new SignupCreditBackfillRunner(userRepository, signupCreditService);
    }

    private int eventCredit(User user) {
        return creditWalletRepository.findByUserId(user.getId()).map(CreditWallet::getEventCredit).orElse(-1);
    }

    private long signupLedgers(User user) {
        return creditWalletRepository.findByUserId(user.getId())
                .map(wallet -> creditLedgerRepository.findByCreditWalletIdOrderByCreatedAtDesc(wallet.getId()).stream()
                        .filter(ledger -> ledger.getType() == CreditLedger.Type.EVENT && "가입 크레딧".equals(ledger.getDescription()))
                        .count())
                .orElse(0L);
    }

    @Test
    @DisplayName("#255-S7 가입 크레딧을 받지 않은 기존 회원에게 지급하고 관리자·탈퇴·파기 회원은 뺀다")
    void 기존_회원에게_지급하고_관리자와_탈퇴_회원은_뺀다() {
        User noWallet = saveUser(Role.USER, UserStatus.ACTIVE);
        User withWallet = saveUser(Role.USER, UserStatus.ACTIVE);
        CreditWallet wallet = creditWalletRepository.save(CreditWallet.builder().user(withWallet).build());
        wallet.grantEarned(500);
        User suspended = saveUser(Role.USER, UserStatus.SUSPENDED);
        User admin = saveUser(Role.ADMIN, UserStatus.ACTIVE);
        User withdrawn = saveUser(Role.USER, UserStatus.WITHDRAWN);
        User deleted = saveUser(Role.USER, UserStatus.DELETED);

        runner().run(null);

        assertThat(eventCredit(noWallet)).isEqualTo(3000);
        assertThat(eventCredit(suspended)).isEqualTo(3000);
        assertThat(eventCredit(withWallet)).isEqualTo(3000);
        assertThat(creditWalletRepository.findByUserId(withWallet.getId()).orElseThrow().getEarnedBalance()).isEqualTo(500);
        for (User user : List.of(noWallet, withWallet, suspended)) assertThat(signupLedgers(user)).isEqualTo(1);
        for (User user : List.of(admin, withdrawn, deleted)) {
            assertThat(creditWalletRepository.findByUserId(user.getId())).isEmpty();
        }
    }

    @Test
    @DisplayName("#255-S8 실행기를 두 번 돌려도 중복 지급되지 않는다")
    void 두_번_돌려도_중복_지급되지_않는다() {
        User user = saveUser(Role.USER, UserStatus.ACTIVE);
        /* 가입으로 이미 받은 회원 */
        User signedUp = saveUser(Role.USER, UserStatus.ACTIVE);
        signupCreditService.grant(signedUp.getId());

        runner().run(null);
        runner().run(null);

        assertThat(eventCredit(user)).isEqualTo(3000);
        assertThat(signupLedgers(user)).isEqualTo(1);
        assertThat(eventCredit(signedUp)).isEqualTo(3000);
        assertThat(signupLedgers(signedUp)).isEqualTo(1);
    }

    @Test
    @DisplayName("#255-S8 한 회원의 지급이 실패해도 나머지는 계속하고 예외를 밖으로 던지지 않는다")
    void 한_회원이_실패해도_나머지는_계속한다() {
        UserRepository users = mock(UserRepository.class);
        SignupCreditService service = mock(SignupCreditService.class);
        when(users.findIdsByRoleAndStatusIn(Role.USER, SignupCreditService.BACKFILL_STATUSES)).thenReturn(List.of(1L, 2L, 3L));
        when(service.grantToExistingMember(1L)).thenReturn(true);
        when(service.grantToExistingMember(2L)).thenThrow(new IllegalStateException("저장 실패"));
        when(service.grantToExistingMember(3L)).thenReturn(false);

        assertThatCode(() -> new SignupCreditBackfillRunner(users, service).run(null)).doesNotThrowAnyException();

        verify(service).grantToExistingMember(1L);
        verify(service).grantToExistingMember(2L);
        verify(service).grantToExistingMember(3L);
    }

    @Test
    @DisplayName("#255-S7 후보를 읽은 뒤 탈퇴·파기·권한이 바뀐 회원은 지급하지 않고 나머지는 지급한다")
    void 후보를_읽은_뒤_대상이_아니게_된_회원은_건너뛴다() {
        User active = saveUser(Role.USER, UserStatus.ACTIVE);
        User withdrawn = saveUser(Role.USER, UserStatus.WITHDRAWN);
        User deleted = saveUser(Role.USER, UserStatus.DELETED);
        User admin = saveUser(Role.ADMIN, UserStatus.ACTIVE);
        /* 후보 목록에는 네 명 모두 들어 있었다(읽은 뒤에 상태가 바뀐 상황) */
        UserRepository users = mock(UserRepository.class);
        when(users.findIdsByRoleAndStatusIn(Role.USER, SignupCreditService.BACKFILL_STATUSES))
                .thenReturn(List.of(withdrawn.getId(), deleted.getId(), admin.getId(), active.getId(), Long.MAX_VALUE));

        new SignupCreditBackfillRunner(users, signupCreditService).run(null);

        assertThat(eventCredit(active)).isEqualTo(3000);
        for (User user : List.of(withdrawn, deleted, admin)) {
            assertThat(creditWalletRepository.findByUserId(user.getId())).isEmpty();
        }
    }

    @Test
    @DisplayName("#255-S9 소급 지급 설정이 꺼져 있으면 실행기가 만들어지지 않는다")
    void 설정이_꺼져_있으면_실행기가_없다() {
        assertThat(context.getBeansOfType(SignupCreditBackfillRunner.class)).isEmpty();
    }
}
