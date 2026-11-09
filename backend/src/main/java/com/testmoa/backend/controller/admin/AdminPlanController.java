package com.testmoa.backend.controller.admin;

import com.testmoa.backend.dto.request.FreePlanUpdateRequest;
import com.testmoa.backend.dto.request.PlanCreateRequest;
import com.testmoa.backend.dto.response.FreePlanResponse;
import com.testmoa.backend.dto.response.PlanResponse;
import com.testmoa.backend.global.util.ApiResponse;
import com.testmoa.backend.service.admin.AdminPlanService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * 운영자 플랜 등록과 무료 플랜 조건 저장. /api/v1/admin/** 은 SecurityConfig가 ADMIN만 허용한다.
 */
@RestController
@RequestMapping("/api/v1/admin/plans")
public class AdminPlanController {

    private final AdminPlanService planService;

    public AdminPlanController(AdminPlanService planService) {
        this.planService = planService;
    }

    @Operation(summary = "플랜 등록", description = "같은 등급이 있으면 version을 올린 새 행을 만든다")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<PlanResponse> register(@Valid @RequestBody PlanCreateRequest request) {
        return ApiResponse.ok(planService.register(request));
    }

    @Operation(summary = "무료 플랜 저장", description = "무료 플랜의 이름과 혜택을 저장한다. 행이 없으면 만들고 있으면 고친다")
    @PutMapping("/free")
    public ApiResponse<FreePlanResponse> saveFreePlan(@Valid @RequestBody FreePlanUpdateRequest request) {
        return ApiResponse.ok(planService.saveFreePlan(request));
    }
}
