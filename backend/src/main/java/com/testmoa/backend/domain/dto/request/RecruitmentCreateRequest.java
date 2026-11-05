package com.testmoa.backend.domain.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

/**
 * 모집 작성 요청. 규칙과 문구는 프론트 validateRecruitmentForm과 같다.
 * 날짜끼리 비교하는 규칙과 구독 여부는 서비스가 확인한다.
 * 형식 검사(@Pattern)는 빈 값을 통과시켜서, 빈 칸에는 "적어 주세요" 문구 하나만 나가게 한다
 */
public record RecruitmentCreateRequest(
        @NotBlank(message = "모집글 제목을 적어 주세요")
        @Size(max = 50, message = "모집글 제목은 50자까지 적을 수 있어요")
        String title,

        @NotBlank(message = "모집 설명을 적어 주세요")
        @Size(max = 200, message = "모집 설명은 200자까지 적을 수 있어요")
        String description,

        // 첫 지원 대상이 웹서비스라 web만 받는다
        @NotBlank(message = "유형을 골라 주세요")
        @Pattern(regexp = "^$|^web$", message = "지금은 웹서비스만 모집할 수 있어요")
        String softwareType,

        @NotBlank(message = "선정 방식을 골라 주세요")
        @Pattern(regexp = "^$|^(firstCome|selection)$", message = "선정 방식을 골라 주세요")
        String selectionMode,

        @NotBlank(message = "http:// 또는 https://로 시작하는 주소를 적어 주세요")
        @Pattern(regexp = "^$|^https?://\\S+$", message = "http:// 또는 https://로 시작하는 주소를 적어 주세요")
        String accessUrl,

        @Size(max = 500, message = "모집 조건은 500자까지 적을 수 있어요")
        String conditions,

        @NotNull(message = "모집 마감일을 골라 주세요")
        LocalDate recruitDeadline,

        @NotNull(message = "피드백 제출 마감일을 골라 주세요")
        LocalDate submitDeadline,

        @NotEmpty(message = "테스트 항목을 1개 이상 적어 주세요")
        @Size(max = 10, message = "테스트 항목은 10개까지 적을 수 있어요")
        List<@Valid TestItemRequest> testItems
) {

    /**
     * 테스트 항목 하나. 이미지는 없어도 된다
     */
    public record TestItemRequest(
            @NotBlank(message = "항목 이름을 적어 주세요")
            @Size(max = 50, message = "항목 이름은 50자까지 적을 수 있어요")
            String title,

            @Size(max = 300, message = "항목 설명은 300자까지 적을 수 있어요")
            String description,

            @NotNull(message = "필수 여부를 골라 주세요")
            Boolean required,

            @Size(max = 5, message = "이미지는 5장까지 올릴 수 있어요")
            List<@NotBlank(message = "이미지 주소를 확인해 주세요") String> imageUrls
    ) {}
}
