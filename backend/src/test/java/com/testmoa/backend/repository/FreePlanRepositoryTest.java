package com.testmoa.backend.repository;

import com.testmoa.backend.entity.FreePlan;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

@DataJpaTest
@ActiveProfiles("test")
class FreePlanRepositoryTest {

    @Autowired
    private FreePlanRepository freePlanRepository;

    @Test
    @DisplayName("#203-S7 PK가 고정이라 몇 번을 저장해도 무료 플랜 행은 하나뿐이다")
    void onlyOneRowBecauseOfFixedId() {
        freePlanRepository.saveAndFlush(new FreePlan("FREE", List.of("선착순 자동 확정")));
        freePlanRepository.saveAndFlush(new FreePlan("FREE", List.of("기본 보상")));

        assertEquals(1, freePlanRepository.count());
        FreePlan saved = freePlanRepository.findById(FreePlan.SINGLE_ID).orElseThrow();
        assertEquals(List.of("기본 보상"), saved.benefits());
    }
}
