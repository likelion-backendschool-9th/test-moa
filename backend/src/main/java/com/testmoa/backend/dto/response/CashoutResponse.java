package com.testmoa.backend.dto.response;

import com.testmoa.backend.entity.Cashout;
import com.testmoa.backend.entity.enums.CashoutRejectReason;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * 출금 내역 한 줄. 계좌번호·예금주는 서비스가 가려서 넘긴 값을 담는다.
 * 반려 메모는 사유와 상관없이 회원에게 그대로 보인다(OTHER만 필수).
 */
@Getter
@Builder
public class CashoutResponse {
    private Long id;
    private Integer amount;
    private Cashout.Status status;
    private String bank;
    private String accountNumber;
    private String accountHolder;
    private CashoutRejectReason rejectReason;
    private String rejectMemo;
    private LocalDateTime requestedAt;
    private LocalDateTime processedAt;

    public static CashoutResponse of(Cashout request, String accountNumber, String accountHolder) {
        return CashoutResponse.builder()
                .id(request.getId())
                .amount(request.getAmount())
                .status(request.getStatus())
                .bank(request.getBank())
                .accountNumber(accountNumber)
                .accountHolder(accountHolder)
                .rejectReason(request.getRejectReason())
                .rejectMemo(request.getRejectMemo())
                .requestedAt(request.getCreatedAt())
                .processedAt(request.getProcessedAt())
                .build();
    }
}
