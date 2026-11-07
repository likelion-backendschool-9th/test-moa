package com.testmoa.backend.service.admin;

import com.testmoa.backend.dto.request.PlanCreateRequest;
import com.testmoa.backend.dto.response.PlanResponse;

public interface PlanService {
    /** 플랜 등록. 같은 등급이 있으면 version을 올린 새 행을 만든다 */
    PlanResponse register(PlanCreateRequest request);
}
