package com.testmoa.backend.repository;

import com.testmoa.backend.entity.Type;
import com.testmoa.backend.entity.enums.TypeCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface TypeRepository extends JpaRepository<Type, Long> {
    Optional<Type> findByCode(TypeCode code);

    /**
     * 그 코드의 유형이 없을 때만 넣는다(PostgreSQL ON CONFLICT). 다른 요청이 같은 행을 넣는 중이면 그 요청이 끝날 때까지 기다렸다가
     * 아무것도 하지 않아서, 동시에 처음 써도 유일 제약 오류가 나지 않는다. 시각은 다른 저장처럼 서버 시간대로 넘긴다
     */
    @Modifying
    @Query(value = "INSERT INTO types (code, created_at, updated_at) VALUES (:code, :now, :now) ON CONFLICT (code) DO NOTHING", nativeQuery = true)
    void insertIfAbsent(@Param("code") String code, @Param("now") LocalDateTime now);
}
