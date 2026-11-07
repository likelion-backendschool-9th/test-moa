package com.testmoa.backend.service.admin.impl;

import com.testmoa.backend.dto.request.CashoutProcessRequest;
import com.testmoa.backend.dto.request.CashoutRejectRequest;
import com.testmoa.backend.dto.response.AdminCashoutResponse;
import com.testmoa.backend.entity.Cashout;
import com.testmoa.backend.entity.CreditLedger;
import com.testmoa.backend.entity.CreditWallet;
import com.testmoa.backend.repository.CashoutRepository;
import com.testmoa.backend.repository.CreditLedgerRepository;
import com.testmoa.backend.repository.CreditWalletRepository;
import com.testmoa.backend.entity.enums.CashoutTab;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.global.util.Masking;
import com.testmoa.backend.service.admin.CashoutService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 운영자 출금 처리. 요청 행 → 지갑 행 순서로 잠가 같은 요청을 두 번 처리하지 못하게 한다.
 */
@Service("adminCashoutService")
@Transactional(readOnly = true)
public class CashoutServiceImpl implements CashoutService {

    private final CashoutRepository cashoutRepository;
    private final CreditWalletRepository creditWalletRepository;
    private final CreditLedgerRepository creditLedgerRepository;

    public CashoutServiceImpl(
            CashoutRepository cashoutRepository,
            CreditWalletRepository creditWalletRepository,
            CreditLedgerRepository creditLedgerRepository
    ) {
        this.cashoutRepository = cashoutRepository;
        this.creditWalletRepository = creditWalletRepository;
        this.creditLedgerRepository = creditLedgerRepository;
    }

    /** 처리 대기는 신청이 오래된 순, 처리 완료는 최근 처리 순 */
    @Override
    public List<AdminCashoutResponse> getCashouts(CashoutTab tab) {
        List<Cashout> requests = tab == CashoutTab.PENDING
                ? cashoutRepository.findByStatusOrderByCreatedAtAsc(Cashout.Status.REQUESTED)
                : cashoutRepository.findByStatusInOrderByProcessedAtDesc(
                        List.of(Cashout.Status.PAID, Cashout.Status.REJECTED));
        return requests.stream().map(this::toResponse).toList();
    }

    @Override
    public AdminCashoutResponse getCashout(Long id) {
        return toResponse(cashoutRepository.findWithUserById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND)));
    }

    /**
     * 처리 한 번. 결정이 PAID면 지급, REJECTED면 반려다. 쓰기 트랜잭션 안에서 pay·reject를 부른다.
     * 지급에는 사유·메모를 받지 않는다(빈 값은 없는 것으로 본다).
     */
    @Override
    @Transactional
    public AdminCashoutResponse process(Long id, CashoutProcessRequest request) {
        return switch (request.decision()) {
            case PAID -> {
                boolean hasMemo = request.memo() != null && !request.memo().isBlank();
                if (request.reason() != null || hasMemo) {
                    throw new BusinessException(ErrorCode.INVALID_INPUT, "지급 완료에는 반려 사유와 메모를 보낼 수 없어요");
                }
                yield pay(id);
            }
            case REJECTED -> reject(id, new CashoutRejectRequest(request.reason(), request.memo()));
            case REQUESTED -> throw new BusinessException(ErrorCode.INVALID_INPUT, "지급 완료나 반려를 골라 주세요");
        };
    }

    /** 지급 완료. 잠긴 금액을 줄이고 장부에 EARNED −amount "출금 지급" 한 줄을 남긴다 */
    @Override
    @Transactional
    public AdminCashoutResponse pay(Long id) {
        Cashout cashout = lockRequested(id);
        CreditWallet wallet = lockWallet(cashout);
        wallet.confirmCashout(cashout.getAmount());
        cashout.pay(LocalDateTime.now());
        creditLedgerRepository.save(CreditLedger.builder()
                .creditWallet(wallet)
                .delta(-cashout.getAmount())
                .description("출금 지급")
                .type(CreditLedger.Type.EARNED)
                .build());
        return toResponse(cashout);
    }

    /** 반려. 잠긴 금액을 적립으로 돌려주고 장부는 남기지 않는다. 메모는 회원에게 그대로 보인다 */
    @Override
    @Transactional
    public AdminCashoutResponse reject(Long id, CashoutRejectRequest request) {
        Cashout cashout = lockRequested(id);
        CreditWallet wallet = lockWallet(cashout);
        try {
            cashout.reject(request.reason(), request.memo(), LocalDateTime.now());
        } catch (IllegalArgumentException e) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, e.getMessage());
        }
        wallet.releaseCashout(cashout.getAmount());
        return toResponse(cashout);
    }

    /** 처리 중이면 계좌·예금주를 그대로, 끝났으면 가려서 응답에 담는다 */
    private AdminCashoutResponse toResponse(Cashout cashout) {
        String accountNumber = cashout.isRequested()
                ? cashout.getAccountNumber()
                : Masking.accountNumber(cashout.getAccountNumber());
        String accountHolder = cashout.isRequested()
                ? cashout.getAccountHolder()
                : Masking.name(cashout.getAccountHolder());
        return AdminCashoutResponse.of(cashout, accountNumber, accountHolder);
    }

    /** 요청 행을 잠그고 아직 처리 전인지 확인한다 */
    private Cashout lockRequested(Long id) {
        Cashout cashout = cashoutRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (cashout.getStatus() != Cashout.Status.REQUESTED) {
            throw new BusinessException(ErrorCode.CASHOUT_ALREADY_PROCESSED);
        }
        return cashout;
    }

    private CreditWallet lockWallet(Cashout cashout) {
        return creditWalletRepository.findByUserIdForUpdate(cashout.getUser().getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }
}
