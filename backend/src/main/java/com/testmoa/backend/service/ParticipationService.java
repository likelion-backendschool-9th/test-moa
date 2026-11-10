package com.testmoa.backend.service;

import com.testmoa.backend.dto.request.FeedbackSubmitRequest;
import com.testmoa.backend.global.file.FileStorage;
import com.testmoa.backend.dto.response.ParticipationListItemResponse;
import com.testmoa.backend.dto.response.ParticipationResponse;
import com.testmoa.backend.dto.response.ParticipationSummaryResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface ParticipationService {
    /** 내 참가의 이미지를 읽는다. 제출에 연결하지 않은 파일도 읽을 수 있고, 남의 참가는 NOT_FOUND */
    FileStorage.ImageFile loadFeedbackImage(Long userId, Long registerId, String name);

    /**
     * 내 참여 상세(#118). 없거나 다른 회원의 참가는 NOT_FOUND
     */
    ParticipationResponse find(Long userId, Long registerId);

    /**
     * 항목별 피드백을 한 번에 제출한다(#118). 모든 행에 같은 제출 시각을 넣는다.
     * 확정이 아니면 PARTICIPATION_NOT_CONFIRMED, 제출 마감이 지났으면 FEEDBACK_DEADLINE_PASSED,
     * 이미 냈으면 FEEDBACK_ALREADY_SUBMITTED, 필수 항목이 비었거나 아무것도 적지 않았으면 INVALID_INPUT
     */
    ParticipationResponse submitFeedback(Long userId, Long registerId, FeedbackSubmitRequest request);

    /**
     * 피드백 이미지를 한 장 올린다(#119). 제출과 같이 확정·마감·이미 제출·피드백 제재를 확인한다.
     * 잠그지 않는다. 파일이 한 장이 아니거나 PNG·JPG·WEBP가 아니면 INVALID_INPUT이고 저장하지 않는다
     */
    String uploadFeedbackImage(Long userId, Long registerId, List<MultipartFile> files);

    /**
     * 탭의 내 참여(#117). 지원한·참여 중 탭은 할 일 순서(상태 순서 → 날짜 가까운 순), 참여했던 탭은 최근 순.
     * 없는 탭이면 INVALID_INPUT
     */
    List<ParticipationListItemResponse> list(Long userId, String tab);

    /** 탭별 개수, 제출할 피드백 수, 지급 대기 크레딧(#117) */
    ParticipationSummaryResponse summary(Long userId);

    /** 제출 전 참여를 제출 마감이 가까운 순서로(#117). 마감 캘린더와 마감 임박 목록이 쓴다 */
    List<ParticipationListItemResponse> deadlines(Long userId);
}
