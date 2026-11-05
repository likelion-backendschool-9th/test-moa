package com.testmoa.backend.domain.repository;

import com.testmoa.backend.domain.entity.Register;
import com.testmoa.backend.global.common.RegisterStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface RegisterRepository extends JpaRepository<Register, Long> {
    // 모집글별 상태가 같은 참가 수. 참가가 없는 모집글은 결과에 없다
    @Query("select r.recruitment.id as recruitmentId, count(r) as count from registers r "
            + "where r.recruitment.id in :recruitmentIds and r.status = :status group by r.recruitment.id")
    List<RecruitmentCount> countByRecruitmentIds(@Param("recruitmentIds") Collection<Long> recruitmentIds, @Param("status") RegisterStatus status);

    interface RecruitmentCount {
        Long getRecruitmentId();

        long getCount();
    }
}
