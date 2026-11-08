package com.testmoa.backend.repository;

import com.testmoa.backend.entity.Plan;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DataJpaTest
@ActiveProfiles("test")
class PlanRepositoryTest {

    @Autowired
    private PlanRepository planRepository;

    private Plan save(String tier, int version) {
        return planRepository.save(Plan.builder()
                .tier(tier)
                .cashPrice(10000)
                .creditPrice(9000)
                .periodDays(30)
                .version(version)
                .build());
    }

    @Test
    @DisplayName("#69-S1 지금 파는 플랜은 같은 등급에서 version이 가장 큰 행만 나온다")
    void currentPlansAreLatestVersionPerTier() {
        String tierA = "A-" + UUID.randomUUID();
        String tierB = "B-" + UUID.randomUUID();
        save(tierA, 1);
        Plan latestA = save(tierA, 2);
        Plan onlyB = save(tierB, 1);

        List<Plan> current = planRepository.findCurrentPlans();

        List<Plan> mine = current.stream()
                .filter(plan -> plan.getTier().equals(tierA) || plan.getTier().equals(tierB))
                .toList();
        assertEquals(2, mine.size());
        assertTrue(mine.contains(latestA));
        assertTrue(mine.contains(onlyB));
        assertTrue(mine.stream().noneMatch(plan -> plan.getTier().equals(tierA) && plan.getVersion() == 1));
    }

    @Test
    @DisplayName("#69-S12 그 등급의 가장 큰 version을 읽는다. 행이 없으면 비어 있다")
    void maxVersionByTier() {
        String tier = "T-" + UUID.randomUUID();
        assertTrue(planRepository.findMaxVersionByTier(tier).isEmpty());

        save(tier, 1);
        save(tier, 2);

        assertEquals(2, planRepository.findMaxVersionByTier(tier).orElseThrow());
    }
}
