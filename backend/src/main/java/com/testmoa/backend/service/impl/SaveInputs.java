package com.testmoa.backend.service.impl;

import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import com.testmoa.backend.global.file.FileStorage;

import java.util.List;
import java.util.Map;

/**
 * 프로젝트·모집 저장이 함께 쓰는 입력 정리와 칸별 오류(#289)
 */
final class SaveInputs {
    private SaveInputs() {}

    static void checkImageUrl(String field, String url) {
        if (url != null && !url.isBlank() && !FileStorage.isImageUrl(url)) {
            throw invalid(field, "이미지 주소를 확인해 주세요");
        }
    }

    static void checkImageUrls(String field, List<String> urls) {
        if (urls == null) return;
        for (int index = 0; index < urls.size(); index++) checkImageUrl(field + "[" + index + "]", urls.get(index));
    }

    static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    static BusinessException invalid(String field, String message) {
        return new BusinessException(ErrorCode.INVALID_INPUT, ErrorCode.INVALID_INPUT.getMessage(), Map.of(field, message));
    }
}
