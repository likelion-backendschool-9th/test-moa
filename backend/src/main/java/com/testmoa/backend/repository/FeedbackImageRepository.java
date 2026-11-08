package com.testmoa.backend.repository;

import com.testmoa.backend.entity.FeedbackImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface FeedbackImageRepository extends JpaRepository<FeedbackImage, Long> {
    // 여러 피드백의 스크린샷. 올린 순서대로
    List<FeedbackImage> findByFeedbackIdInOrderByIdAsc(Collection<Long> feedbackIds);
}
