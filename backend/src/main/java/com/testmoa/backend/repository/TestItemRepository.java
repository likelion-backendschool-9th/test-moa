package com.testmoa.backend.repository;

import com.testmoa.backend.entity.TestItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TestItemRepository extends JpaRepository<TestItem, Long> {
    // 모집글의 테스트 항목. 화면 배치 순서대로, 같으면 저장 순서대로
    List<TestItem> findByRecruitmentIdOrderBySortOrderAscIdAsc(Long recruitmentId);
}
