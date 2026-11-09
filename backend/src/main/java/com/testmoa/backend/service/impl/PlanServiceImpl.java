package com.testmoa.backend.service.impl;

import com.testmoa.backend.dto.response.PlanResponse;
import com.testmoa.backend.repository.PlanRepository;
import com.testmoa.backend.service.PlanService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 구독 플랜 조회. 로그인 없이 읽는다. 운영자 등록은 {@code service.admin} 쪽이다.
 */
@Service
@Transactional(readOnly = true)
public class PlanServiceImpl implements PlanService {

    private final PlanRepository planRepository;

    public PlanServiceImpl(PlanRepository planRepository) {
        this.planRepository = planRepository;
    }

    /**
     * 같은 등급에서 version이 가장 큰 플랜만 돌려준다. 무료는 행이 없다.
     */
    @Override
    public List<PlanResponse> getPlans() {
        return planRepository.findCurrentPlans().stream()
                .map(PlanResponse::of)
                .toList();
    }
}
