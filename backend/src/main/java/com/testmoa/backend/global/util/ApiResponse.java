package com.testmoa.backend.global.util;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.testmoa.backend.global.exception.ErrorCode;
import lombok.Getter;

import java.util.Map;

/**
 * 공통 응답 DTO
 *
 * 성공: {"success": true, "data": ...}
 * 실패: {"success": false, "data": null, "error": {"code": "EMAIL_TAKEN", "message": "...", "fields": {...}}}
 *
 * @param <T>
 */
@Getter
public class ApiResponse<T> {
    private final boolean success;
    private final T data;

    // 실패했을 때만 내려간다. 성공 응답 모양은 그대로 둔다
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private final Error error;

    @JsonCreator
    private ApiResponse(@JsonProperty("success") boolean success,
                        @JsonProperty("data") T data,
                        @JsonProperty("error") Error error
    ) {
        this.success = success;
        this.data = data;
        this.error = error;
    }


    // 데이터 전송 성공
    public static <T> ApiResponse<T> ok(T data){
        return new ApiResponse<>(true, data, null);
    }

    // 단순 완료
    public static ApiResponse<Void> ok() {
        return new ApiResponse<>(true, null, null);
    }

    // 실패. 문구는 에러 코드의 기본 문구
    public static ApiResponse<Void> fail(ErrorCode code) {
        return fail(code, code.getMessage(), null);
    }

    // 실패. fields는 입력 칸별 오류 문구(칸 이름 → 문구), 없으면 null
    public static ApiResponse<Void> fail(ErrorCode code, String message, Map<String, String> fields) {
        return new ApiResponse<>(false, null, new Error(code.name(), message, fields));
    }

    /**
     * 실패 내용. 프론트는 code를 보고 화면 문구를 고른다
     */
    public record Error(
            String code,
            String message,
            @JsonInclude(JsonInclude.Include.NON_NULL) Map<String, String> fields
    ) {}
}
