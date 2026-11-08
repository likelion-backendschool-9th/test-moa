package com.testmoa.backend.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

/**
 * 모집 정보 수정. 보낸 값만 바꾼다. 모집 조건을 빈 문자열로 보내면 지운다
 */
public record RecruitmentUpdateRequest(
        @Pattern(regexp = "(?s).*\\S.*", message = "모집글 제목을 적어 주세요")
        @Size(max = 50, message = "모집글 제목은 50자까지 적을 수 있어요")
        String title,

        @Pattern(regexp = "(?s).*\\S.*", message = "모집 설명을 적어 주세요")
        @Size(max = 200, message = "모집 설명은 200자까지 적을 수 있어요")
        String description,

        @Pattern(regexp = "^https?://\\S+$", message = "http:// 또는 https://로 시작하는 주소를 적어 주세요")
        String accessUrl,

        @Size(min = 1, message = "카테고리를 하나 이상 골라 주세요")
        List<@NotNull(message = "카테고리를 하나 이상 골라 주세요")
             @Pattern(regexp = "^(web|mobile|game|api)$", message = "카테고리를 하나 이상 골라 주세요") String> softwareTypes,

        @Size(max = 500, message = "모집 조건은 500자까지 적을 수 있어요")
        String conditions,

        @Pattern(regexp = "^(firstCome|selection)$", message = "선정 방식을 골라 주세요")
        String selectionMode,

        LocalDate recruitDeadline,

        LocalDate submitDeadline
) {}
