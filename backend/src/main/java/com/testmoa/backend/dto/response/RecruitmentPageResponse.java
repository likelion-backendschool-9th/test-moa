package com.testmoa.backend.dto.response;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 공개 모집 목록의 한 페이지(#112). 프론트 RecruitmentPage와 같은 모양이다
 *
 * @param total     조건에 맞는 전체 개수
 * @param page      실제로 준 페이지. 요청한 페이지가 마지막보다 크면 마지막 페이지
 * @param pageCount 전체 페이지 수. 결과가 없어도 1
 */
public record RecruitmentPageResponse(
        List<Item> items,
        long total,
        int page,
        int pageCount
) {
    /**
     * 목록 카드 하나. status·softwareType은 상세(#113)와 같은 프론트 이름이다
     *
     * @param title        모집글 제목. 카드의 할 일 한 줄
     * @param subscription 구독 모집 여부. 추가 보상 배지에 쓴다
     */
    public record Item(
            Long id,
            String title,
            String projectName,
            String projectDescription,
            String projectImageUrl,
            String softwareType,
            boolean subscription,
            String status,
            LocalDateTime createdAt,
            LocalDateTime recruitDeadline,
            LocalDateTime submitDeadline
    ) {}
}
