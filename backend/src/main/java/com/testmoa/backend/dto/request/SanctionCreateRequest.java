package com.testmoa.backend.dto.request;

import com.testmoa.backend.entity.enums.Restriction;
import com.testmoa.backend.entity.enums.SanctionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.Set;

/**
 * 운영자 제재(#86). 기간 정지는 days(1~3650)와 막을 기능, 영구 정지는 막을 기능, 경고는 사유만 받는다. 조합 검사는 서비스가 한다
 */
public record SanctionCreateRequest(
        @NotNull(message = "제재 종류를 골라 주세요")
        SanctionType type,

        Integer days,

        Set<Restriction> restrictions,

        @NotBlank(message = "제재 사유를 적어 주세요")
        @Size(max = 1000, message = "제재 사유는 1,000자까지 적을 수 있어요")
        String reason
) {}
