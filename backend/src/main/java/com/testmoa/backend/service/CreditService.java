package com.testmoa.backend.service;

import com.testmoa.backend.dto.response.CreditBalanceResponse;
import com.testmoa.backend.dto.response.CreditLedgerResponse;
import com.testmoa.backend.entity.enums.LedgerFlow;

import java.util.List;

public interface CreditService {
    CreditBalanceResponse getBalance(Long userId);

    /**
     * 크레딧 내역, 최신순.
     *
     * @param limit 앞에서부터 받을 개수(1~100). null이면 전부
     */
    List<CreditLedgerResponse> getLedgers(Long userId, LedgerFlow flow, Integer limit);
}
