package com.testmoa.backend.service.my.impl;

import com.testmoa.backend.dto.request.PaymentRequest;
import com.testmoa.backend.dto.response.PaymentHistoryResponse;
import com.testmoa.backend.dto.response.PaymentResponse;
import com.testmoa.backend.entity.CreditLedger;
import com.testmoa.backend.entity.CreditWallet;
import com.testmoa.backend.entity.Payment;
import com.testmoa.backend.entity.Plan;
import com.testmoa.backend.entity.Subscription;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.global.security.Role;
import com.testmoa.backend.repository.CreditLedgerRepository;
import com.testmoa.backend.repository.CreditWalletRepository;
import com.testmoa.backend.repository.PaymentRepository;
import com.testmoa.backend.repository.PlanRepository;
import com.testmoa.backend.repository.SubscriptionRepository;
import com.testmoa.backend.repository.UserRepository;
import com.testmoa.backend.service.my.PaymentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 구독 결제 실행과 결제 이력. 결제는 한 트랜잭션에서 지갑 행을 먼저 잠가 같은 회원의 결제를 한 줄로 처리한다.
 * 실제 PG 결제는 하지 않고 현금도 완료 기록만 남긴다.
 */
@Service
@Transactional(readOnly = true)
public class PaymentServiceImpl implements PaymentService {

    /** 직전 결제 후 이 시간 안의 결제는 더블클릭으로 보고 거절한다 */
    static final Duration DUPLICATE_WINDOW = Duration.ofSeconds(5);

    private final UserRepository userRepository;
    private final PlanRepository planRepository;
    private final CreditWalletRepository creditWalletRepository;
    private final CreditLedgerRepository creditLedgerRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final PaymentRepository paymentRepository;
    private final Clock clock;

    @Autowired
    public PaymentServiceImpl(
            UserRepository userRepository,
            PlanRepository planRepository,
            CreditWalletRepository creditWalletRepository,
            CreditLedgerRepository creditLedgerRepository,
            SubscriptionRepository subscriptionRepository,
            PaymentRepository paymentRepository
    ) {
        this(userRepository, planRepository, creditWalletRepository, creditLedgerRepository,
                subscriptionRepository, paymentRepository, Clock.systemDefaultZone());
    }

    /**
     * 시계를 바꿔 끼우는 테스트용. 더블클릭 시간({@link #DUPLICATE_WINDOW})을 지난 두 요청이 겹쳐 들어오는 경우를
     * 확인하려면 호출마다 시간이 흐르는 시계가 필요한데, 실제 시계로는 그 상황을 만들 수 없다.
     */
    PaymentServiceImpl(
            UserRepository userRepository,
            PlanRepository planRepository,
            CreditWalletRepository creditWalletRepository,
            CreditLedgerRepository creditLedgerRepository,
            SubscriptionRepository subscriptionRepository,
            PaymentRepository paymentRepository,
            Clock clock
    ) {
        this.userRepository = userRepository;
        this.planRepository = planRepository;
        this.creditWalletRepository = creditWalletRepository;
        this.creditLedgerRepository = creditLedgerRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.paymentRepository = paymentRepository;
        this.clock = clock;
    }

    @Override
    @Transactional
    public PaymentResponse pay(Long userId, PaymentRequest request) {
        User user = requireUser(userId);
        if (user.getRole() == Role.ADMIN) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        Plan plan = planRepository.findCurrentPlans().stream()
                .filter(current -> current.getId().equals(request.planId()))
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));

        // 지갑을 없으면 만들고 잠근다. 이후의 읽기는 모두 잠금 안에서 한다
        creditWalletRepository.insertIfAbsent(userId, LocalDateTime.now(clock));
        CreditWallet wallet = creditWalletRepository.findByUserIdForUpdate(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.INTERNAL_ERROR));
        // 기준 시각은 잠근 뒤에 읽는다. 늦게 잠근 요청의 시각이 먼저 처리된 결제보다 이르면 더블클릭 검사가 틀린다
        LocalDateTime now = LocalDateTime.now(clock);

        boolean duplicated = paymentRepository.findFirstBySubscriptionUserIdOrderByPaidAtDescIdDesc(userId)
                .map(last -> last.getPaidAt().isAfter(now.minus(DUPLICATE_WINDOW)))
                .orElse(false);
        if (duplicated) {
            throw new BusinessException(ErrorCode.DUPLICATE_PAYMENT);
        }

        boolean byCredit = request.method() == Payment.Method.CREDIT;
        int amount = byCredit ? plan.getCreditPrice() : plan.getCashPrice();
        if (byCredit && wallet.payable() < amount) {
            throw new BusinessException(ErrorCode.INSUFFICIENT_CREDIT);
        }

        LocalDateTime startAt = subscriptionRepository
                .findByUserIdAndStatusAndEndAtAfterOrderByStartAtAsc(userId, Subscription.Status.ACTIVE, now)
                .stream()
                .map(Subscription::getEndAt)
                .max(LocalDateTime::compareTo)
                .orElse(now);
        Subscription subscription = subscriptionRepository.save(Subscription.builder()
                .user(user).plan(plan).startAt(startAt).endAt(startAt.plusDays(plan.getPeriodDays())).build());
        Payment payment = paymentRepository.save(Payment.builder()
                .subscription(subscription).method(request.method()).amount(amount).paidAt(now).build());

        if (byCredit && amount > 0) {
            spendCredit(wallet, amount);
        }
        return PaymentResponse.of(payment, wallet.payable());
    }

    /** 이벤트를 먼저 쓰고 모자란 만큼 적립에서 뺀다. 내역은 쓴 쪽만 한 줄씩 남긴다 */
    private void spendCredit(CreditWallet wallet, int amount) {
        CreditWallet.SpendResult spent = wallet.spendForSubscription(amount);
        if (spent.takeEvent() > 0) {
            creditLedgerRepository.save(CreditLedger.builder()
                    .creditWallet(wallet).delta(-spent.takeEvent())
                    .description("구독 결제(이벤트 크레딧)").type(CreditLedger.Type.EVENT).build());
        }
        if (spent.takeEarned() > 0) {
            creditLedgerRepository.save(CreditLedger.builder()
                    .creditWallet(wallet).delta(-spent.takeEarned())
                    .description("구독 결제(적립 크레딧)").type(CreditLedger.Type.EARNED).build());
        }
    }

    @Override
    public List<PaymentHistoryResponse> getPayments(Long userId) {
        User user = requireUser(userId);
        if (user.getRole() == Role.ADMIN) {
            return List.of();
        }
        return paymentRepository.findBySubscriptionUserIdOrderByPaidAtDescIdDesc(userId).stream()
                .map(PaymentHistoryResponse::of)
                .toList();
    }

    private User requireUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }
}
