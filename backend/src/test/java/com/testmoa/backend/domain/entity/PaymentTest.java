package com.testmoa.backend.domain.entity;

import com.testmoa.backend.global.common.PaymentMethod;
import com.testmoa.backend.global.common.PaymentStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

class PaymentTest {

    @Test
    @DisplayName("#45-S26 결제는 COMPLETED로 시작")
    void 만들_때_상태는_COMPLETED다() {
        Payment payment = Payment.builder()
                .subscription(null)
                .method(PaymentMethod.CREDIT)
                .amount(9000)
                .paidAt(LocalDateTime.of(2026, 11, 1, 10, 0))
                .build();

        assertEquals(PaymentStatus.COMPLETED, payment.getStatus());
    }
}
