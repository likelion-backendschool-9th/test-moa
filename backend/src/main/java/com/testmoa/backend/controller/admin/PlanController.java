package com.testmoa.backend.controller.admin;

import com.testmoa.backend.dto.request.PlanCreateRequest;
import com.testmoa.backend.dto.response.PlanResponse;
import com.testmoa.backend.global.util.ApiResponse;
import com.testmoa.backend.service.admin.PlanService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * 운영자 플랜 등록. /api/v1/admin/** 은 SecurityConfig가 ADMIN만 허용한다.
 * 회원용 {@code PlanController}와 클래스 이름이 같아서 빈 이름을 따로 준다.
 */
@RestController("adminPlanController")
@RequestMapping("/api/v1/admin/plans")
public class PlanController {

    private final PlanService planService;

    public PlanController(PlanService planService) {
        this.planService = planService;
    }

    @Operation(summary = "플랜 등록", description = "같은 등급이 있으면 version을 올린 새 행을 만든다")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<PlanResponse> register(@Valid @RequestBody PlanCreateRequest request) {
        return ApiResponse.ok(planService.register(request));
    }
}
