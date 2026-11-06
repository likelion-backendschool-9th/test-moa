package com.testmoa.backend.entity;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class CreditWalletTest {

    private CreditWallet wallet;

    @BeforeEach
    void setUp() {
        wallet = CreditWallet.builder().user(null).build();
    }

    @Test
    @DisplayName("#45-S1 처음 잔액은 0")
    void 처음에는_잔액이_전부_0이다() {
        assertEquals(0, wallet.cashable());
        assertEquals(0, wallet.payable());
        assertEquals(0, wallet.total());
    }

    @Test
    @DisplayName("#45-S2 지급 후 계산")
    void grantEvent와_grantEarned는_잔액을_올린다() {
        wallet.grantEvent(3000);
        wallet.grantEarned(6000);

        assertEquals(6000, wallet.cashable());
        assertEquals(9000, wallet.payable());
        assertEquals(9000, wallet.total());
    }

    @Test
    @DisplayName("#45-S3 출금 잠금")
    void lockForCashout은_적립에서_잠긴으로_옮긴다() {
        wallet.grantEarned(9480);

        wallet.lockForCashout(5000);

        assertEquals(4480, wallet.getEarnedBalance());
        assertEquals(5000, wallet.getLockedBalance());
        assertEquals(4480, wallet.cashable());
        assertEquals(9480, wallet.total());
    }

    @Test
    @DisplayName("#45-S4 잠금 잔액 부족")
    void lockForCashout은_잔액이_부족하면_거절한다() {
        wallet.grantEarned(1000);

        assertThrows(IllegalArgumentException.class, () -> wallet.lockForCashout(1001));
    }

    @Test
    @DisplayName("#45-S5 지급 시 잠긴 잔액만 줄인다")
    void confirmCashout은_잠긴_잔액만_줄인다() {
        wallet.grantEarned(5000);
        wallet.lockForCashout(5000);

        wallet.confirmCashout(5000);

        assertEquals(0, wallet.getEarnedBalance());
        assertEquals(0, wallet.getLockedBalance());
        assertEquals(0, wallet.total());
    }

    @Test
    @DisplayName("#45-S6 지급 시 잠긴 금액 초과")
    void confirmCashout은_잠긴_금액보다_크면_거절한다() {
        wallet.grantEarned(5000);
        wallet.lockForCashout(5000);

        assertThrows(IllegalStateException.class, () -> wallet.confirmCashout(5001));
    }

    @Test
    @DisplayName("#45-S7 반려 시 잠긴 금액을 적립으로 되돌린다")
    void releaseCashout은_잠긴_금액을_적립으로_되돌린다() {
        wallet.grantEarned(5000);
        wallet.lockForCashout(5000);

        wallet.releaseCashout(5000);

        assertEquals(5000, wallet.getEarnedBalance());
        assertEquals(0, wallet.getLockedBalance());
        assertEquals(5000, wallet.total());
    }

    @Test
    @DisplayName("#45-S8 반려 시 잠긴 금액 초과")
    void releaseCashout은_잠긴_금액보다_크면_거절한다() {
        wallet.grantEarned(5000);
        wallet.lockForCashout(5000);

        assertThrows(IllegalStateException.class, () -> wallet.releaseCashout(5001));
    }

    @Test
    @DisplayName("#45-S9 이벤트 우선 차감")
    void spendForSubscription은_이벤트를_먼저_쓴다() {
        wallet.grantEvent(3000);
        wallet.grantEarned(6000);

        CreditWallet.SpendResult result = wallet.spendForSubscription(9000);

        assertEquals(3000, result.takeEvent());
        assertEquals(6000, result.takeEarned());
        assertEquals(0, wallet.getEventCredit());
        assertEquals(0, wallet.getEarnedBalance());
    }

    @Test
    @DisplayName("#45-S10 한쪽만 쓸 수 있다")
    void spendForSubscription은_한쪽만_쓸_수_있다() {
        wallet.grantEvent(10000);

        CreditWallet.SpendResult result = wallet.spendForSubscription(9000);

        assertEquals(9000, result.takeEvent());
        assertEquals(0, result.takeEarned());
        assertEquals(1000, wallet.getEventCredit());
    }

    @Test
    @DisplayName("#45-S11 결제 가능액 부족")
    void spendForSubscription은_잔액이_부족하면_거절한다() {
        wallet.grantEvent(1000);
        wallet.grantEarned(1000);

        assertThrows(IllegalArgumentException.class, () -> wallet.spendForSubscription(3000));
    }

    @Test
    @DisplayName("#45-S12 금액이 1 미만이면 거절")
    void 금액이_1_미만이면_거절한다() {
        assertThrows(IllegalArgumentException.class, () -> wallet.grantEvent(0));
        assertThrows(IllegalArgumentException.class, () -> wallet.grantEarned(-1));
        assertThrows(IllegalArgumentException.class, () -> wallet.lockForCashout(0));
    }
}
