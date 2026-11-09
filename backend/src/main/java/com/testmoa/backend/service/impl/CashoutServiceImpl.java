package com.testmoa.backend.service.impl;

import com.testmoa.backend.dto.request.CashoutCreateRequest;
import com.testmoa.backend.dto.response.CashoutResponse;
import com.testmoa.backend.entity.Cashout;
import com.testmoa.backend.entity.CreditWallet;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.global.util.Masking;
import com.testmoa.backend.repository.CashoutRepository;
import com.testmoa.backend.repository.CreditWalletRepository;
import com.testmoa.backend.repository.UserRepository;
import com.testmoa.backend.service.CashoutService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 회원의 출금 신청·내역. 운영자 처리는 {@code service.admin} 쪽이다.
 */
@Service
@Transactional(readOnly = true)
public class CashoutServiceImpl implements CashoutService {

    private final UserRepository userRepository;
    private final CreditWalletRepository creditWalletRepository;
    private final CashoutRepository cashoutRepository;

    public CashoutServiceImpl(
            UserRepository userRepository,
            CreditWalletRepository creditWalletRepository,
            CashoutRepository cashoutRepository
    ) {
        this.userRepository = userRepository;
        this.creditWalletRepository = creditWalletRepository;
        this.cashoutRepository = cashoutRepository;
    }

    /**
     * 내 출금 내역. 최신순. 완료 건의 계좌·예금주는 가려서 내려준다.
     */
    @Override
    public List<CashoutResponse> getCashouts(Long userId) {
        requireUser(userId);
        return cashoutRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * 출금 신청. 지갑을 FOR UPDATE로 잠근 뒤 적립→잠김만 옮기고 장부는 남기지 않는다.
     * 회원 행을 먼저 잠가 탈퇴 신청(#84)과 차례로 처리한다. 탈퇴가 먼저 끝났으면 출금하지 않는다
     */
    @Override
    @Transactional
    public CashoutResponse requestCashout(Long userId, CashoutCreateRequest request) {
        User user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (user.getStatus() != UserStatus.ACTIVE) throw new BusinessException(ErrorCode.UNAUTHORIZED);
        if (request.amount() == null || request.amount() < 1) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "1 크레딧 이상 입력해 주세요");
        }
        if (!Cashout.Bank.isAllowed(request.bank())) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "은행을 골라 주세요");
        }

        CreditWallet wallet = creditWalletRepository.findLockedByUserId(userId)
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
        Cashout cashout = Cashout.builder()
                .user(user)
                .amount(request.amount())
                .bank(request.bank())
                .accountNumber(request.accountNumber())
                .accountHolder(request.accountHolder())
                .build();
        return toResponse(cashoutRepository.save(cashout));
    }

    /** 처리 중이면 계좌·예금주를 그대로, 끝났으면 가려서 응답에 담는다 */
    private CashoutResponse toResponse(Cashout cashout) {
        String accountNumber = cashout.isRequested()
                ? cashout.getAccountNumber()
                : Masking.accountNumber(cashout.getAccountNumber());
        String accountHolder = cashout.isRequested()
                ? cashout.getAccountHolder()
                : Masking.name(cashout.getAccountHolder());
        return CashoutResponse.of(cashout, accountNumber, accountHolder);
    }

    private void requireUser(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new BusinessException(ErrorCode.NOT_FOUND);
        }
    }
}
