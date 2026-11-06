package com.testmoa.backend.service;

import com.testmoa.backend.domain.dto.request.CashoutRejectRequest;
import com.testmoa.backend.domain.dto.response.AdminCashoutResponse;
import com.testmoa.backend.global.common.CashoutTab;

import java.util.List;

public interface AdminCashoutService {
    List<AdminCashoutResponse> getCashouts(CashoutTab tab);

    AdminCashoutResponse getCashout(Long id);

    AdminCashoutResponse pay(Long id);

    AdminCashoutResponse reject(Long id, CashoutRejectRequest request);
}
