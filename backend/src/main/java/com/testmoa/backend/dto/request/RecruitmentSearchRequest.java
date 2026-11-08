package com.testmoa.backend.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

/**
 * 공개 모집 목록·검색 조건(#112). 쿼리 파라미터로 받고(@ModelAttribute), 보내지 않은 값은 기본값을 쓴다.
 * 모르는 유형·정렬 값은 서비스가 400으로 알린다
 *
 * @param q            프로젝트 이름·소개, 모집글 제목에서 찾는다. 앞뒤 공백은 서비스가 지운다
 * @param type         web, mobile, game, api. 없으면 전체
 * @param open         true면 모집 마감 전인 것만. 기본 false
 * @param subscription true면 구독 모집만. 기본 false
 * @param sort         latest(최신순), deadline(마감 임박순). 기본 latest
 * @param page         1부터. 기본 1
 * @param size         한 페이지 개수 1~50. 기본 20
 */
public record RecruitmentSearchRequest(
        @Schema(description = "프로젝트 이름·소개, 모집글 제목에서 찾는다")
        @Size(max = 100, message = "검색어는 100자까지 적을 수 있어요")
        String q,

        @Schema(description = "web, mobile, game, api")
        String type,

        @Schema(description = "true면 모집 마감 전인 것만", defaultValue = "false")
        Boolean open,

        @Schema(description = "true면 구독 모집만", defaultValue = "false")
        Boolean subscription,

        @Schema(description = "latest(최신순), deadline(마감 임박순)", defaultValue = "latest")
        String sort,

        @Schema(description = "1부터", defaultValue = "1")
        @Min(value = 1, message = "페이지는 1부터예요")
        Integer page,

        @Schema(description = "한 페이지 개수, 1~50", defaultValue = "20")
        @Min(value = 1, message = "한 페이지에 1~50개까지 볼 수 있어요")
        @Max(value = 50, message = "한 페이지에 1~50개까지 볼 수 있어요")
        Integer size
) {
    public static final String DEFAULT_SORT = "latest";
    public static final int DEFAULT_PAGE = 1;
    public static final int DEFAULT_SIZE = 20;

    // 보내지 않은 값은 기본값으로 채운다. 검증(@Valid)은 채운 뒤에 한다
    public RecruitmentSearchRequest {
        if (open == null) open = false;
        if (subscription == null) subscription = false;
        if (sort == null || sort.isBlank()) sort = DEFAULT_SORT;
        if (page == null) page = DEFAULT_PAGE;
        if (size == null) size = DEFAULT_SIZE;
    }
}
