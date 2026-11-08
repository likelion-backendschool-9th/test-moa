package com.testmoa.backend.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * 운영자 플랜 등록 본문. version은 서버가 정한다.
 * 혜택 항목이 비었거나 쉼표를 담았는지는 서비스에서 본다(쉼표로 이어 저장하기 때문).
 * 이용 기간과 혜택에 상한을 둔다. 상한이 없으면 아주 큰 기간으로 결제(#71)의 만료 시각이 DB 날짜 범위를 넘을 수 있다.
 */
public record PlanCreateRequest(
        @NotBlank(message = "등급 이름을 입력해 주세요")
        @Size(max = 255, message = "등급 이름은 255자까지 쓸 수 있어요")
        String tier,

        @NotNull(message = "현금 가격을 입력해 주세요")
        @Min(value = 0, message = "현금 가격은 0 이상이에요")
        Integer cashPrice,

        @NotNull(message = "크레딧 가격을 입력해 주세요")
        @Min(value = 0, message = "크레딧 가격은 0 이상이에요")
        Integer creditPrice,

        @NotNull(message = "이용 기간을 입력해 주세요")
        @Min(value = 1, message = "이용 기간은 1일 이상이에요")
        @Max(value = 3650, message = "이용 기간은 3650일까지 쓸 수 있어요")
        Integer periodDays,

        @Size(max = 10, message = "혜택은 10개까지 쓸 수 있어요")
        List<@Size(max = 100, message = "혜택 문구는 100자까지 쓸 수 있어요") String> benefits
) {}
