package com.testmoa.backend.repository;

import com.testmoa.backend.entity.Plan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PlanRepository extends JpaRepository<Plan, Long> {
    /** 지금 파는 플랜. 같은 tier에서 version이 가장 큰 행만 */
    @Query("select p from plans p where p.version = (select max(q.version) from plans q where q.tier = p.tier) order by p.id")
    List<Plan> findCurrentPlans();

    /** 그 tier의 가장 큰 version. 행이 없으면 비어 있다 */
    @Query("select max(p.version) from plans p where p.tier = :tier")
    Optional<Integer> findMaxVersionByTier(@Param("tier") String tier);
}
