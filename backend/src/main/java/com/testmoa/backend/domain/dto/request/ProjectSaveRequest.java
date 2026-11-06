package com.testmoa.backend.domain.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 프로젝트 등록·수정 요청. 규칙과 문구는 프론트 validateProjectForm과 같다.
 * 수정은 보낸 값으로 모두 바꾼다. 설명과 이미지를 비워 보내면 지워진다
 */
public record ProjectSaveRequest(
        @NotBlank(message = "프로젝트 이름을 적어 주세요")
        @Size(max = 50, message = "이름은 50자까지 적을 수 있어요")
        String name,

        @Size(max = 2000, message = "상세 설명은 2000자까지 적을 수 있어요")
        String description,

        String imageUrl
) {}
