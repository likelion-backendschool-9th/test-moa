package com.testmoa.backend.dto.request;

import jakarta.validation.constraints.NotNull;

/** 멈춘 환불을 정리하는 요청(#281). 운영자가 PG 가맹점 화면에서 확인한 취소 여부를 넘긴다 */
public record AdminRefundResolveRequest(
        @NotNull(message = "PG에서 취소됐는지 알려 주세요")
        Boolean canceled
) {}
