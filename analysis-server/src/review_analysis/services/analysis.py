"""1번 기능: 리뷰 묶기 + 우선순위(심각도) + GitHub 이슈 초안 + 칭찬 요약."""

from __future__ import annotations

import asyncio
from typing import TYPE_CHECKING

import structlog

from review_analysis.core.errors import AnalysisError, LLMOutputError
from review_analysis.domain.clustering import ClusteringOptions, build_clusters
from review_analysis.domain.enums import Category
from review_analysis.domain.models import AnalysisResult, AnalyzedGroup, GroupLabel

if TYPE_CHECKING:
    from collections.abc import Sequence

    from review_analysis.domain.models import Cluster, Feedback, ProjectContext
    from review_analysis.ports.llm import ReviewLLM

logger = structlog.get_logger(__name__)


class AnalysisService:
    def __init__(
        self,
        llm: ReviewLLM,
        *,
        clustering: ClusteringOptions,
        llm_concurrency: int,
    ) -> None:
        self._llm = llm
        self._clustering = clustering
        self._llm_concurrency = llm_concurrency

    async def analyze(
        self, context: ProjectContext, feedbacks: Sequence[Feedback]
    ) -> AnalysisResult:
        # 1) Claude가 의미로 묶고  2) 코드가 검증한다 (없는 ID 제거, 빠진 리뷰는 미분류로)
        proposals = await self._llm.group_reviews(context, feedbacks)
        clusters = build_clusters(feedbacks, proposals, self._clustering)
        labels = await self._label_all(context, clusters)

        groups = tuple(
            AnalyzedGroup(
                key=c.key,
                label=labels[c.key],
                feedback_ids=tuple(m.feedback_id for m in c.members),
                representative_feedback_id=c.representative.feedback_id,
            )
            for c in clusters
        )
        praise_summary = await self._summarize_praise(context, clusters, labels)
        analytics_summary = await self._summarize_overall(context, clusters, labels)

        logger.info(
            "analysis_done",
            feedback_count=len(feedbacks),
            group_count=len(groups),
            version=context.version,
        )
        return AnalysisResult(
            groups=groups, analytics_summary=analytics_summary, praise_summary=praise_summary
        )

    async def _label_all(
        self, context: ProjectContext, clusters: Sequence[Cluster]
    ) -> dict[str, GroupLabel]:
        """그룹별 LLM 호출을 동시에 실행하되, 동시 호출 수는 세마포어로 제한한다.

        제한이 없으면 그룹 40개 → 동시 40건 호출로 Claude API rate limit(429)에 바로 걸린다.
        """
        semaphore = asyncio.Semaphore(self._llm_concurrency)
        results: dict[str, GroupLabel] = {}

        async def label_one(cluster: Cluster) -> None:
            if cluster.is_leftover:
                results[cluster.key] = GroupLabel.unclassified("미분류")
                return
            async with semaphore:
                try:
                    results[cluster.key] = await self._llm.label_group(context, cluster)
                except LLMOutputError:
                    # 특정 그룹의 응답만 이상한 경우: 전체 분석을 버리지 않고 미분류로 남긴다.
                    # (API 장애인 UpstreamLLMError는 여기서 잡지 않아 전체가 실패 → 메인이 재시도)
                    logger.warning("group_label_fallback", group=cluster.key)
                    results[cluster.key] = GroupLabel.unclassified("분석 실패 (재분석 필요)")

        # TaskGroup: 하나라도 예외가 나면 나머지 작업을 취소한다 (asyncio.gather보다 안전).
        try:
            async with asyncio.TaskGroup() as tg:
                for cluster in clusters:
                    tg.create_task(label_one(cluster))
        except* AnalysisError as group:
            raise group.exceptions[0] from None
        return results

    async def _summarize_overall(
        self,
        context: ProjectContext,
        clusters: Sequence[Cluster],
        labels: dict[str, GroupLabel],
    ) -> str | None:
        """리뷰 전체를 한 문장으로. 심각도 순(같으면 테스터 많은 순)으로 그룹을 넘긴다.

        미분류만 남았으면 요약할 거리가 없어 None이다.
        """
        groups = sorted(
            (
                (labels[c.key], c)
                for c in clusters
                if labels[c.key].category is not Category.UNCLASSIFIED
            ),
            key=lambda pair: (
                pair[0].severity.value if pair[0].severity else 99,
                -pair[1].tester_count,
            ),
        )
        if not groups:
            return None
        try:
            return await self._llm.summarize_overall(context, groups)
        except LLMOutputError:
            # 한 문장 요약이 이상하다고 묶은 결과까지 버리지 않는다. (API 장애는 그대로 올려 재시도)
            logger.warning("overall_summary_fallback")
            return None

    async def _summarize_praise(
        self,
        context: ProjectContext,
        clusters: Sequence[Cluster],
        labels: dict[str, GroupLabel],
    ) -> str | None:
        praises = [
            sample
            for c in clusters
            if labels[c.key].category is Category.PRAISE
            for sample in c.prompt_samples
        ]
        if not praises:
            return None
        return await self._llm.summarize_praise(
            context, praises[: self._clustering.samples_per_group * 3]
        )
