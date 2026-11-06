package com.testmoa.backend.service;

import com.testmoa.backend.domain.dto.request.CashoutCreateRequest;
import com.testmoa.backend.domain.dto.response.CashoutResponse;
import com.testmoa.backend.domain.dto.response.CreditBalanceResponse;
import com.testmoa.backend.domain.dto.response.CreditLedgerResponse;
import com.testmoa.backend.global.common.LedgerFlow;

import java.util.List;

public interface CreditService {
    CreditBalanceResponse getBalance(Long userId);

    List<CreditLedgerResponse> getLedgers(Long userId, LedgerFlow flow);

    List<CashoutResponse> getCashouts(Long userId);

    CashoutResponse requestCashout(Long userId, CashoutCreateRequest request);
}
