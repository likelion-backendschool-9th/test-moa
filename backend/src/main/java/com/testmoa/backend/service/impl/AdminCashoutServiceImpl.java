package com.testmoa.backend.service.impl;

import com.testmoa.backend.dto.request.CashoutRejectRequest;
import com.testmoa.backend.dto.response.AdminCashoutResponse;
import com.testmoa.backend.entity.CashoutRequest;
import com.testmoa.backend.entity.CreditLedger;
import com.testmoa.backend.entity.CreditWallet;
import com.testmoa.backend.repository.CashoutRequestRepository;
import com.testmoa.backend.repository.CreditLedgerRepository;
import com.testmoa.backend.repository.CreditWalletRepository;
import com.testmoa.backend.entity.enums.CashoutStatus;
import com.testmoa.backend.entity.enums.CashoutTab;
import com.testmoa.backend.entity.enums.CreditType;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.service.AdminCashoutService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 운영자 출금 처리. 요청 행 → 지갑 행 순서로 잠가 같은 요청을 두 번 처리하지 못하게 한다.
 */
@Service
@Transactional(readOnly = true)
public class AdminCashoutServiceImpl implements AdminCashoutService {

    private final CashoutRequestRepository cashoutRequestRepository;
    private final CreditWalletRepository creditWalletRepository;
    private final CreditLedgerRepository creditLedgerRepository;

    public AdminCashoutServiceImpl(
            CashoutRequestRepository cashoutRequestRepository,
            CreditWalletRepository creditWalletRepository,
            CreditLedgerRepository creditLedgerRepository
    ) {
        this.cashoutRequestRepository = cashoutRequestRepository;
        this.creditWalletRepository = creditWalletRepository;
        this.creditLedgerRepository = creditLedgerRepository;
    }

    /** 처리 대기는 신청이 오래된 순, 처리 완료는 최근 처리 순 */
    @Override
    public List<AdminCashoutResponse> getCashouts(CashoutTab tab) {
        List<CashoutRequest> requests = tab == CashoutTab.PENDING
                ? cashoutRequestRepository.findByStatusOrderByCreatedAtAsc(CashoutStatus.REQUESTED)
                : cashoutRequestRepository.findByStatusInOrderByProcessedAtDesc(
                        List.of(CashoutStatus.PAID, CashoutStatus.REJECTED));
        return requests.stream().map(AdminCashoutResponse::of).toList();
    }

    @Override
    public AdminCashoutResponse getCashout(Long id) {
        return AdminCashoutResponse.of(cashoutRequestRepository.findWithUserById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND)));
    }

    /** 지급 완료. 잠긴 금액을 줄이고 장부에 EARNED −amount "출금 지급" 한 줄을 남긴다 */
    @Override
    @Transactional
    public AdminCashoutResponse pay(Long id) {
        CashoutRequest cashout = lockRequested(id);
        CreditWallet wallet = lockWallet(cashout);
        wallet.confirmCashout(cashout.getAmount());
        cashout.pay(LocalDateTime.now());
        creditLedgerRepository.save(CreditLedger.builder()
                .creditWallet(wallet)
                .delta(-cashout.getAmount())
                .description("출금 지급")
                .type(CreditType.EARNED)
                .build());
        return AdminCashoutResponse.of(cashout);
    }

    /** 반려. 잠긴 금액을 적립으로 돌려주고 장부는 남기지 않는다. 메모는 회원에게 그대로 보인다 */
    @Override
    @Transactional
    public AdminCashoutResponse reject(Long id, CashoutRejectRequest request) {
        CashoutRequest cashout = lockRequested(id);
        CreditWallet wallet = lockWallet(cashout);
        try {
            cashout.reject(request.reason(), request.memo(), LocalDateTime.now());
        } catch (IllegalArgumentException e) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, e.getMessage());
        }
        wallet.releaseCashout(cashout.getAmount());
        return AdminCashoutResponse.of(cashout);
    }

    /** 요청 행을 잠그고 아직 처리 전인지 확인한다 */
    private CashoutRequest lockRequested(Long id) {
        CashoutRequest cashout = cashoutRequestRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (cashout.getStatus() != CashoutStatus.REQUESTED) {
            throw new BusinessException(ErrorCode.CASHOUT_ALREADY_PROCESSED);
        }
        return cashout;
    }

    private CreditWallet lockWallet(CashoutRequest cashout) {
        return creditWalletRepository.findByUserIdForUpdate(cashout.getUser().getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }
}
