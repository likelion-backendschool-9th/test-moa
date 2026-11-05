package com.testmoa.backend.service;

import com.testmoa.backend.domain.dto.response.CreditBalanceResponse;
import com.testmoa.backend.domain.dto.response.CreditLedgerResponse;
import com.testmoa.backend.global.common.LedgerFlow;

import java.util.List;

public interface CreditService {
    CreditBalanceResponse getBalance(Long userId);

    List<CreditLedgerResponse> getLedgers(Long userId, LedgerFlow flow);
}
