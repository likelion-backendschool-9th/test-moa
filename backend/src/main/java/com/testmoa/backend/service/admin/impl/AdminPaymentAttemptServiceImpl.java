package com.testmoa.backend.service.admin.impl;

import com.testmoa.backend.dto.response.AdminPaymentAttemptResponse;
import com.testmoa.backend.repository.PaymentAttemptRepository;
import com.testmoa.backend.service.admin.AdminPaymentAttemptService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class AdminPaymentAttemptServiceImpl implements AdminPaymentAttemptService {

    private final PaymentAttemptRepository paymentAttemptRepository;
    private final Duration stuckAfter;
    private final Clock clock = Clock.systemDefaultZone();

    /** @param stuckMinutes 승인 중으로 이만큼 지나면 멈춘 것으로 본다(payment.stuck-minutes, 시도 유효 시간 10분보다 길게) */
    public AdminPaymentAttemptServiceImpl(
            PaymentAttemptRepository paymentAttemptRepository,
            @Value("${payment.stuck-minutes:15}") long stuckMinutes
    ) {
        this.paymentAttemptRepository = paymentAttemptRepository;
        this.stuckAfter = Duration.ofMinutes(stuckMinutes);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AdminPaymentAttemptResponse> findStuck() {
        LocalDateTime threshold = LocalDateTime.now(clock).minus(stuckAfter);
        return paymentAttemptRepository.findStuck(threshold).stream()
                .map(AdminPaymentAttemptResponse::of)
                .toList();
    }
}
