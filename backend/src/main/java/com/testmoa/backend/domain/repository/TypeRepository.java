package com.testmoa.backend.domain.repository;

import com.testmoa.backend.domain.entity.Type;
import com.testmoa.backend.global.common.TypeCode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TypeRepository extends JpaRepository<Type, Long> {
    Optional<Type> findByCode(TypeCode code);
}
