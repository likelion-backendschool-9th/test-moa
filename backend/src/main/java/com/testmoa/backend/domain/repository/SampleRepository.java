package com.testmoa.backend.domain.repository;

import com.testmoa.backend.domain.entity.Sample;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SampleRepository extends JpaRepository<Sample, Long> {
}
