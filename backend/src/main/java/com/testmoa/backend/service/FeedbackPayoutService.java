package com.testmoa.backend.service;

import com.testmoa.backend.entity.CreditLedger;
import com.testmoa.backend.entity.CreditWallet;
import com.testmoa.backend.entity.Feedback;
import com.testmoa.backend.entity.Register;
import com.testmoa.backend.entity.enums.FeedbackStatus;
import com.testmoa.backend.entity.enums.RegisterStatus;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.repository.CreditLedgerRepository;
import com.testmoa.backend.repository.CreditWalletRepository;
import com.testmoa.backend.repository.FeedbackRepository;
import com.testmoa.backend.repository.RegisterRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Limit;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 피드백 보상 자동 지급(#288). 제출한 지 72시간 동안 신고가 없으면 참가 단위로 보상을 지급한다.
 * 한 번 돌 때 참가마다 따로 짧은 트랜잭션을 써서, 한 건이 실패해도 다른 참가는 지급된다
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FeedbackPayoutService {
    /** 제출 뒤 이 시간 동안 신고가 없으면 지급한다. 신고 기한(FeedbackServiceImpl.REPORT_WINDOW)과 같다 */
    public static final Duration PAYOUT_WAIT = Duration.ofHours(72);

    /** 크레딧 내역에 남기는 원인 */
    static final String DESCRIPTION_PREFIX = "피드백 보상 · ";

    // 한 번 돌 때 읽는 참가 수. 남은 참가는 다음 실행이 지급한다
    private static final int BATCH = 200;

    private final RegisterRepository registerRepository;
    private final FeedbackRepository feedbackRepository;
    private final CreditWalletRepository creditWalletRepository;
    private final CreditLedgerRepository creditLedgerRepository;
    private final TransactionTemplate transactionTemplate;

    /** 기본 10분마다 지급할 참가를 찾아 지급한다. 지급 대기 안내(제출 + 72시간)보다 최대 한 주기 늦을 수 있다 */
    @Scheduled(cron = "${feedback.payout-cron:0 */10 * * * *}")
    public void payDue() {
        int paid = payDue(LocalDateTime.now());
        if (paid > 0) log.info("피드백 보상 {}건 지급", paid);
    }

    /**
     * now 기준으로 지급할 참가를 지급하고 지급한 수를 돌려준다. 같은 참가는 한 번만 지급한다
     */
    public int payDue(LocalDateTime now) {
        int paid = 0;
        for (Long registerId : registerRepository.findPayableIds(now.minus(PAYOUT_WAIT), Limit.of(BATCH))) {
            try {
                if (Boolean.TRUE.equals(transactionTemplate.execute(status -> payOne(registerId, now)))) paid++;
            } catch (RuntimeException e) {
                log.error("피드백 보상 지급 실패 registerId={}", registerId, e);
            }
        }
        return paid;
    }

    /*
     * 참가 행을 잠근 뒤 조건을 다시 본다. 같은 참가를 동시에 지급하려 해도 두 번째는 이미 지급된 피드백을 보고 건너뛴다.
     * 피드백 신고도 같은 참가 행을 잠가(FeedbackServiceImpl.report) 72시간 경계에서 신고와 지급이 겹치지 않는다
     */
    private boolean payOne(Long registerId, LocalDateTime now) {
        Register register = registerRepository.findLockedById(registerId).orElse(null);
        if (register == null || register.getStatus() != RegisterStatus.CONFIRMED
                || register.getBaseRewardSnapshot() == null || register.getExtraRewardSnapshot() == null) {
            return false;
        }
        List<Feedback> feedbacks = feedbackRepository.findByRegisterId(registerId);
        boolean blocked = feedbacks.stream().anyMatch(feedback ->
                feedback.getStatus() == FeedbackStatus.REPORTED || feedback.getStatus() == FeedbackStatus.EXCLUDED);
        List<Feedback> submitted = feedbacks.stream().filter(feedback -> feedback.getStatus() == FeedbackStatus.SUBMITTED).toList();
        boolean due = feedbacks.stream().map(Feedback::getSubmittedAt).min(LocalDateTime::compareTo)
                .map(first -> !first.plus(PAYOUT_WAIT).isAfter(now)).orElse(false);
        if (blocked || submitted.isEmpty() || !due) return false;

        submitted.forEach(Feedback::reward);
        int amount = register.getBaseRewardSnapshot() + register.getExtraRewardSnapshot();
        if (amount > 0) {
            Long userId = register.getUser().getId();
            creditWalletRepository.insertIfAbsent(userId, now);
            CreditWallet wallet = creditWalletRepository.findLockedByUserId(userId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
            wallet.grantEarned(amount);
            creditLedgerRepository.save(CreditLedger.builder()
                    .creditWallet(wallet)
                    .delta(amount)
                    .description(DESCRIPTION_PREFIX + register.getRecruitment().getTitle())
                    .type(CreditLedger.Type.EARNED)
                    .build());
        }
        return true;
    }
}
