package com.testmoa.backend.service;

import com.testmoa.backend.dto.response.FreePlanResponse;
import com.testmoa.backend.dto.response.PlanResponse;

import java.util.List;

public interface PlanService {
    /** 지금 파는 플랜 목록 */
    List<PlanResponse> getPlans();

    /** 무료 플랜의 이름과 혜택. 행이 없으면 이름 FREE와 빈 혜택이다 */
    FreePlanResponse getFreePlan();
}
