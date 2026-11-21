package com.testmoa.backend.service.admin.impl;

import com.testmoa.backend.dto.response.AdminPaymentRefundResponse;
import com.testmoa.backend.entity.Payment;
import com.testmoa.backend.entity.enums.PaymentProvider;
import com.testmoa.backend.global.client.pg.PaymentGateway;
import com.testmoa.backend.global.client.pg.PaymentGateways;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.repository.PaymentRepository;
import com.testmoa.backend.repository.UserRepository;
import com.testmoa.backend.service.admin.AdminPaymentRefundService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 운영자 결제 환불(#275). 승인과 같이 세 토막으로 나눈다.
 * ① 회원 행을 잠그고 결제를 REFUNDING으로 바꾼 뒤 커밋 ② 잠금 밖에서 PG 취소
 * ③ 회원 행을 다시 잠그고 결제를 REFUNDED로, 그 구독을 CANCELLED로 바꿈.
 * PG가 취소를 거절하면 결제를 REFUND_FAILED로 되돌리고 502를 준다. PG가 취소했는데 ③이 실패하면 REFUNDING으로 남기고 오류 로그를 남긴다.
 */
@Slf4j
@Service
public class AdminPaymentRefundServiceImpl implements AdminPaymentRefundService {

    private static final String REASON = "운영자 환불";

    private final UserRepository userRepository;
    private final PaymentRepository paymentRepository;
    private final PaymentGateways gateways;
    private final TransactionTemplate transaction;

    public AdminPaymentRefundServiceImpl(
            UserRepository userRepository,
            PaymentRepository paymentRepository,
            PaymentGateways gateways,
            PlatformTransactionManager transactionManager
    ) {
        this.userRepository = userRepository;
        this.paymentRepository = paymentRepository;
        this.gateways = gateways;
        this.transaction = new TransactionTemplate(transactionManager);
    }

    @Override
    public AdminPaymentRefundResponse refund(Long adminId, Long paymentId) {
        Long userId = transaction.execute(status -> paymentRepository.findUserIdByPaymentId(paymentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND)));

        // ① 검증하고 REFUNDING으로 바꾼다
        Refunding refunding = transaction.execute(status -> {
            userRepository.findByIdForUpdate(userId).orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
            Payment payment = paymentRepository.findById(paymentId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
            if (!payment.isPgPayment()) {
                throw new BusinessException(ErrorCode.INVALID_INPUT, "카카오페이·토스페이로 결제한 건만 환불할 수 있어요");
            }
            if (!payment.isRefundable()) {
                throw new BusinessException(ErrorCode.PAYMENT_NOT_REFUNDABLE);
            }
            payment.startRefund();
            return new Refunding(payment.getProvider(), payment.getAmount(), payment.getPgTransactionId(),
                    payment.getSubscription().getId());
        });

        // ② 잠금 밖에서 PG 취소
        try {
            gateways.get(refunding.provider()).cancel(new PaymentGateway.CancelCommand(
                    "refund-" + paymentId + "-" + UUID.randomUUID(), refunding.amount(), refunding.pgTransactionId(), REASON));
        } catch (BusinessException e) {
            transaction.executeWithoutResult(status -> paymentRepository.findById(paymentId)
                    .ifPresent(Payment::failRefund));
            throw e;
        }

        // ③ 결제와 구독을 되돌린다
        try {
            return transaction.execute(status -> {
                userRepository.findByIdForUpdate(userId).orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
                Payment payment = paymentRepository.findById(paymentId)
                        .orElseThrow(() -> new BusinessException(ErrorCode.INTERNAL_ERROR));
                payment.refund(adminId);
                payment.getSubscription().cancel();
                return new AdminPaymentRefundResponse(paymentId, payment.getStatus(), LocalDateTime.now());
            });
        } catch (RuntimeException e) {
            log.error("PG가 취소한 환불을 저장하지 못함 paymentId={} provider={} pgTransactionId={}",
                    paymentId, refunding.provider(), refunding.pgTransactionId(), e);
            throw e;
        }
    }

    private record Refunding(PaymentProvider provider, int amount,
                             String pgTransactionId, Long subscriptionId) {
    }
}
