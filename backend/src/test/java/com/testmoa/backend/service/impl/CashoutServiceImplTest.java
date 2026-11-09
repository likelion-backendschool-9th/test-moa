package com.testmoa.backend.service.impl;

import com.testmoa.backend.dto.request.CashoutCreateRequest;
import com.testmoa.backend.dto.response.CashoutResponse;
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
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CashoutServiceImplTest {

    private static final Long USER_ID = 1L;

    @Mock
    private UserRepository userRepository;
    @Mock
    private CreditWalletRepository creditWalletRepository;
    @Mock
    private CreditLedgerRepository creditLedgerRepository;
    @Mock
    private CashoutRepository cashoutRepository;

    @InjectMocks
    private CashoutServiceImpl cashoutService;

    @Test
    @DisplayName("#67-S2 출금 신청 성공·장부 없음·FOR UPDATE")
    void requestCashoutLocksEarnedWithoutLedger() {
        User user = user();
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        CreditWallet wallet = CreditWallet.builder().user(user).build();
        wallet.grantEarned(9480);
        when(creditWalletRepository.findLockedByUserId(USER_ID)).thenReturn(Optional.of(wallet));
        when(cashoutRepository.save(any(Cashout.class))).thenAnswer(invocation -> {
            Cashout saved = invocation.getArgument(0);
            ReflectionTestUtils.setField(saved, "id", 11L);
            return saved;
        });

        CashoutResponse response = cashoutService.requestCashout(USER_ID, validRequest(5000));

        assertEquals(11L, response.getId());
        assertEquals(5000, response.getAmount());
        assertEquals(Cashout.Status.REQUESTED, response.getStatus());
        assertEquals("100012345678", response.getAccountNumber());
        assertEquals(4480, wallet.getEarnedBalance());
        assertEquals(5000, wallet.getLockedBalance());
        verify(creditWalletRepository).findLockedByUserId(USER_ID);
        verify(creditLedgerRepository, never()).save(any());
        ArgumentCaptor<Cashout> captor = ArgumentCaptor.forClass(Cashout.class);
        verify(cashoutRepository).save(captor.capture());
        assertEquals("토스뱅크", captor.getValue().getBank());
        assertEquals("한서윤", captor.getValue().getAccountHolder());
    }

    @Test
    @DisplayName("#67-S3 출금 가능액 초과는 거절·행 변화 없음")
    void requestCashoutRejectsOverCashable() {
        User user = user();
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        CreditWallet wallet = CreditWallet.builder().user(user).build();
        wallet.grantEarned(4480);
        when(creditWalletRepository.findLockedByUserId(USER_ID)).thenReturn(Optional.of(wallet));

        BusinessException ex = assertThrows(
                BusinessException.class,
                () -> cashoutService.requestCashout(USER_ID, validRequest(5000))
        );

        assertEquals(ErrorCode.INVALID_INPUT, ex.getErrorCode());
        assertEquals(4480, wallet.getEarnedBalance());
        assertEquals(0, wallet.getLockedBalance());
        verify(cashoutRepository, never()).save(any());
    }

    @Test
    @DisplayName("#67-S3 금액 1 미만은 BusinessException·잠금 없음")
    void requestCashoutRejectsNonPositiveAmount() {
        User user = user();
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));

        BusinessException ex = assertThrows(
                BusinessException.class,
                () -> cashoutService.requestCashout(USER_ID, validRequest(0))
        );

        assertEquals(ErrorCode.INVALID_INPUT, ex.getErrorCode());
        verify(creditWalletRepository, never()).findLockedByUserId(any());
        verify(cashoutRepository, never()).save(any());
    }

    @Test
    @DisplayName("#67-S4 이벤트 크레딧만 있으면 출금 불가")
    void requestCashoutRejectsEventOnly() {
        User user = user();
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        CreditWallet wallet = CreditWallet.builder().user(user).build();
        wallet.grantEvent(3000);
        when(creditWalletRepository.findLockedByUserId(USER_ID)).thenReturn(Optional.of(wallet));

        BusinessException ex = assertThrows(
                BusinessException.class,
                () -> cashoutService.requestCashout(USER_ID, validRequest(1000))
        );

        assertEquals(ErrorCode.INVALID_INPUT, ex.getErrorCode());
        assertEquals(0, wallet.getLockedBalance());
        verify(cashoutRepository, never()).save(any());
    }

    @Test
    @DisplayName("신청은 지갑 FOR UPDATE를 쓴다")
    void requestCashoutUsesPessimisticWalletLock() {
        User user = user();
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        CreditWallet wallet = CreditWallet.builder().user(user).build();
        wallet.grantEarned(5000);
        when(creditWalletRepository.findLockedByUserId(USER_ID)).thenReturn(Optional.of(wallet));
        when(cashoutRepository.save(any(Cashout.class))).thenAnswer(invocation -> {
            Cashout saved = invocation.getArgument(0);
            ReflectionTestUtils.setField(saved, "id", 12L);
            return saved;
        });

        cashoutService.requestCashout(USER_ID, validRequest(5000));

        verify(creditWalletRepository).findLockedByUserId(USER_ID);
        verify(creditWalletRepository, never()).findByUserId(USER_ID);
        assertEquals(0, wallet.getEarnedBalance());
        assertEquals(5000, wallet.getLockedBalance());
    }

    @Test
    @DisplayName("#67-S6 출금 내역은 최신순·완료 건 계좌 마스킹")
    void getCashoutsMasksCompletedAccounts() {
        when(userRepository.existsById(USER_ID)).thenReturn(true);
        User user = user();
        Cashout requested = Cashout.builder()
                .user(user)
                .amount(1000)
                .bank("토스뱅크")
                .accountNumber("100012345678")
                .accountHolder("한서윤")
                .build();
        ReflectionTestUtils.setField(requested, "id", 1L);
        Cashout paid = Cashout.builder()
                .user(user)
                .amount(3000)
                .bank("국민은행")
                .accountNumber("123456789012")
                .accountHolder("한서윤")
                .build();
        ReflectionTestUtils.setField(paid, "id", 2L);
        paid.pay(java.time.LocalDateTime.of(2026, 11, 5, 12, 0));
        when(cashoutRepository.findByUserIdOrderByCreatedAtDesc(USER_ID))
                .thenReturn(List.of(requested, paid));

        List<CashoutResponse> responses = cashoutService.getCashouts(USER_ID);

        assertEquals("100012345678", responses.get(0).getAccountNumber());
        assertEquals("한서윤", responses.get(0).getAccountHolder());
        assertEquals("****9012", responses.get(1).getAccountNumber());
        assertEquals("한*윤", responses.get(1).getAccountHolder());
        assertNull(responses.get(0).getProcessedAt());
        assertEquals(Cashout.Status.PAID, responses.get(1).getStatus());
    }

    private static User user() {
        User user = User.builder()
                .name("한서윤")
                .nickname("tester")
                .email("tester@example.com")
                .role(Role.USER)
                .status(UserStatus.ACTIVE)
                .build();
        ReflectionTestUtils.setField(user, "id", USER_ID);
        return user;
    }

    private static CashoutCreateRequest validRequest(int amount) {
        return new CashoutCreateRequest(amount, "토스뱅크", "100012345678", "한서윤");
    }
}
