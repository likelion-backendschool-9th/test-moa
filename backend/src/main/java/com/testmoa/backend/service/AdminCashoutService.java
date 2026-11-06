package com.testmoa.backend.service;

import com.testmoa.backend.dto.request.CashoutRejectRequest;
import com.testmoa.backend.dto.response.AdminCashoutResponse;
import com.testmoa.backend.entity.enums.CashoutTab;

import java.util.List;

public interface AdminCashoutService {
    List<AdminCashoutResponse> getCashouts(CashoutTab tab);

    AdminCashoutResponse getCashout(Long id);

    AdminCashoutResponse pay(Long id);

    AdminCashoutResponse reject(Long id, CashoutRejectRequest request);
}
