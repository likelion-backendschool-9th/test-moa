package com.testmoa.backend.dto.response;

import com.testmoa.backend.entity.Cashout;
import com.testmoa.backend.entity.enums.CashoutRejectReason;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * 운영자 출금 목록·상세·처리 응답. 계좌·예금주는 서비스가 가려서 넘긴 값을 담는다.
 * 반려 메모는 사유와 상관없이 회원에게 보이는 값 그대로다.
 */
@Getter
@Builder
public class AdminCashoutResponse {
    private Long id;
    private String nickname;
    private String userName;
    private Integer amount;
    private Cashout.Status status;
    private String bank;
    private String accountNumber;
    private String accountHolder;
    private CashoutRejectReason rejectReason;
    private String rejectMemo;
    private LocalDateTime requestedAt;
    private LocalDateTime processedAt;

    public static AdminCashoutResponse of(Cashout request, String accountNumber, String accountHolder) {
        return AdminCashoutResponse.builder()
                .id(request.getId())
                .nickname(request.getUser().getNickname())
                .userName(request.getUser().getName())
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
