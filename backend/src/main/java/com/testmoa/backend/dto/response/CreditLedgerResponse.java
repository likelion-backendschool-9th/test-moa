package com.testmoa.backend.dto.response;

import com.testmoa.backend.entity.CreditLedger;
import com.testmoa.backend.entity.enums.CreditType;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * 크레딧 잔액이 바뀐 장부 한 줄.
 */
@Getter
@Builder
public class CreditLedgerResponse {
    private Long id;
    private String description;
    /** 늘어나면 양수, 줄어들면 음수 */
    private Integer delta;
    private CreditType type;
    private LocalDateTime createdAt;

    public static CreditLedgerResponse of(CreditLedger ledger) {
        return CreditLedgerResponse.builder()
                .id(ledger.getId())
                .description(ledger.getDescription())
                .delta(ledger.getDelta())
                .type(ledger.getType())
                .createdAt(ledger.getCreatedAt())
                .build();
    }
}
