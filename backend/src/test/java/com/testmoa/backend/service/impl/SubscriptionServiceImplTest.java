package com.testmoa.backend.service.impl;

import com.testmoa.backend.dto.response.CheckoutResponse;
import com.testmoa.backend.dto.response.PayableCreditsResponse;
import com.testmoa.backend.dto.response.SubscriptionResponse;
import com.testmoa.backend.entity.CreditWallet;
import com.testmoa.backend.entity.Plan;
import com.testmoa.backend.entity.Subscription;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.client.pg.PaymentGateways;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.global.security.Role;
import com.testmoa.backend.repository.CreditWalletRepository;
import com.testmoa.backend.repository.PlanRepository;
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
    @Mock
    private PlanRepository planRepository;
    @Mock
    private PaymentGateways paymentGateways;

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

    // ---- #70 구독 결제 화면 조회 ----

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 11, 25, 12, 0);

    private void walletHas(User user, int event, int earned) {
        CreditWallet wallet = CreditWallet.builder().user(user).build();
        if (event > 0) {
            wallet.grantEvent(event);
        }
        if (earned > 0) {
            wallet.grantEarned(earned);
        }
        when(creditWalletRepository.findByUserId(USER_ID)).thenReturn(Optional.of(wallet));
    }

    private Plan sold(long id) {
        Plan plan = plan(id);
        when(planRepository.findCurrentPlans()).thenReturn(List.of(plan));
        return plan;
    }

    @Test
    @DisplayName("#70-S1 구독하지 않은 회원은 지금부터 플랜 기간만큼이 이용 기간이다")
    void checkoutNotSubscribed() {
        User user = user(Role.USER);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        sold(7L);
        periodsAre();
        walletHas(user, 4000, 6000);

        CheckoutResponse response = service.checkoutAt(USER_ID, 7L, NOW);

        assertTrue(response.eligible());
        assertEquals(7L, response.plan().id());
        assertEquals(10000, response.payableCredits());
        assertFalse(response.active());
        assertNull(response.currentEndAt());
        assertEquals(NOW, response.period().startAt());
        assertEquals(NOW.plusDays(30), response.period().endAt());
    }

    @Test
    @DisplayName("#70-S2 크레딧이 모자라면 affordable=false, 모자란 양이 나오고 remainingAfter는 null이다")
    void checkoutShortfall() {
        User user = user(Role.USER);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        sold(7L);
        periodsAre();
        walletHas(user, 4000, 0);

        CheckoutResponse.Credit credit = service.checkoutAt(USER_ID, 7L, NOW).credit();

        assertFalse(credit.affordable());
        assertEquals(5000, credit.shortfall());
        assertNull(credit.remainingAfter());
    }

    @Test
    @DisplayName("#70-S3 크레딧이 넉넉하면 남는 크레딧이 나오고 정확히 같으면 0이다. 지갑이 없으면 payable은 0이다")
    void checkoutRemainingAfter() {
        User user = user(Role.USER);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        sold(7L);
        periodsAre();
        walletHas(user, 10000, 0);
        CheckoutResponse.Credit enough = service.checkoutAt(USER_ID, 7L, NOW).credit();
        walletHas(user, 9000, 0);
        CheckoutResponse.Credit exact = service.checkoutAt(USER_ID, 7L, NOW).credit();
        when(creditWalletRepository.findByUserId(USER_ID)).thenReturn(Optional.empty());
        CheckoutResponse none = service.checkoutAt(USER_ID, 7L, NOW);

        assertTrue(enough.affordable());
        assertEquals(0, enough.shortfall());
        assertEquals(1000, enough.remainingAfter());
        assertTrue(exact.affordable());
        assertEquals(0, exact.remainingAfter());
        assertEquals(0, none.payableCredits());
        assertFalse(none.credit().affordable());
        assertEquals(9000, none.credit().shortfall());
    }

    @Test
    @DisplayName("#70-S4 구독 중이면 만료일부터 이어 붙고, 미리 결제한 기간이 있으면 그 끝부터다")
    void checkoutExtendsFromEnd() {
        User user = user(Role.USER);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        Plan plan = sold(7L);
        walletHas(user, 0, 0);
        LocalDateTime dec1 = LocalDateTime.of(2026, 12, 1, 0, 0);
        LocalDateTime dec31 = LocalDateTime.of(2026, 12, 31, 0, 0);

        periodsAre(period(user, plan, LocalDateTime.of(2026, 11, 1, 0, 0), dec1));
        CheckoutResponse one = service.checkoutAt(USER_ID, 7L, NOW);
        periodsAre(period(user, plan, LocalDateTime.of(2026, 11, 1, 0, 0), dec1), period(user, plan, dec1, dec31));
        CheckoutResponse two = service.checkoutAt(USER_ID, 7L, NOW);

        assertTrue(one.active());
        assertEquals(dec1, one.currentEndAt());
        assertEquals(dec1, one.period().startAt());
        assertEquals(dec1.plusDays(30), one.period().endAt());
        assertEquals(dec31, two.currentEndAt());
        assertEquals(dec31, two.period().startAt());
    }

    @Test
    @DisplayName("#70-S5 끝났거나 취소된 구독은 조회에서 빠져 지금부터 시작한다. 취소된 뒤 기간은 이어 붙지 않는다")
    void checkoutIgnoresFinishedAndCancelled() {
        User user = user(Role.USER);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        Plan plan = sold(7L);
        walletHas(user, 0, 0);

        // 끝난 행·취소된 행은 조회(ACTIVE이고 end_at이 지금 뒤)에서 들어오지 않는다
        periodsAre();
        CheckoutResponse none = service.checkoutAt(USER_ID, 7L, NOW);
        // 11/1~12/1 ACTIVE만 남고 12/1~12/31 CANCELLED는 조회에서 빠진다
        periodsAre(period(user, plan, LocalDateTime.of(2026, 11, 1, 0, 0), LocalDateTime.of(2026, 12, 1, 0, 0)));
        CheckoutResponse cancelledAfter = service.checkoutAt(USER_ID, 7L, NOW);

        assertFalse(none.active());
        assertNull(none.currentEndAt());
        assertEquals(NOW, none.period().startAt());
        assertEquals(LocalDateTime.of(2026, 12, 1, 0, 0), cancelledAfter.period().startAt());
    }

    @Test
    @DisplayName("#70-S5 지금 기간이 환불로 취소되고 시작 전 ACTIVE만 남으면 active=false이지만 시작은 그 행의 끝이다")
    void checkoutOnlyFutureActivePeriod() {
        User user = user(Role.USER);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        Plan plan = sold(7L);
        walletHas(user, 0, 0);
        LocalDateTime dec31 = LocalDateTime.of(2026, 12, 31, 0, 0);
        periodsAre(period(user, plan, LocalDateTime.of(2026, 12, 1, 0, 0), dec31));

        CheckoutResponse response = service.checkoutAt(USER_ID, 7L, NOW);

        assertFalse(response.active());
        assertNull(response.currentEndAt());
        assertEquals(dec31, response.period().startAt());
        assertEquals(dec31.plusDays(30), response.period().endAt());
    }

    @Test
    @DisplayName("#70-S5 빈틈 뒤에 따로 떨어진 행이 있으면 currentEndAt은 지금 기간의 끝이고 period.startAt은 가장 늦은 끝이다")
    void checkoutGapBetweenPeriods() {
        User user = user(Role.USER);
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        Plan plan = sold(7L);
        walletHas(user, 0, 0);
        LocalDateTime dec1 = LocalDateTime.of(2026, 12, 1, 0, 0);
        LocalDateTime jan4 = LocalDateTime.of(2027, 1, 4, 0, 0);
        periodsAre(
                period(user, plan, LocalDateTime.of(2026, 11, 1, 0, 0), dec1),
                period(user, plan, LocalDateTime.of(2026, 12, 5, 0, 0), jan4));

        CheckoutResponse response = service.checkoutAt(USER_ID, 7L, NOW);

        assertTrue(response.active());
        assertEquals(dec1, response.currentEndAt());
        assertEquals(jan4, response.period().startAt());
    }

    @Test
    @DisplayName("#70-S6 운영자는 eligible=false이고 플랜을 찾지 않는다")
    void checkoutAdmin() {
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user(Role.ADMIN)));

        CheckoutResponse response = service.checkoutAt(USER_ID, 7L, NOW);

        assertFalse(response.eligible());
        assertNull(response.plan());
        assertNull(response.credit());
        assertNull(response.period());
        verify(planRepository, never()).findCurrentPlans();
    }

    @Test
    @DisplayName("#70-S7 지금 파는 플랜이 아니면(없는 id, 옛 version) 404")
    void checkoutPlanNotForSale() {
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user(Role.USER)));
        sold(7L);

        BusinessException e = assertThrows(BusinessException.class, () -> service.checkoutAt(USER_ID, 99L, NOW));

        assertEquals(ErrorCode.NOT_FOUND, e.getErrorCode());
    }
}
