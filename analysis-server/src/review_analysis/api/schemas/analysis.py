"""POST /v1/analyses — 1번 기능 계약."""

from __future__ import annotations

from typing import Annotated, Self

from pydantic import Field, StringConstraints, model_validator

from review_analysis.api.schemas.common import (
    MAX_FEEDBACK_CHARS,
    ApiModel,
    PositiveId,
    ProjectContextIn,
    ShortStr,
)
from review_analysis.domain.enums import Category, Severity
from review_analysis.domain.models import AnalysisResult, Feedback

FeedbackContent = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=MAX_FEEDBACK_CHARS)
]


class FeedbackIn(ApiModel):
    feedback_id: PositiveId
    user_id: PositiveId  # register.user_id — 테스터 수(중복 제외) 계산용
    content: FeedbackContent
    test_item_title: ShortStr | None = None

    def to_domain(self) -> Feedback:
        return Feedback(
            feedback_id=self.feedback_id,
            user_id=self.user_id,
            content=self.content,
            test_item_title=self.test_item_title,
        )


class AnalysisRequest(ApiModel):
    context: ProjectContextIn
    feedbacks: Annotated[list[FeedbackIn], Field(min_length=1, max_length=1000)]

    @model_validator(mode="after")
    def _unique_feedback_ids(self) -> Self:
        ids = [f.feedback_id for f in self.feedbacks]
        if len(ids) != len(set(ids)):
            msg = "feedbackId가 중복되었습니다"
            raise ValueError(msg)
        return self


class GroupOut(ApiModel):
    key: str = Field(description="응답 안에서만 쓰는 임시 키. 메인 백엔드가 저장 후 실제 ID로 대체")
    name: str
    category: Category
    improvement_rank: Severity | None = Field(
        description="1=치명 ~ 4=사소. PRAISE/UNCLASSIFIED는 null"
    )
    representative_feedback_id: int
    feedback_ids: list[int]
    git_issue_title: str | None
    git_issue_content: str | None


class AnalysisResponse(ApiModel):
    groups: list[GroupOut]
    analytics_summary: str | None = Field(
        description="리뷰 전체를 한 문장으로 요약한 분석. 의미 있는 그룹이 없으면 null"
    )
    praise_summary: str | None

    @classmethod
    def from_domain(cls, result: AnalysisResult) -> AnalysisResponse:
        return cls(
            groups=[
                GroupOut(
                    key=g.key,
                    name=g.label.name,
                    category=g.label.category,
                    improvement_rank=g.label.severity,
                    representative_feedback_id=g.representative_feedback_id,
                    feedback_ids=list(g.feedback_ids),
                    git_issue_title=g.label.issue_title,
                    git_issue_content=g.label.issue_body,
                )
                for g in result.groups
            ],
            analytics_summary=result.analytics_summary,
            praise_summary=result.praise_summary,
        )
