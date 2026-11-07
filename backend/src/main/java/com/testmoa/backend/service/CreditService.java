package com.testmoa.backend.service;

import com.testmoa.backend.dto.response.CreditBalanceResponse;
import com.testmoa.backend.dto.response.CreditLedgerResponse;
import com.testmoa.backend.entity.enums.LedgerFlow;

import java.util.List;

public interface CreditService {
    CreditBalanceResponse getBalance(Long userId);

    List<CreditLedgerResponse> getLedgers(Long userId, LedgerFlow flow);
}
