"""LLM 포트.

"Claude에게 무엇을 물어보는가"를 비즈니스 용어로 정의한다.
프롬프트·SDK·재시도 같은 세부 사항은 어댑터가 숨긴다.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Protocol

if TYPE_CHECKING:
    from collections.abc import Sequence

    from review_analysis.domain.models import (
        Cluster,
        Feedback,
        GroupLabel,
        GroupMatch,
        ProjectContext,
        ProposedGroup,
        VersionSnapshot,
    )


class ReviewLLM(Protocol):
    async def group_reviews(
        self, context: ProjectContext, feedbacks: Sequence[Feedback]
    ) -> list[ProposedGroup]:
        """같은 문제를 말하는 리뷰끼리 묶는다. 결과는 검증 전 '제안'이다."""
        ...

    async def label_group(self, context: ProjectContext, cluster: Cluster) -> GroupLabel:
        """그룹 이름 · 카테고리 · 심각도 · GitHub 이슈 초안."""
        ...

    async def summarize_praise(self, context: ProjectContext, praises: Sequence[Feedback]) -> str:
        """칭찬 리뷰 한 줄 요약."""
        ...

    async def summarize_overall(
        self, context: ProjectContext, groups: Sequence[tuple[GroupLabel, Cluster]]
    ) -> str:
        """리뷰 전체를 한 문장으로 요약한 분석. 개발자가 먼저 볼 것을 앞에 둔다.

        groups는 심각도 순으로 정렬된 (라벨, 그룹) 목록이다.
        """
        ...

    async def match_versions(
        self, previous: VersionSnapshot, current: VersionSnapshot
    ) -> tuple[list[GroupMatch], str]:
        """버전 간 같은 문제 그룹 매칭 + 변화 요약 문장."""
        ...

    async def suggest_followups(self, context: ProjectContext, feedback: Feedback) -> list[str]:
        """테스터에게 물어볼 후속 질문 3개."""
        ...
