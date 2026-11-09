package com.testmoa.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 프로젝트에 GitHub 레포 연결(#227). 레포는 owner/repo나 GitHub 주소로 받고, 토큰은 그 레포에 이슈를 만들 수 있는 것이어야 한다.
 * 연결을 바꿀 때도 레포와 토큰을 함께 보낸다
 */
public record RepositoryConnectRequest(
        @NotBlank(message = "GitHub 저장소를 적어 주세요")
        @Size(max = 200, message = "저장소는 200자까지 적을 수 있어요")
        String repository,

        @NotBlank(message = "GitHub 토큰을 적어 주세요")
        @Size(max = 255, message = "토큰은 255자까지 적을 수 있어요")
        String token
) {}
