package com.testmoa.backend.controller;

import com.testmoa.backend.dto.response.PlanResponse;
import com.testmoa.backend.global.util.ApiResponse;
import com.testmoa.backend.service.PlanService;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 구독 플랜 조회. 구독 설명 페이지와 구독 화면이 같이 쓰므로 로그인 없이 읽는다.
 * 운영자용 {@code admin.PlanController}와 클래스 이름이 같아서, 운영자 쪽이 빈 이름을 따로 가진다.
 */
@RestController
@RequestMapping("/api/v1/plans")
public class PlanController {

    private final PlanService planService;

    public PlanController(PlanService planService) {
        this.planService = planService;
    }

    @Operation(summary = "구독 플랜 조회", description = "지금 파는 플랜 목록. 로그인 없이 읽는다")
    @GetMapping
    public ApiResponse<List<PlanResponse>> getPlans() {
        return ApiResponse.ok(planService.getPlans());
    }
}
