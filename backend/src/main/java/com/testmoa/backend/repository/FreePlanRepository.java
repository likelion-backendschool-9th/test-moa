package com.testmoa.backend.repository;

import com.testmoa.backend.entity.FreePlan;
import org.springframework.data.jpa.repository.JpaRepository;

/** 무료 플랜 조건. 행은 하나이고 PK는 {@link FreePlan#SINGLE_ID}다 */
public interface FreePlanRepository extends JpaRepository<FreePlan, Long> {
}
