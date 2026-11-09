package com.testmoa.backend.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * 버전 비교에서 개발자가 고친 짝. 바꾼 이번 버전 그룹만 보내도 된다.
 * 그룹이 어느 버전 것인지와 같은 값이 두 번 오는지는 서비스에서 확인한다
 */
public record VersionLinksUpdateRequest(
        @NotEmpty(message = "고친 짝을 보내 주세요")
        List<@NotNull(message = "고친 짝을 확인해 주세요") @Valid Link> links
) {
    /**
     * 이번 버전 그룹 하나의 짝
     *
     * @param groupId         이번 버전 그룹
     * @param previousGroupId 이을 직전 버전 그룹. null이면 짝을 풀어 새로 생긴 그룹으로 둔다
     */
    public record Link(
            @NotNull(message = "그룹을 골라 주세요")
            Long groupId,

            Long previousGroupId
    ) {}
}
