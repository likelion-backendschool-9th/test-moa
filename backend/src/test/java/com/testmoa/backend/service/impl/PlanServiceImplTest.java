package com.testmoa.backend.service.impl;

import com.testmoa.backend.dto.response.PlanResponse;
import com.testmoa.backend.entity.Plan;
import com.testmoa.backend.repository.PlanRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PlanServiceImplTest {

    @Mock
    private PlanRepository planRepository;

    @InjectMocks
    private PlanServiceImpl service;

    private Plan plan(long id, int version, String description) {
        Plan plan = Plan.builder()
                .tier("구독").cashPrice(10000).creditPrice(9000).periodDays(30)
                .version(version).description(description).build();
        ReflectionTestUtils.setField(plan, "id", id);
        return plan;
    }

    @Test
    @DisplayName("#69-S1 혜택은 description을 쉼표로 잘라 앞뒤 공백을 지운 목록으로 내려준다")
    void benefitsAreSplitFromDescription() {
        when(planRepository.findCurrentPlans())
                .thenReturn(List.of(plan(2L, 2, "지원자 중 직접 선정, 기본 + 추가 보상 ,선정한 테스터와 가능")));

        List<PlanResponse> plans = service.getPlans();

        assertEquals(1, plans.size());
        PlanResponse response = plans.get(0);
        assertEquals(2L, response.id());
        assertEquals("구독", response.tier());
        assertEquals(2, response.version());
        assertEquals(10000, response.cashPrice());
        assertEquals(9000, response.creditPrice());
        assertEquals(30, response.periodDays());
        assertEquals(List.of("지원자 중 직접 선정", "기본 + 추가 보상", "선정한 테스터와 가능"), response.benefits());
    }

    @Test
    @DisplayName("#69-S1 description이 없거나 비어 있으면 혜택은 빈 목록이다")
    void emptyDescriptionGivesEmptyBenefits() {
        when(planRepository.findCurrentPlans()).thenReturn(List.of(plan(1L, 1, null), plan(2L, 1, "  ")));

        List<PlanResponse> plans = service.getPlans();

        assertTrue(plans.get(0).benefits().isEmpty());
        assertTrue(plans.get(1).benefits().isEmpty());
    }

    @Test
    @DisplayName("#69-S2 플랜이 하나도 없으면 빈 목록이다")
    void noPlansGivesEmptyList() {
        when(planRepository.findCurrentPlans()).thenReturn(List.of());

        assertTrue(service.getPlans().isEmpty());
    }
}
