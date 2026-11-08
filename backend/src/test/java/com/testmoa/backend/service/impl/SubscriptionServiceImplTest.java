package com.testmoa.backend.service.impl;

import com.testmoa.backend.dto.response.PayableCreditsResponse;
import com.testmoa.backend.dto.response.SubscriptionResponse;
import com.testmoa.backend.entity.CreditWallet;
import com.testmoa.backend.entity.Plan;
import com.testmoa.backend.entity.Subscription;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.global.security.Role;
import com.testmoa.backend.repository.CreditWalletRepository;
import com.testmoa.backend.repository.SubscriptionRepository;
import com.testmoa.backend.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SubscriptionServiceImplTest {

    private static final Long USER_ID = 1L;

    @Mock
    private UserRepository userRepository;
    @Mock
    private SubscriptionRepository subscriptionRepository;
    @Mock
    private CreditWalletRepository creditWalletRepository;

    @InjectMocks
    private SubscriptionServiceImpl service;

    private User user(Role role) {
        User user = User.builder()
                .name("한서윤").nickname("tester").email("tester@example.com")
                .role(role).status(UserStatus.ACTIVE).build();
        ReflectionTestUtils.setField(user, "id", USER_ID);
        return user;
    }

    private Plan plan(long id) {
        Plan plan = Plan.builder().tier("구독").cashPrice(10000).creditPrice(9000).periodDays(30).version(1).build();
        ReflectionTestUtils.setField(plan, "id", id);
        return plan;
    }

    private Subscription period(User user, Plan plan, LocalDateTime start, LocalDateTime end) {
        return Subscription.builder().user(user).plan(plan).startAt(start).endAt(end).build();
    }

    private void periodsAre(Subscription... periods) {
        when(subscriptionRepository.findByUserIdAndStatusAndEndAtAfterOrderByStartAtAsc(
                eq(USER_ID), eq(Subscription.Status.ACTIVE), any())).thenReturn(List.of(periods));
    }

    @Test
    @DisplayName("#69-S3 구독 행이 없으면 구독 중이 아니고 나머지 값은 null이다")
    void noSubscription() {
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user(Role.USER)));
        periodsAre();

        SubscriptionResponse response = service.statusAt(USER_ID, LocalDateTime.of(2026, 11, 25, 12, 0));

        assertTrue(response.eligible());
        assertFalse(response.active());
        assertNull(response.planId());
        assertNull(response.plan());
        assertNull(response.endAt());
        assertNull(response.remainingDays());
    }

    @Test
    @DisplayName("#69-S4 지금 기간이 있으면 구독 중이고 플랜 id·등급·만료일·남은 날이 나온다")
    void activeSubscription() {
        User user = user(Role.USER);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        LocalDateTime now = LocalDateTime.of(2026, 11, 25, 12, 0);
        periodsAre(period(user, plan(7L), LocalDateTime.of(2026, 11, 1, 0, 0), LocalDateTime.of(2026, 12, 1, 0, 0)));

        SubscriptionResponse response = service.statusAt(USER_ID, now);

        assertTrue(response.active());
        assertEquals(7L, response.planId());
        assertEquals("구독", response.plan());
        assertEquals(LocalDateTime.of(2026, 12, 1, 0, 0), response.endAt());
        assertEquals(6, response.remainingDays());
    }

    @Test
    @DisplayName("#69-S4 하루가 안 남아도 남은 날은 올림해서 1이다")
    void remainingDaysRoundUp() {
        User user = user(Role.USER);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        LocalDateTime now = LocalDateTime.of(2026, 11, 30, 12, 0);
        periodsAre(period(user, plan(7L), LocalDateTime.of(2026, 11, 1, 0, 0), LocalDateTime.of(2026, 12, 1, 0, 0)));

        assertEquals(1, service.statusAt(USER_ID, now).remainingDays());
    }

    @Test
    @DisplayName("#69-S5 미리 결제해 이어 붙은 기간이 있으면 만료일은 마지막 기간의 끝이다")
    void chainedPeriodsExtendEnd() {
        User user = user(Role.USER);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        Plan plan = plan(7L);
        Subscription first = period(user, plan, LocalDateTime.of(2026, 11, 1, 0, 0), LocalDateTime.of(2026, 12, 1, 0, 0));
        Subscription second = period(user, plan, LocalDateTime.of(2026, 12, 1, 0, 0), LocalDateTime.of(2026, 12, 31, 0, 0));

        periodsAre(first, second);
        SubscriptionResponse onNov25 = service.statusAt(USER_ID, LocalDateTime.of(2026, 11, 25, 12, 0));
        // 12/10에는 첫 기간이 이미 끝나서 조회에서 빠진다
        periodsAre(second);
        SubscriptionResponse onDec10 = service.statusAt(USER_ID, LocalDateTime.of(2026, 12, 10, 12, 0));

        assertTrue(onNov25.active());
        assertEquals(LocalDateTime.of(2026, 12, 31, 0, 0), onNov25.endAt());
        assertTrue(onDec10.active());
        assertEquals(LocalDateTime.of(2026, 12, 31, 0, 0), onDec10.endAt());
    }

    @Test
    @DisplayName("#69-S5 빈틈이 있는 기간은 만료일에 이어 붙이지 않는다")
    void gapIsNotChained() {
        User user = user(Role.USER);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        Plan plan = plan(7L);
        Subscription current = period(user, plan, LocalDateTime.of(2026, 11, 1, 0, 0), LocalDateTime.of(2026, 12, 1, 0, 0));
        Subscription afterGap = period(user, plan, LocalDateTime.of(2026, 12, 5, 0, 0), LocalDateTime.of(2027, 1, 4, 0, 0));
        periodsAre(current, afterGap);

        SubscriptionResponse response = service.statusAt(USER_ID, LocalDateTime.of(2026, 11, 25, 12, 0));

        assertTrue(response.active());
        assertEquals(LocalDateTime.of(2026, 12, 1, 0, 0), response.endAt());
    }

    @Test
    @DisplayName("#69-S5 아직 시작 전인 기간뿐이면 구독 중이 아니다")
    void futureOnlyIsNotActive() {
        User user = user(Role.USER);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        periodsAre(period(user, plan(7L), LocalDateTime.of(2026, 12, 1, 0, 0), LocalDateTime.of(2026, 12, 31, 0, 0)));

        assertFalse(service.statusAt(USER_ID, LocalDateTime.of(2026, 11, 25, 12, 0)).active());
    }

    @Test
    @DisplayName("#69-S9 운영자는 구독 대상이 아니라서 eligible=false이고 구독을 읽지 않는다")
    void adminIsNotEligible() {
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user(Role.ADMIN)));

        SubscriptionResponse status = service.getStatus(USER_ID);
        PayableCreditsResponse credits = service.getPayableCredits(USER_ID);

        assertFalse(status.eligible());
        assertNull(status.active());
        assertFalse(credits.eligible());
        assertNull(credits.payableCredits());
        verify(subscriptionRepository, never()).findByUserIdAndStatusAndEndAtAfterOrderByStartAtAsc(any(), any(), any());
        verify(creditWalletRepository, never()).findByUserId(any());
    }

    @Test
    @DisplayName("#69-S8 결제 가능 크레딧은 이벤트 + 적립이고 출금 처리 중은 뺀다")
    void payableCreditsExcludeLocked() {
        User user = user(Role.USER);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        CreditWallet wallet = CreditWallet.builder().user(user).build();
        wallet.grantEvent(3000);
        wallet.grantEarned(7000);
        wallet.lockForCashout(1000);
        when(creditWalletRepository.findByUserId(USER_ID)).thenReturn(Optional.of(wallet));

        PayableCreditsResponse response = service.getPayableCredits(USER_ID);

        assertTrue(response.eligible());
        assertEquals(9000, response.payableCredits());
    }

    @Test
    @DisplayName("#69-S8 지갑이 없으면 0이다")
    void noWalletIsZero() {
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user(Role.USER)));
        when(creditWalletRepository.findByUserId(USER_ID)).thenReturn(Optional.empty());

        assertEquals(0, service.getPayableCredits(USER_ID).payableCredits());
    }

    @Test
    @DisplayName("없는 회원은 404")
    void missingUserIsNotFound() {
        when(userRepository.findById(USER_ID)).thenReturn(Optional.empty());

        BusinessException status = assertThrows(BusinessException.class, () -> service.getStatus(USER_ID));
        BusinessException credits = assertThrows(BusinessException.class, () -> service.getPayableCredits(USER_ID));

        assertEquals(ErrorCode.NOT_FOUND, status.getErrorCode());
        assertEquals(ErrorCode.NOT_FOUND, credits.getErrorCode());
    }
}
