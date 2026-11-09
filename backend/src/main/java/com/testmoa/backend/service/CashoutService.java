package com.testmoa.backend.service;

import com.testmoa.backend.dto.request.CashoutCreateRequest;
import com.testmoa.backend.dto.response.CashoutResponse;

import java.util.List;

public interface CashoutService {
    List<CashoutResponse> getCashouts(Long userId);

    CashoutResponse requestCashout(Long userId, CashoutCreateRequest request);
}
