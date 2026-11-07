package com.testmoa.backend.service.impl;

import com.testmoa.backend.dto.response.CreditBalanceResponse;
import com.testmoa.backend.dto.response.CreditLedgerResponse;
import com.testmoa.backend.entity.CreditLedger;
import com.testmoa.backend.entity.CreditWallet;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.repository.CreditLedgerRepository;
import com.testmoa.backend.repository.CreditWalletRepository;
import com.testmoa.backend.repository.RegisterRepository;
import com.testmoa.backend.repository.UserRepository;
import com.testmoa.backend.entity.enums.CreditType;
import com.testmoa.backend.entity.enums.FeedbackStatus;
import com.testmoa.backend.entity.enums.LedgerFlow;
import com.testmoa.backend.entity.enums.RegisterStatus;
import com.testmoa.backend.global.security.Role;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CreditServiceImplTest {

    private static final Long USER_ID = 1L;

    @Mock
    private UserRepository userRepository;
    @Mock
    private CreditWalletRepository creditWalletRepository;
    @Mock
    private CreditLedgerRepository creditLedgerRepository;
    @Mock
    private RegisterRepository registerRepository;

    @InjectMocks
    private CreditServiceImpl creditService;

    @Test
    @DisplayName("#66-S1 잔액·파생 값과 승인 대기")
    void getBalanceReturnsWalletDerivedFields() {
        when(userRepository.existsById(USER_ID)).thenReturn(true);
        CreditWallet wallet = CreditWallet.builder().user(null).build();
        wallet.grantEvent(3000);
        wallet.grantEarned(9480);
        wallet.lockForCashout(5000);
        when(creditWalletRepository.findByUserId(USER_ID)).thenReturn(Optional.of(wallet));
        when(registerRepository.sumPendingRewardByUserId(
                USER_ID, RegisterStatus.CONFIRMED, FeedbackStatus.SUBMITTED, FeedbackStatus.REPORTED
        )).thenReturn(1350);

        CreditBalanceResponse response = creditService.getBalance(USER_ID);

        assertEquals(4480, response.getEarnedBalance());
        assertEquals(3000, response.getEventCredit());
        assertEquals(5000, response.getLockedBalance());
        assertEquals(1350, response.getPendingReward());
        assertEquals(12480, response.getTotalCredits());
        assertEquals(7480, response.getPayableCredits());
        assertEquals(4480, response.getCashableCredits());
        verify(registerRepository).sumPendingRewardByUserId(
                eq(USER_ID),
                eq(RegisterStatus.CONFIRMED),
                eq(FeedbackStatus.SUBMITTED),
                eq(FeedbackStatus.REPORTED)
        );
    }

    @Test
    @DisplayName("승인 대기 조회는 CONFIRMED·SUBMITTED·REPORTED 조건으로 리포지토리를 부른다")
    void pendingRewardDelegatesToRegisterRepository() {
        when(userRepository.existsById(USER_ID)).thenReturn(true);
        when(creditWalletRepository.findByUserId(USER_ID)).thenReturn(Optional.empty());
        when(registerRepository.sumPendingRewardByUserId(
                USER_ID, RegisterStatus.CONFIRMED, FeedbackStatus.SUBMITTED, FeedbackStatus.REPORTED
        )).thenReturn(1350);

        CreditBalanceResponse response = creditService.getBalance(USER_ID);

        assertEquals(1350, response.getPendingReward());
        assertEquals(0, response.getEarnedBalance());
        verify(registerRepository).sumPendingRewardByUserId(
                USER_ID, RegisterStatus.CONFIRMED, FeedbackStatus.SUBMITTED, FeedbackStatus.REPORTED
        );
    }

    @Test
    @DisplayName("#66-S2 내역 in·out 필터")
    void getLedgersFiltersByFlow() {
        when(userRepository.existsById(USER_ID)).thenReturn(true);
        CreditWallet wallet = CreditWallet.builder().user(null).build();
        ReflectionTestUtils.setField(wallet, "id", 10L);
        when(creditWalletRepository.findByUserId(USER_ID)).thenReturn(Optional.of(wallet));

        CreditLedger in = CreditLedger.builder()
                .creditWallet(wallet)
                .delta(1000)
                .description("가입 크레딧")
                .type(CreditType.EVENT)
                .build();
        ReflectionTestUtils.setField(in, "id", 1L);
        when(creditLedgerRepository.findByCreditWalletIdAndDeltaGreaterThanOrderByCreatedAtDesc(10L, 0))
                .thenReturn(List.of(in));

        List<CreditLedgerResponse> responses = creditService.getLedgers(USER_ID, LedgerFlow.IN);

        assertEquals(1, responses.size());
        assertEquals(1000, responses.getFirst().getDelta());
        assertEquals("가입 크레딧", responses.getFirst().getDescription());
    }

    @Test
    @DisplayName("없는 사용자는 404")
    void missingUserNotFound() {
        when(userRepository.existsById(99L)).thenReturn(false);

        BusinessException ex = assertThrows(
                BusinessException.class,
                () -> creditService.getBalance(99L)
        );
        assertEquals(ErrorCode.NOT_FOUND, ex.getErrorCode());
    }

    @Test
    @DisplayName("지갑이 없으면 내역은 빈 목록")
    void missingWalletEmptyLedgers() {
        when(userRepository.existsById(USER_ID)).thenReturn(true);
        when(creditWalletRepository.findByUserId(USER_ID)).thenReturn(Optional.empty());

        assertTrue(creditService.getLedgers(USER_ID, LedgerFlow.ALL).isEmpty());
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
}
