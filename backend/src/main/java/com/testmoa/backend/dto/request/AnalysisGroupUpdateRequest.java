package com.testmoa.backend.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * 분석 그룹 수정 요청. 보낸 값만 바꾸고 null은 그대로 둔다.
 * 칭찬·미분류 그룹에는 심각도와 이슈 초안을 보낼 수 없다(서비스에서 확인)
 */
public record AnalysisGroupUpdateRequest(
        // 보내면 비워 둘 수 없다. null은 그대로 둔다는 뜻이라 @NotBlank 대신 공백 아닌 글자가 있는지만 본다
        @Pattern(regexp = "(?s).*\\S.*", message = "그룹 이름을 적어 주세요")
        @Size(max = 255, message = "그룹 이름은 255자까지 적을 수 있어요")
        String name,

        @Min(value = 1, message = "심각도는 1~4 중에서 골라 주세요")
        @Max(value = 4, message = "심각도는 1~4 중에서 골라 주세요")
        Integer improvementRank,

        // 보내면 비워 둘 수 없다(null은 그대로). 컬럼이 255자라 GitHub 제한(256자)보다 1자 짧다
        @Pattern(regexp = "(?s).*\\S.*", message = "이슈 제목을 적어 주세요")
        @Size(max = 255, message = "이슈 제목은 255자까지 적을 수 있어요")
        String gitIssueTitle,

        // GitHub 본문 한도(65,536자)에서 근거와 리뷰 인용이 붙을 자리를 남긴다. 완성한 본문 길이는 등록할 때 다시 확인한다
        @Size(max = 60_000, message = "이슈 내용은 60,000자까지 적을 수 있어요")
        String gitIssueContent
) {}
