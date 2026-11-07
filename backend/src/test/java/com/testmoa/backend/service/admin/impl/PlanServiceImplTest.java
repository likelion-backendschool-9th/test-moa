package com.testmoa.backend.service.admin.impl;

import com.testmoa.backend.dto.request.PlanCreateRequest;
import com.testmoa.backend.dto.response.PlanResponse;
import com.testmoa.backend.entity.Plan;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.repository.PlanRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PlanServiceImplTest {

    @Mock
    private PlanRepository planRepository;

    @InjectMocks
    private PlanServiceImpl service;

    private PlanCreateRequest request(String tier, List<String> benefits) {
        return new PlanCreateRequest(tier, 10000, 9000, 30, benefits);
    }

    @Test
    @DisplayName("#69-S12 처음 등록하면 version 1이고 혜택은 쉼표로 이어 description에 저장한다")
    void firstRegisterIsVersionOne() {
        when(planRepository.findMaxVersionByTier("구독")).thenReturn(Optional.empty());
        when(planRepository.save(any(Plan.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PlanResponse response = service.register(request("구독", List.of("a", "b")));

        assertEquals(1, response.version());
        assertEquals(List.of("a", "b"), response.benefits());
        ArgumentCaptor<Plan> captor = ArgumentCaptor.forClass(Plan.class);
        verify(planRepository).save(captor.capture());
        assertEquals("a,b", captor.getValue().getDescription());
        assertEquals("구독", captor.getValue().getTier());
        assertEquals(30, captor.getValue().getPeriodDays());
    }

    @Test
    @DisplayName("#69-S12 같은 등급을 다시 등록하면 가장 큰 version에 1을 더한 새 행이다")
    void registerAgainRaisesVersion() {
        when(planRepository.findMaxVersionByTier("구독")).thenReturn(Optional.of(1));
        when(planRepository.save(any(Plan.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PlanResponse response = service.register(new PlanCreateRequest("구독", 12000, 10000, 30, null));

        assertEquals(2, response.version());
        assertEquals(12000, response.cashPrice());
        assertEquals(List.of(), response.benefits());
    }

    @Test
    @DisplayName("#69-S12 등급 이름의 앞뒤 공백은 지운다")
    void tierIsTrimmed() {
        when(planRepository.findMaxVersionByTier("구독")).thenReturn(Optional.empty());
        when(planRepository.save(any(Plan.class))).thenAnswer(invocation -> invocation.getArgument(0));

        assertEquals("구독", service.register(request("  구독 ", null)).tier());
    }

    @Test
    @DisplayName("#69-S13 혜택 항목이 비었거나 쉼표를 담으면 400이고 저장하지 않는다")
    void invalidBenefitsAreRejected() {
        BusinessException blank = assertThrows(BusinessException.class,
                () -> service.register(request("구독", List.of("a", "  "))));
        BusinessException nullItem = assertThrows(BusinessException.class,
                () -> service.register(request("구독", java.util.Arrays.asList("a", null))));
        BusinessException comma = assertThrows(BusinessException.class,
                () -> service.register(request("구독", List.of("a, b"))));

        assertEquals(ErrorCode.INVALID_INPUT, blank.getErrorCode());
        assertEquals(ErrorCode.INVALID_INPUT, nullItem.getErrorCode());
        assertEquals(ErrorCode.INVALID_INPUT, comma.getErrorCode());
        verify(planRepository, never()).save(any());
    }
}
