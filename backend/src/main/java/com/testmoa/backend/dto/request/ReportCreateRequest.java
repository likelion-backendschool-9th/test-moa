package com.testmoa.backend.dto.request;

import com.testmoa.backend.entity.enums.ReportTargetType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * 신고 접수(multipart의 글 칸). 증거 파일은 files로 따로 받는다.
 * 대상: 모집 글·회원은 targetId, 채팅은 roomKey(채팅은 밖으로 방 id를 쓰지 않는다)
 */
public record ReportCreateRequest(
        @NotNull(message = "신고할 대상을 골라 주세요")
        ReportTargetType targetType,

        Long targetId,

        String roomKey,

        @NotBlank(message = "신고 사유를 적어 주세요")
        @Size(max = 1000, message = "신고 사유는 1,000자까지 적을 수 있어요")
        String reason
) {}
