package com.testmoa.backend.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * 항목별 피드백 제출(#118). 필수 항목은 비울 수 없고, 선택 항목과 기타 의견은 비우면 저장하지 않는다. 그 판단은 서비스가 한다
 *
 * @param items 테스트 항목별 내용. 비어 있는 항목은 빼고 보내도 된다
 * @param etc   기타 의견. 없으면 null이나 빈 문자열
 */
public record FeedbackSubmitRequest(
        @Size(max = 10, message = "테스트 항목을 확인해 주세요")
        List<@NotNull(message = "테스트 항목을 확인해 주세요") @Valid Item> items,

        @Size(max = 500, message = "500자까지 적을 수 있어요")
        String etc
) {
    public record Item(
            @NotNull(message = "테스트 항목을 확인해 주세요")
            Long testItemId,

            @Size(max = 500, message = "500자까지 적을 수 있어요")
            String content
    ) {}
}
