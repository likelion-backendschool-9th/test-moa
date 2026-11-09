package com.testmoa.backend.service.admin;

import com.testmoa.backend.dto.request.FreePlanUpdateRequest;
import com.testmoa.backend.dto.request.PlanCreateRequest;
import com.testmoa.backend.dto.response.FreePlanResponse;
import com.testmoa.backend.dto.response.PlanResponse;

public interface AdminPlanService {
    /** 플랜 등록. 같은 등급이 있으면 version을 올린 새 행을 만든다 */
    PlanResponse register(PlanCreateRequest request);

    /** 무료 플랜의 이름과 혜택을 저장한다. 행이 없으면 만들고 있으면 고친다 */
    FreePlanResponse saveFreePlan(FreePlanUpdateRequest request);
}
