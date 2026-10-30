package com.testmoa.backend.domain.dto.request;

import com.testmoa.backend.domain.entity.Sample;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 예시 데이터 생성, 수정 시 필요한 정보를 받아오는 DTO
 *
 * 수정 시에는 null이 아닌 값만 반영
 */
@Getter
@NoArgsConstructor
public class SampleSaveRequest {
    private String temp1;
    private String temp2;

    public Sample toEntity(){

        return Sample.builder()
                .temp1(temp1)
                .temp2(temp2)
                .build();
    }
}
