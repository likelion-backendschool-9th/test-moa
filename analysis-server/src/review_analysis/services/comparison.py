"""버전 간 비교: 직전 버전 vs 현재 버전."""

from __future__ import annotations

from typing import TYPE_CHECKING

import structlog

from review_analysis.domain.comparison import reconcile

if TYPE_CHECKING:
    from review_analysis.domain.models import ComparisonResult, VersionSnapshot
    from review_analysis.ports.llm import ReviewLLM

logger = structlog.get_logger(__name__)


class ComparisonService:
    def __init__(self, llm: ReviewLLM) -> None:
        self._llm = llm

    async def compare(
        self, previous: VersionSnapshot, current: VersionSnapshot
    ) -> ComparisonResult:
        if not previous.groups or not current.groups:
            # 한쪽이 비어 있으면 짝지을 것이 없다. LLM을 부를 필요가 없다.
            return reconcile(previous, current, [], summary="비교할 그룹이 부족합니다.")

        proposed, summary = await self._llm.match_versions(previous, current)
        result = reconcile(previous, current, proposed, summary)
        if result.dropped_match_count:
            logger.warning("invalid_matches_dropped", count=result.dropped_match_count)
        return result
