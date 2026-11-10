package com.testmoa.backend.service.my.impl;

import com.testmoa.backend.dto.request.PgApproveRequest;
import com.testmoa.backend.dto.request.PgReadyRequest;
import com.testmoa.backend.dto.response.PaymentResponse;
import com.testmoa.backend.dto.response.PgReadyResponse;
import com.testmoa.backend.entity.PaymentAttempt;
import com.testmoa.backend.entity.Plan;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.PaymentProvider;
import com.testmoa.backend.global.client.pg.PaymentGateway;
import com.testmoa.backend.global.client.pg.PaymentGateways;
import com.testmoa.backend.global.client.pg.PaymentProperties;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.global.security.Role;
import com.testmoa.backend.repository.PaymentAttemptRepository;
import com.testmoa.backend.repository.PaymentRepository;
import com.testmoa.backend.repository.PlanRepository;
import com.testmoa.backend.repository.UserRepository;
import com.testmoa.backend.service.my.PaymentService;
import com.testmoa.backend.service.my.PgPaymentService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 현금 결제 준비와 승인. 승인은 세 토막으로 나눈다.
 * ① 회원 행을 잠그고 시도를 검증해 APPROVING으로 바꾼 뒤 커밋 ② 잠금 밖에서 PG 승인 호출
 * ③ 회원 행 → 지갑 행 순서로 다시 잠그고 결제·구독을 저장하며 APPROVED로 바꿈.
 * PG를 부르는 동안 회원 행을 잡고 있지 않고, APPROVING으로 바뀐 시도는 다른 요청이 다시 승인하지 못한다.
 * PG가 승인했는데 ③이 실패하면 시도는 APPROVING으로 남고 오류 로그를 남긴다(자동 취소는 하지 않는다).
 */
@Slf4j
@Service
public class PgPaymentServiceImpl implements PgPaymentService {

    /** 직전 결제 후 이 시간 안의 준비는 더블클릭으로 보고 거절한다(크레딧 결제와 같은 기준) */
    static final Duration DUPLICATE_WINDOW = PaymentServiceImpl.DUPLICATE_WINDOW;

    private final UserRepository userRepository;
    private final PlanRepository planRepository;
    private final PaymentRepository paymentRepository;
    private final PaymentAttemptRepository paymentAttemptRepository;
    private final PaymentService paymentService;
    private final PaymentGateways gateways;
    private final PaymentProperties properties;
    private final TransactionTemplate transaction;
    private final Clock clock = Clock.systemDefaultZone();

    public PgPaymentServiceImpl(
            UserRepository userRepository,
            PlanRepository planRepository,
            PaymentRepository paymentRepository,
            PaymentAttemptRepository paymentAttemptRepository,
            PaymentService paymentService,
            PaymentGateways gateways,
            PaymentProperties properties,
            PlatformTransactionManager transactionManager
    ) {
        this.userRepository = userRepository;
        this.planRepository = planRepository;
        this.paymentRepository = paymentRepository;
        this.paymentAttemptRepository = paymentAttemptRepository;
        this.paymentService = paymentService;
        this.gateways = gateways;
        this.properties = properties;
        this.transaction = new TransactionTemplate(transactionManager);
    }

    @Override
    public PgReadyResponse ready(Long userId, PgReadyRequest request) {
        PaymentGateway gateway = gateways.get(request.provider());
        PgReadyResponse response = transaction.execute(status -> {
            User user = userRepository.findById(userId).orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
            if (user.getRole() == Role.ADMIN) {
                throw new BusinessException(ErrorCode.FORBIDDEN, "운영자 계정은 구독 대상이 아니에요");
            }
            Plan plan = planRepository.findCurrentPlans().stream()
                    .filter(current -> current.getId().equals(request.planId()))
                    .findFirst()
                    .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
            // 돌아올 주소가 비어 있으면 PG가 주소를 거절하므로 쓸 수 없는 것으로 본다
            String base = properties.returnBaseUrl();
            if (!gateway.available() || base == null || base.isBlank()) {
                throw new BusinessException(ErrorCode.PG_UNAVAILABLE);
            }
            LocalDateTime now = LocalDateTime.now(clock);
            boolean duplicated = paymentRepository.findFirstBySubscriptionUserIdOrderByPaidAtDescIdDesc(userId)
                    .map(last -> last.getPaidAt().isAfter(now.minus(DUPLICATE_WINDOW)))
                    .orElse(false);
            if (duplicated) {
                throw new BusinessException(ErrorCode.DUPLICATE_PAYMENT);
            }

            String orderId = "MOA" + UUID.randomUUID().toString().replace("-", "");
            int amount = plan.getCashPrice();
            PaymentGateway.Ready ready = gateway.ready(new PaymentGateway.ReadyCommand(
                    orderId, userId, plan.getTier(), amount,
                    base + "/my/subscription/checkout/result?orderId=" + orderId,
                    base + "/my/subscription/checkout?pg=cancel",
                    base + "/my/subscription/checkout?pg=fail"));
            paymentAttemptRepository.save(PaymentAttempt.builder()
                    .user(user).plan(plan).provider(request.provider()).orderId(orderId).amount(amount)
                    .pgTransactionId(ready.pgTransactionId()).build());

            boolean toss = request.provider() == PaymentProvider.TOSS_PAY;
            return new PgReadyResponse(
                    orderId, request.provider(), amount, plan.getTier(),
                    ready.redirectUrl(), ready.mobileRedirectUrl(), ready.clientKey(), ready.customerKey(),
                    toss ? base + "/my/subscription/checkout/result" : null,
                    toss ? base + "/my/subscription/checkout?pg=fail" : null);
        });
        return response;
    }

    @Override
    public PaymentResponse approve(Long userId, PgApproveRequest request) {
        // ① 검증하고 APPROVING으로 바꾼다
        Approving approving = transaction.execute(status -> {
            // 같은 회원의 결제·구독 작업과 한 줄로 처리하려고 회원 행을 먼저 잠근다
            userRepository.findByIdForUpdate(userId).orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
            PaymentAttempt attempt = paymentAttemptRepository.findByOrderId(request.orderId())
                    .filter(found -> found.getUser().getId().equals(userId))
                    .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
            requireTokens(attempt.getProvider(), request);
            attempt.requireApprovable(LocalDateTime.now(clock));
            // 토스가 돌려준 금액은 서버가 정한 금액과 같은지만 본다. 승인에는 서버 값을 쓴다
            if (attempt.getProvider() == PaymentProvider.TOSS_PAY && !attempt.getAmount().equals(request.amount())) {
                throw new BusinessException(ErrorCode.PAYMENT_NOT_APPROVABLE);
            }
            attempt.startApproving();
            return new Approving(attempt.getId(), attempt.getProvider(), attempt.getAmount(), attempt.getPgTransactionId());
        });

        // ② 잠금 밖에서 PG 승인
        PaymentGateway.Approved approved;
        try {
            approved = gateways.get(approving.provider()).approve(new PaymentGateway.ApproveCommand(
                    request.orderId(), userId, approving.amount(), approving.pgTransactionId(), request.pgToken(), request.paymentKey()));
        } catch (BusinessException e) {
            transaction.executeWithoutResult(status -> paymentAttemptRepository.findById(approving.attemptId())
                    .ifPresent(PaymentAttempt::fail));
            throw e;
        }

        // ③ 결제·구독을 저장하고 APPROVED로 바꾼다. 실패하면 시도는 APPROVING으로 남는다
        try {
            return transaction.execute(status -> {
                PaymentAttempt attempt = paymentAttemptRepository.findById(approving.attemptId())
                        .orElseThrow(() -> new BusinessException(ErrorCode.INTERNAL_ERROR));
                PaymentResponse response = paymentService.completePgPayment(
                        userId, attempt.getPlan(), attempt.getProvider(), approved.pgTransactionId(), attempt.getAmount());
                attempt.approve(approved.pgTransactionId());
                return response;
            });
        } catch (RuntimeException e) {
            log.error("PG가 승인한 결제를 저장하지 못함 attemptId={} provider={} orderId={}",
                    approving.attemptId(), approving.provider(), request.orderId(), e);
            throw e;
        }
    }

    /** 카카오페이는 pgToken, 토스는 paymentKey와 amount가 있어야 승인할 수 있다 */
    private static void requireTokens(PaymentProvider provider, PgApproveRequest request) {
        boolean ok = switch (provider) {
            case KAKAO_PAY -> notBlank(request.pgToken());
            case TOSS_PAY -> notBlank(request.paymentKey()) && request.amount() != null;
        };
        if (!ok) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
    }

    private static boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }

    private record Approving(Long attemptId, PaymentProvider provider, int amount, String pgTransactionId) {
    }
}
