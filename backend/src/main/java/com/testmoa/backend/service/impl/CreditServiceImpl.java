package com.testmoa.backend.service.impl;

import com.testmoa.backend.dto.response.CreditBalanceResponse;
import com.testmoa.backend.dto.response.CreditLedgerResponse;
import com.testmoa.backend.entity.CreditLedger;
import com.testmoa.backend.entity.CreditWallet;
import com.testmoa.backend.repository.CreditLedgerRepository;
import com.testmoa.backend.repository.CreditWalletRepository;
import com.testmoa.backend.repository.RegisterRepository;
import com.testmoa.backend.repository.UserRepository;
import com.testmoa.backend.entity.enums.FeedbackStatus;
import com.testmoa.backend.entity.enums.LedgerFlow;
import com.testmoa.backend.entity.enums.RegisterStatus;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.service.CreditService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class CreditServiceImpl implements CreditService {

    private final UserRepository userRepository;
    private final CreditWalletRepository creditWalletRepository;
    private final CreditLedgerRepository creditLedgerRepository;
    private final RegisterRepository registerRepository;

    public CreditServiceImpl(
            UserRepository userRepository,
            CreditWalletRepository creditWalletRepository,
            CreditLedgerRepository creditLedgerRepository,
            RegisterRepository registerRepository
    ) {
        this.userRepository = userRepository;
        this.creditWalletRepository = creditWalletRepository;
        this.creditLedgerRepository = creditLedgerRepository;
        this.registerRepository = registerRepository;
    }

    /**
     * 잔액 구성과 파생 값.
     * 승인 대기는 CONFIRMED이고 SUBMITTED가 있으며 REPORTED가 없는 참가의
     * Register 스냅샷을 참가당 1회 합산한다.
     */
    @Override
    public CreditBalanceResponse getBalance(Long userId) {
        requireUser(userId);
        int pendingReward = pendingRewardOf(userId);
        return creditWalletRepository.findByUserId(userId)
                .map(wallet -> CreditBalanceResponse.of(userId, wallet, pendingReward))
                .orElseGet(() -> CreditBalanceResponse.empty(userId, pendingReward));
    }

    /**
     * 크레딧 장부. 최신순. flow로 받은/쓴만 가린다.
     */
    @Override
    public List<CreditLedgerResponse> getLedgers(Long userId, LedgerFlow flow) {
        requireUser(userId);
        CreditWallet wallet = creditWalletRepository.findByUserId(userId).orElse(null);
        if (wallet == null) {
            return List.of();
        }
        Long walletId = wallet.getId();
        List<CreditLedger> ledgers = switch (flow) {
            case IN -> creditLedgerRepository
                    .findByCreditWalletIdAndDeltaGreaterThanOrderByCreatedAtDesc(walletId, 0);
            case OUT -> creditLedgerRepository
                    .findByCreditWalletIdAndDeltaLessThanOrderByCreatedAtDesc(walletId, 0);
            case ALL -> creditLedgerRepository.findByCreditWalletIdOrderByCreatedAtDesc(walletId);
        };
        return ledgers.stream().map(CreditLedgerResponse::of).toList();
    }

    private int pendingRewardOf(Long userId) {
        Integer sum = registerRepository.sumPendingRewardByUserId(
                userId,
                RegisterStatus.CONFIRMED,
                FeedbackStatus.SUBMITTED,
                FeedbackStatus.REPORTED
        );
        return sum == null ? 0 : sum;
    }

    private void requireUser(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new BusinessException(ErrorCode.NOT_FOUND);
        }
    }
}
