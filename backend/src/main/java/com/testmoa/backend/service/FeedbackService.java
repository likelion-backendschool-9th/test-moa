package com.testmoa.backend.service;

import com.testmoa.backend.global.file.FileStorage;
import com.testmoa.backend.dto.response.FeedbackResponse;

import java.util.List;

public interface FeedbackService {
    /** 내 프로젝트 피드백의 참가 폴더에서 이미지를 읽는다. 남의 프로젝트는 NOT_FOUND */
    FileStorage.ImageFile loadFeedbackImage(Long userId, Long feedbackId, String name);

    /**
     * 개발자가 내 모집의 피드백을 최근 제출 순으로 본다. 다른 회원의 모집은 NOT_FOUND
     */
    List<FeedbackResponse> findFeedbacks(Long userId, Long recruitmentId);

    /**
     * 유용해요 표시를 켜거나 끈다. 다른 회원의 피드백은 NOT_FOUND
     */
    void recommend(Long userId, Long feedbackId, boolean recommended);

    /**
     * 피드백을 신고한다. 제출 상태이고 제출 후 72시간 안일 때만 할 수 있고 아니면 FEEDBACK_NOT_REPORTABLE
     */
    void report(Long userId, Long feedbackId, String reason);
}
