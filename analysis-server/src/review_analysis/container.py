"""컴포지션 루트: 구현체를 만들고 서로 연결하는 유일한 장소.

모듈 수준 전역 객체(예: 파일 맨 위의 ``client = Anthropic()``)를 두지 않는다.
전역 객체는 import만 해도 생성되어 테스트에서 바꿔 끼우기 어렵고, 설정이 언제 읽히는지 불분명해진다.
"""

from __future__ import annotations

from dataclasses import dataclass, replace
from typing import TYPE_CHECKING

import anthropic

from review_analysis.adapters.llm.anthropic_llm import AnthropicReviewLLM
from review_analysis.domain.clustering import ClusteringOptions
from review_analysis.services.analysis import AnalysisService
from review_analysis.services.comparison import ComparisonService
from review_analysis.services.followup import FollowupService

if TYPE_CHECKING:
    from review_analysis.core.config import Settings
    from review_analysis.ports.llm import ReviewLLM


@dataclass(frozen=True, slots=True, kw_only=True)
class Container:
    analysis: AnalysisService
    comparison: ComparisonService
    followup: FollowupService
    anthropic_client: anthropic.AsyncAnthropic | None = None

    async def aclose(self) -> None:
        if self.anthropic_client is not None:
            await self.anthropic_client.close()


def wire(settings: Settings, *, llm: ReviewLLM) -> Container:
    """포트 구현체를 받아 서비스를 조립한다. 테스트에서는 가짜 구현체를 넘긴다."""
    return Container(
        analysis=AnalysisService(
            llm,
            clustering=ClusteringOptions(
                max_groups=settings.max_groups,
                samples_per_group=settings.prompt_samples_per_group,
            ),
            llm_concurrency=settings.llm_concurrency,
        ),
        comparison=ComparisonService(llm),
        followup=FollowupService(llm),
    )


def build_container(settings: Settings) -> Container:
    """운영용 조립: 실제 Claude."""
    client = anthropic.AsyncAnthropic(
        api_key=settings.anthropic_api_key.get_secret_value(),
        timeout=settings.llm_timeout_seconds,
        max_retries=settings.llm_max_retries,
    )
    llm = AnthropicReviewLLM(
        client,
        label_model=settings.label_model,
        reasoning_model=settings.reasoning_model,
        grouping_max_tokens=settings.grouping_max_tokens,
    )
    return replace(wire(settings, llm=llm), anthropic_client=client)
