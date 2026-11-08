package com.testmoa.backend.repository;

import com.testmoa.backend.entity.TestItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TestItemRepository extends JpaRepository<TestItem, Long> {
    // 모집글의 테스트 항목. 모집 작성이 요청 순서대로 저장하므로 id 순서가 항목 순서다
    List<TestItem> findByRecruitmentIdOrderByIdAsc(Long recruitmentId);
}
