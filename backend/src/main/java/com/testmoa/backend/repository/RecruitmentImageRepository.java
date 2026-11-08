package com.testmoa.backend.repository;

import com.testmoa.backend.entity.RecruitmentImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RecruitmentImageRepository extends JpaRepository<RecruitmentImage, Long> {
    // 모집글 이미지. 보낸 순서(sortOrder)대로
    List<RecruitmentImage> findByRecruitmentIdOrderBySortOrderAsc(Long recruitmentId);
}
