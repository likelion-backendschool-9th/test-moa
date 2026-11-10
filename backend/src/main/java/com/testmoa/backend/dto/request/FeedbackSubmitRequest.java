package com.testmoa.backend.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * 항목별 피드백 제출(#118, #119). 필수 항목은 비울 수 없고, 선택 항목과 기타 의견은 비우면 저장하지 않는다.
 * 이미지 장수와 주소는 요청 값 검사가 아니라 서비스가 본다. 칸 이름(testItems.{id}, etc)으로 알려야 하기 때문이다
 *
 * @param items         테스트 항목별 내용. 비어 있는 항목은 빼고 보내도 된다
 * @param etc           기타 의견. 없으면 null이나 빈 문자열
 * @param etcImageUrls  기타 의견 이미지 주소. 없으면 null이고 서비스는 빈 목록으로 본다
 */
public record FeedbackSubmitRequest(
        @Size(max = 10, message = "테스트 항목을 확인해 주세요")
        List<@NotNull(message = "테스트 항목을 확인해 주세요") @Valid Item> items,

        @Size(max = 500, message = "500자까지 적을 수 있어요")
        String etc,

        List<String> etcImageUrls
) {
    public record Item(
            @NotNull(message = "테스트 항목을 확인해 주세요")
            Long testItemId,

            @Size(max = 500, message = "500자까지 적을 수 있어요")
            String content,

            List<String> imageUrls
    ) {}
}
