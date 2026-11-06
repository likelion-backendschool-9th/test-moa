package com.testmoa.backend.domain.repository;

import com.testmoa.backend.domain.entity.TestItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TestItemRepository extends JpaRepository<TestItem, Long> {
}
