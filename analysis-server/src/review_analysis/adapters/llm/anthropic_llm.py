"""Claude(Anthropic SDK) 어댑터.

- 구조화 출력: ``messages.parse(output_format=PydanticModel)``로 받는다.
  "JSON으로 답해줘"라고 부탁한 뒤 문자열을 파싱하는 방식보다 스키마 준수가 보장된다.
- 네트워크 오류·429·529 재시도는 SDK의 ``max_retries``(지수 백오프)에 맡긴다.
- SDK 예외는 여기서 도메인 예외로 바꿔, 바깥 계층이 anthropic 패키지를 모르게 한다.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Annotated

import anthropic
import structlog
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

from review_analysis.adapters.llm import prompts
from review_analysis.core.errors import LLMOutputError, UpstreamLLMError
from review_analysis.domain.enums import Category, Severity
from review_analysis.domain.models import GroupLabel, GroupMatch, ProposedGroup

if TYPE_CHECKING:
    from collections.abc import Sequence

    from review_analysis.domain.models import (
        Cluster,
        Feedback,
        ProjectContext,
        VersionSnapshot,
    )

logger = structlog.get_logger(__name__)


# ───────────── LLM 응답 스키마 (어댑터 내부 전용, 외부 API 스키마와 분리) ─────────────


class _LLMOut(BaseModel):
    model_config = ConfigDict(frozen=True, extra="ignore")


def _upper(v: object) -> object:
    """LLM이 enum 값을 소문자로 돌려주는 경우가 있어 대문자로 정규화."""
    return v.upper() if isinstance(v, str) else v


class _GroupOut(_LLMOut):
    feedback_ids: list[int]
    representative_feedback_id: int | None = None


class _GroupingOut(_LLMOut):
    groups: list[_GroupOut]


class _GroupLabelOut(_LLMOut):
    name: Annotated[str, Field(max_length=60)]
    category: Category
    severity: Severity | None = None
    issue_title: Annotated[str | None, Field(max_length=120)] = None
    issue_body: str | None = None

    _norm_category = field_validator("category", mode="before")(_upper)


class _SummaryOut(_LLMOut):
    """한 문장 요약 (칭찬 요약, 리뷰 전체 요약)."""

    summary: Annotated[str, Field(max_length=200)]


class _MatchOut(_LLMOut):
    current_group_id: int
    previous_group_id: int


class _ComparisonOut(_LLMOut):
    matches: list[_MatchOut]
    summary: str


class _FollowupOut(_LLMOut):
    questions: Annotated[list[str], Field(min_length=3, max_length=3)]


# ─────────────────────────── 어댑터 ───────────────────────────


class AnthropicReviewLLM:
    def __init__(
        self,
        client: anthropic.AsyncAnthropic,
        *,
        label_model: str,
        reasoning_model: str,
        grouping_max_tokens: int = 8000,
    ) -> None:
        self._client = client
        self._label_model = label_model
        self._reasoning_model = reasoning_model
        self._grouping_max_tokens = grouping_max_tokens

    async def group_reviews(
        self, context: ProjectContext, feedbacks: Sequence[Feedback]
    ) -> list[ProposedGroup]:
        # 묶기는 결과 품질을 좌우하는 판단이라 상위 모델을 쓴다. 호출은 분석당 1번뿐이다.
        reviews = prompts.render_reviews(feedbacks, with_ids=True)
        user = f"{prompts.render_context(context)}\n\n{reviews}"
        out = await self._parse(
            model=self._reasoning_model,
            system=prompts.GROUP_SYSTEM,
            user=user,
            schema=_GroupingOut,
            max_tokens=self._grouping_max_tokens,
        )
        return [
            ProposedGroup(
                feedback_ids=tuple(g.feedback_ids),
                representative_feedback_id=g.representative_feedback_id,
            )
            for g in out.groups
        ]

    async def label_group(self, context: ProjectContext, cluster: Cluster) -> GroupLabel:
        user = (
            f"{prompts.render_context(context)}\n\n"
            f"이 그룹에 속한 리뷰 수: {len(cluster.members)}, 서로 다른 테스터 수: "
            f"{cluster.tester_count}\n\n"
            f"{prompts.render_reviews(cluster.prompt_samples)}"
        )
        out = await self._parse(
            model=self._label_model,
            system=prompts.LABEL_SYSTEM,
            user=user,
            schema=_GroupLabelOut,
            max_tokens=1500,
        )
        return _to_group_label(out)

    async def summarize_praise(self, context: ProjectContext, praises: Sequence[Feedback]) -> str:
        user = f"{prompts.render_context(context)}\n\n{prompts.render_reviews(praises)}"
        out = await self._parse(
            model=self._label_model,
            system=prompts.PRAISE_SYSTEM,
            user=user,
            schema=_SummaryOut,
            max_tokens=400,
        )
        return out.summary.strip()

    async def summarize_overall(
        self, context: ProjectContext, groups: Sequence[tuple[GroupLabel, Cluster]]
    ) -> str:
        user = f"{prompts.render_context(context)}\n\n{prompts.render_group_digest(groups)}"
        out = await self._parse(
            model=self._label_model,
            system=prompts.OVERALL_SYSTEM,
            user=user,
            schema=_SummaryOut,
            max_tokens=400,
        )
        return out.summary.strip()

    async def match_versions(
        self, previous: VersionSnapshot, current: VersionSnapshot
    ) -> tuple[list[GroupMatch], str]:
        out = await self._parse(
            model=self._reasoning_model,
            system=prompts.MATCH_SYSTEM,
            user=prompts.render_versions(previous, current),
            schema=_ComparisonOut,
            max_tokens=2000,
        )
        matches = [
            GroupMatch(current_group_id=m.current_group_id, previous_group_id=m.previous_group_id)
            for m in out.matches
        ]
        return matches, out.summary.strip()

    async def suggest_followups(self, context: ProjectContext, feedback: Feedback) -> list[str]:
        user = f"{prompts.render_context(context)}\n\n{prompts.render_reviews([feedback])}"
        out = await self._parse(
            model=self._label_model,
            system=prompts.FOLLOWUP_SYSTEM,
            user=user,
            schema=_FollowupOut,
            max_tokens=600,
        )
        return [q.strip() for q in out.questions]

    # ─────────────────────── 공통 호출 ───────────────────────

    async def _parse[T: BaseModel](
        self,
        *,
        model: str,
        system: str,
        user: str,
        schema: type[T],
        max_tokens: int,
    ) -> T:
        try:
            response = await self._client.messages.parse(
                model=model,
                max_tokens=max_tokens,
                system=system,
                messages=[{"role": "user", "content": user}],
                output_format=schema,
            )
        except anthropic.APIStatusError as exc:
            raise UpstreamLLMError(f"Claude API 오류 (status={exc.status_code})") from exc
        except anthropic.APIError as exc:  # 연결 실패, 타임아웃 등
            raise UpstreamLLMError(f"Claude API 호출 실패: {type(exc).__name__}") from exc
        except ValidationError as exc:
            raise LLMOutputError("응답이 스키마 제약을 만족하지 않습니다") from exc

        logger.debug(
            "llm_call",
            model=model,
            schema=schema.__name__,
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
        )
        # 거절(refusal)이나 토큰 한도 초과로 잘린 응답은 스키마를 지키지 않을 수 있다.
        if response.stop_reason in {"refusal", "max_tokens"} or response.parsed_output is None:
            raise LLMOutputError(f"사용할 수 없는 응답 (stop_reason={response.stop_reason})")
        return response.parsed_output


def _to_group_label(out: _GroupLabelOut) -> GroupLabel:
    """LLM 출력 → 도메인 객체. 사소한 불일치는 보정하고, 핵심 누락은 오류로 처리한다."""
    if not out.category.is_issue:
        # PRAISE/UNCLASSIFIED에 심각도를 붙여 보내는 경우가 있다 → 버린다.
        return GroupLabel(name=out.name, category=out.category)
    try:
        return GroupLabel(
            name=out.name,
            category=out.category,
            severity=out.severity,
            issue_title=out.issue_title,
            issue_body=out.issue_body,
        )
    except ValueError as exc:
        raise LLMOutputError(str(exc)) from exc
