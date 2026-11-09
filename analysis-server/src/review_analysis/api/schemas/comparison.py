"""POST /v1/comparisons — 직전 버전 vs 현재 버전 비교 계약."""

from __future__ import annotations

from typing import Annotated, Self

from pydantic import Field, model_validator

from review_analysis.api.schemas.common import ApiModel, LongStr, PositiveId, ShortStr
from review_analysis.domain.enums import Category, Severity
from review_analysis.domain.models import ComparisonResult, GroupSnapshot, VersionSnapshot


class GroupSnapshotIn(ApiModel):
    group_id: PositiveId  # 실제 cluster_group_id
    name: ShortStr
    category: Category
    improvement_rank: Severity | None = None
    sample: LongStr | None = Field(default=None, description="대표 리뷰 본문 (짝짓기 정확도 향상)")

    def to_domain(self) -> GroupSnapshot:
        return GroupSnapshot(
            group_id=self.group_id,
            name=self.name,
            category=self.category,
            severity=self.improvement_rank,
            sample=self.sample,
        )


class VersionSnapshotIn(ApiModel):
    version: Annotated[int, Field(ge=1)]
    groups: Annotated[list[GroupSnapshotIn], Field(max_length=200)]

    def to_domain(self) -> VersionSnapshot:
        return VersionSnapshot(
            version=self.version, groups=tuple(g.to_domain() for g in self.groups)
        )


class ComparisonRequest(ApiModel):
    previous: VersionSnapshotIn
    current: VersionSnapshotIn

    @model_validator(mode="after")
    def _ordered_versions(self) -> Self:
        if self.previous.version >= self.current.version:
            msg = "previous.version은 current.version보다 작아야 합니다"
            raise ValueError(msg)
        return self


class GroupMatchOut(ApiModel):
    current_group_id: int
    previous_group_id: int


class ComparisonResponse(ApiModel):
    matches: list[GroupMatchOut] = Field(description="current 그룹 → 같은 문제인 previous 그룹")
    new_group_ids: list[int] = Field(description="이번 버전에 새로 나타난 그룹")
    not_reported_group_ids: list[int] = Field(
        description="이전 버전에 있었지만 이번 버전에서 보고되지 않은 그룹 ('해결됨'이 아님)"
    )
    summary: str

    @classmethod
    def from_domain(cls, result: ComparisonResult) -> ComparisonResponse:
        return cls(
            matches=[
                GroupMatchOut(
                    current_group_id=m.current_group_id, previous_group_id=m.previous_group_id
                )
                for m in result.matches
            ],
            new_group_ids=list(result.new_group_ids),
            not_reported_group_ids=list(result.not_reported_group_ids),
            summary=result.summary,
        )
