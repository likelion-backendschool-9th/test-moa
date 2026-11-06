package com.testmoa.backend.service.impl;

import com.testmoa.backend.domain.dto.request.CashoutCreateRequest;
import com.testmoa.backend.domain.dto.response.CashoutResponse;
import com.testmoa.backend.domain.dto.response.CreditBalanceResponse;
import com.testmoa.backend.domain.dto.response.CreditLedgerResponse;
import com.testmoa.backend.domain.entity.CashoutRequest;
import com.testmoa.backend.domain.entity.CreditLedger;
import com.testmoa.backend.domain.entity.CreditWallet;
import com.testmoa.backend.domain.entity.User;
import com.testmoa.backend.domain.repository.CashoutRequestRepository;
import com.testmoa.backend.domain.repository.CreditLedgerRepository;
import com.testmoa.backend.domain.repository.CreditWalletRepository;
import com.testmoa.backend.domain.repository.RegisterRepository;
import com.testmoa.backend.domain.repository.UserRepository;
import com.testmoa.backend.global.common.CashoutBanks;
import com.testmoa.backend.global.common.FeedbackStatus;
import com.testmoa.backend.global.common.LedgerFlow;
import com.testmoa.backend.global.common.RegisterStatus;
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
    private final CashoutRequestRepository cashoutRequestRepository;

    public CreditServiceImpl(
            UserRepository userRepository,
            CreditWalletRepository creditWalletRepository,
            CreditLedgerRepository creditLedgerRepository,
            RegisterRepository registerRepository,
            CashoutRequestRepository cashoutRequestRepository
    ) {
        this.userRepository = userRepository;
        this.creditWalletRepository = creditWalletRepository;
        this.creditLedgerRepository = creditLedgerRepository;
        this.registerRepository = registerRepository;
        this.cashoutRequestRepository = cashoutRequestRepository;
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

    /**
     * 내 출금 내역. 최신순. 계좌는 응답 DTO에서 마스킹한다.
     */
    @Override
    public List<CashoutResponse> getCashouts(Long userId) {
        requireUser(userId);
        return cashoutRequestRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(CashoutResponse::of)
                .toList();
    }

    /**
     * 출금 신청. 지갑을 FOR UPDATE로 잠근 뒤 적립→잠김만 옮기고 장부는 남기지 않는다.
     */
    @Override
    @Transactional
    public CashoutResponse requestCashout(Long userId, CashoutCreateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (request.amount() == null || request.amount() < 1) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "1 크레딧 이상 입력해 주세요");
        }
        if (!CashoutBanks.isAllowed(request.bank())) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "은행을 골라 주세요");
        }

        CreditWallet wallet = creditWalletRepository.findByUserIdForUpdate(userId)
                .orElseThrow(() -> new BusinessException(
                        ErrorCode.INVALID_INPUT,
                        "출금할 수 있는 크레딧이 없어요"
                ));
        int cashable = wallet.cashable();
        if (cashable < 1) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "출금할 수 있는 크레딧이 없어요");
        }
        if (request.amount() > cashable) {
            throw new BusinessException(
                    ErrorCode.INVALID_INPUT,
                    "출금 가능한 크레딧(" + String.format("%,d", cashable) + ")보다 많아요"
            );
        }

        wallet.lockForCashout(request.amount());
        CashoutRequest cashout = CashoutRequest.builder()
                .user(user)
                .amount(request.amount())
                .bank(request.bank())
                .accountNumber(request.accountNumber())
                .accountHolder(request.accountHolder())
                .build();
        return CashoutResponse.of(cashoutRequestRepository.save(cashout));
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
