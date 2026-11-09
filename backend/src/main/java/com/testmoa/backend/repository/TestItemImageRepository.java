package com.testmoa.backend.repository;

import com.testmoa.backend.entity.TestItemImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface TestItemImageRepository extends JpaRepository<TestItemImage, Long> {
    // 여러 항목의 이미지. 항목마다 보낸 순서(sortOrder)대로
    List<TestItemImage> findByTestItemIdInOrderBySortOrderAsc(Collection<Long> testItemIds);

    // 지우는 항목의 이미지. 항목보다 먼저 지운다
    void deleteByTestItemIdIn(Collection<Long> testItemIds);
}
