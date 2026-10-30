package com.testmoa.backend.domain.dto.response;

import com.testmoa.backend.domain.entity.Sample;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * 예시 데이터 정보를 제공하는 DTO
 */
@Getter
@Builder
public class SampleResponse {
    private Long id;
    private String temp1;
    private String temp2;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static SampleResponse of(Sample sample){
        return SampleResponse.builder()
                .id(sample.getId())
                .temp1(sample.getTemp1())
                .temp2(sample.getTemp2())
                .createdAt(sample.getCreatedAt())
                .updatedAt(sample.getUpdatedAt())
                .build();
    }
}
