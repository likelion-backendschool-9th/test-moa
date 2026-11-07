package com.testmoa.backend.service.admin;

import com.testmoa.backend.dto.request.CashoutProcessRequest;
import com.testmoa.backend.dto.request.CashoutRejectRequest;
import com.testmoa.backend.dto.response.AdminCashoutResponse;
import com.testmoa.backend.entity.enums.CashoutTab;

import java.util.List;

public interface CashoutService {
    List<AdminCashoutResponse> getCashouts(CashoutTab tab);

    AdminCashoutResponse getCashout(Long id);

    /** 결정(지급 완료·반려)에 따라 pay 또는 reject를 한다 */
    AdminCashoutResponse process(Long id, CashoutProcessRequest request);

    AdminCashoutResponse pay(Long id);

    AdminCashoutResponse reject(Long id, CashoutRejectRequest request);
}
