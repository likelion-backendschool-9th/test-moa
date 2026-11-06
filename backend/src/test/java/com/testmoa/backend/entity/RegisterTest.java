package com.testmoa.backend.entity;

import com.testmoa.backend.entity.enums.RegisterStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class RegisterTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 11, 5, 10, 0);

    private Register applied() {
        return Register.builder().build();
    }

    private Register confirmed() {
        Register register = applied();
        register.confirm(1000, 300, NOW);
        return register;
    }

    private Register rejected() {
        Register register = applied();
        register.reject();
        return register;
    }

    private Register cancelled() {
        Register register = applied();
        register.cancel();
        return register;
    }

    @Test
    @DisplayName("#89-S11 지원")
    void 만들_때_상태는_APPLIED다() {
        Register register = applied();

        assertEquals(RegisterStatus.APPLIED, register.getStatus());
        assertNull(register.getConfirmedAt());
        assertNull(register.getBaseRewardSnapshot());
        assertNull(register.getExtraRewardSnapshot());
    }

    @Test
    @DisplayName("#89-S12 확정하면 보상액이 고정된다")
    void confirm은_보상액을_고정한다() {
        Register register = applied();

        register.confirm(1000, 300, NOW);

        assertEquals(RegisterStatus.CONFIRMED, register.getStatus());
        assertEquals(NOW, register.getConfirmedAt());
        assertEquals(1000, register.getBaseRewardSnapshot());
        assertEquals(300, register.getExtraRewardSnapshot());
    }

    @Test
    @DisplayName("#89-S13 보상액이 없거나 음수면 확정할 수 없음")
    void confirm은_잘못된_보상액을_거절한다() {
        Register register = applied();

        assertThrows(IllegalArgumentException.class, () -> register.confirm(null, 300, NOW));
        assertThrows(IllegalArgumentException.class, () -> register.confirm(1000, null, NOW));
        assertThrows(IllegalArgumentException.class, () -> register.confirm(-1, 300, NOW));
        assertThrows(IllegalArgumentException.class, () -> register.confirm(1000, -1, NOW));

        assertEquals(RegisterStatus.APPLIED, register.getStatus());
        assertNull(register.getBaseRewardSnapshot());
    }

    @Test
    @DisplayName("#89-S14 대기 중이 아니면 확정할 수 없음")
    void confirm은_지원_상태가_아니면_거절한다() {
        Register alreadyConfirmed = confirmed();
        assertThrows(IllegalStateException.class, () -> alreadyConfirmed.confirm(5000, 500, NOW.plusDays(1)));
        assertEquals(1000, alreadyConfirmed.getBaseRewardSnapshot());
        assertEquals(300, alreadyConfirmed.getExtraRewardSnapshot());
        assertEquals(NOW, alreadyConfirmed.getConfirmedAt());

        for (Register register : List.of(rejected(), cancelled())) {
            RegisterStatus before = register.getStatus();
            assertThrows(IllegalStateException.class, () -> register.confirm(1000, 300, NOW));
            assertEquals(before, register.getStatus());
            assertNull(register.getBaseRewardSnapshot());
        }
    }

    @Test
    @DisplayName("#89-S15 거절")
    void reject는_지원_상태에서만_된다() {
        assertEquals(RegisterStatus.REJECTED, rejected().getStatus());

        for (Register register : List.of(confirmed(), rejected(), cancelled())) {
            RegisterStatus before = register.getStatus();
            assertThrows(IllegalStateException.class, register::reject);
            assertEquals(before, register.getStatus());
        }
    }

    @Test
    @DisplayName("#89-S16 지원과 확정은 취소할 수 있음")
    void cancel은_지원과_확정에서_된다() {
        for (Register register : List.of(applied(), confirmed())) {
            register.cancel();
            assertEquals(RegisterStatus.CANCELLED, register.getStatus());
        }
    }

    @Test
    @DisplayName("#89-S17 거절과 취소는 다시 취소할 수 없음")
    void cancel은_거절과_취소에서_거절한다() {
        for (Register register : List.of(rejected(), cancelled())) {
            RegisterStatus before = register.getStatus();
            assertThrows(IllegalStateException.class, register::cancel);
            assertEquals(before, register.getStatus());
        }
    }
}
