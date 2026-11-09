package com.testmoa.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * 운영자 무료 플랜 저장 본문. 혜택 항목이 비었거나 쉼표를 담았는지는 서비스에서 본다(쉼표로 이어 저장하기 때문).
 * 구독 플랜 등록({@link PlanCreateRequest})과 같은 상한을 쓴다.
 */
public record FreePlanUpdateRequest(
        @NotBlank(message = "무료 플랜 이름을 입력해 주세요")
        @Size(max = 255, message = "무료 플랜 이름은 255자까지 쓸 수 있어요")
        String tier,

        @Size(max = 10, message = "혜택은 10개까지 쓸 수 있어요")
        List<@Size(max = 100, message = "혜택 문구는 100자까지 쓸 수 있어요") String> benefits
) {}
