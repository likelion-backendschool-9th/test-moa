package com.testmoa.backend.global.common;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;

/**
 * 공통 응답 DTO
 *
 * @param <T>
 */
@Getter
public class ApiResponse<T> {
    private final boolean success;
    private final T data;

    @JsonCreator
    private ApiResponse(@JsonProperty("success") boolean success,
                        @JsonProperty("data") T data
    ) {
        this.success = success;
        this.data = data;
    }


    // 데이터 전송 성공
    public static <T> ApiResponse<T> ok(T data){
        return new ApiResponse<>(true, data);
    }

    // 단순 완료
    public static ApiResponse<Void> ok() {
        return new ApiResponse<>(true, null);
    }
}
