package com.testmoa.backend.repository;

import com.testmoa.backend.entity.TestItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TestItemRepository extends JpaRepository<TestItem, Long> {
}
