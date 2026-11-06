package com.testmoa.backend.domain.dto.response;

import com.testmoa.backend.domain.entity.CashoutRequest;
import com.testmoa.backend.global.common.AccountMasking;
import com.testmoa.backend.global.common.CashoutRejectReason;
import com.testmoa.backend.global.common.CashoutStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * 출금 내역 한 줄. 계좌번호·예금주는 상태에 따라 마스킹한다.
 * 반려 메모는 사유와 상관없이 회원에게 그대로 보인다(OTHER만 필수).
 */
@Getter
@Builder
public class CashoutResponse {
    private Long id;
    private Integer amount;
    private CashoutStatus status;
    private String bank;
    private String accountNumber;
    private String accountHolder;
    private CashoutRejectReason rejectReason;
    private String rejectMemo;
    private LocalDateTime requestedAt;
    private LocalDateTime processedAt;

    public static CashoutResponse of(CashoutRequest request) {
        return CashoutResponse.builder()
                .id(request.getId())
                .amount(request.getAmount())
                .status(request.getStatus())
                .bank(request.getBank())
                .accountNumber(AccountMasking.mask(request.getAccountNumber(), request.getStatus()))
                .accountHolder(AccountMasking.maskHolder(request.getAccountHolder(), request.getStatus()))
                .rejectReason(request.getRejectReason())
                .rejectMemo(request.getRejectMemo())
                .requestedAt(request.getCreatedAt())
                .processedAt(request.getProcessedAt())
                .build();
    }
}
