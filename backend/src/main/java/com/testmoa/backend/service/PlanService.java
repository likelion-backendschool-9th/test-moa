package com.testmoa.backend.service;

import com.testmoa.backend.dto.response.PlanResponse;

import java.util.List;

public interface PlanService {
    /** 지금 파는 플랜 목록 */
    List<PlanResponse> getPlans();
}
