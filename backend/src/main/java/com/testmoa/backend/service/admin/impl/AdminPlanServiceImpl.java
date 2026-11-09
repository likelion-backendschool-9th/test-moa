package com.testmoa.backend.service.admin.impl;

import com.testmoa.backend.dto.request.FreePlanUpdateRequest;
import com.testmoa.backend.dto.request.PlanCreateRequest;
import com.testmoa.backend.dto.response.FreePlanResponse;
import com.testmoa.backend.dto.response.PlanResponse;
import com.testmoa.backend.entity.FreePlan;
import com.testmoa.backend.entity.Plan;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.repository.FreePlanRepository;
import com.testmoa.backend.repository.PlanRepository;
import com.testmoa.backend.service.admin.AdminPlanService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 운영자 플랜 등록. 조건이 바뀌면 옛 행을 고치지 않고 version을 올린 새 행을 만든다.
 */
@Service
@Transactional
public class AdminPlanServiceImpl implements AdminPlanService {

    private final PlanRepository planRepository;
    private final FreePlanRepository freePlanRepository;

    public AdminPlanServiceImpl(PlanRepository planRepository, FreePlanRepository freePlanRepository) {
        this.planRepository = planRepository;
        this.freePlanRepository = freePlanRepository;
    }

    /**
     * 그 tier의 행이 없으면 version 1, 있으면 가장 큰 version에 1을 더한다.
     * 혜택은 쉼표로 이어 description에 저장하므로, 비었거나 쉼표가 든 항목은 거절한다.
     */
    @Override
    public PlanResponse register(PlanCreateRequest request) {
        validateBenefits(request.benefits());
        String tier = request.tier().trim();
        int version = planRepository.findMaxVersionByTier(tier).map(max -> max + 1).orElse(1);

        Plan saved = planRepository.save(Plan.builder()
                .tier(tier)
                .cashPrice(request.cashPrice())
                .creditPrice(request.creditPrice())
                .periodDays(request.periodDays())
                .version(version)
                .description(Plan.joinBenefits(request.benefits()))
                .build());
        return PlanResponse.of(saved);
    }

    /**
     * 무료 플랜 조건을 저장한다. 행이 없으면 만들고 있으면 그 행을 고친다(행은 하나, 이력 없음).
     * 혜택은 구독 플랜 등록과 같은 규칙으로 검사한다.
     */
    @Override
    public FreePlanResponse saveFreePlan(FreePlanUpdateRequest request) {
        validateBenefits(request.benefits());
        String tier = request.tier().trim();
        List<String> benefits = request.benefits() == null ? List.of() : request.benefits();

        FreePlan saved = freePlanRepository.findById(FreePlan.SINGLE_ID)
                .map(existing -> {
                    existing.update(tier, benefits);
                    return existing;
                })
                .orElseGet(() -> new FreePlan(tier, benefits));
        return FreePlanResponse.of(freePlanRepository.save(saved));
    }

    private void validateBenefits(List<String> benefits) {
        if (benefits == null) {
            return;
        }
        for (String benefit : benefits) {
            if (benefit == null || benefit.isBlank()) {
                throw new BusinessException(ErrorCode.INVALID_INPUT, "혜택 문구는 비워 둘 수 없어요");
            }
            if (benefit.contains(",")) {
                throw new BusinessException(ErrorCode.INVALID_INPUT, "혜택 문구에는 쉼표를 쓸 수 없어요");
            }
        }
    }
}
