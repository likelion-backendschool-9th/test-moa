package com.testmoa.backend.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * 테스트 항목 전체를 보낸 순서대로 맞춘다. 빠진 항목은 지우고, id가 없는 항목은 새로 만든다
 */
public record TestItemsUpdateRequest(
        @NotEmpty(message = "테스트 항목을 1개 이상 적어 주세요")
        @Size(max = 10, message = "테스트 항목은 10개까지 적을 수 있어요")
        List<@NotNull(message = "테스트 항목을 확인해 주세요") @Valid Item> testItems
) {
    /**
     * 테스트 항목 하나. 이미지는 그대로 둔다
     *
     * @param id 기존 항목 id. 새 항목은 null
     */
    public record Item(
            Long id,

            @NotBlank(message = "항목 이름을 적어 주세요")
            @Size(max = 50, message = "항목 이름은 50자까지 적을 수 있어요")
            String title,

            @Size(max = 300, message = "항목 설명은 300자까지 적을 수 있어요")
            String description,

            @NotNull(message = "필수 여부를 골라 주세요")
            Boolean required
    ) {}
}
