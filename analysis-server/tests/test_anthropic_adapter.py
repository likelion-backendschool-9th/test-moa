"""실제 AnthropicReviewLLM을 HTTP 계층만 가짜로 바꿔 테스트한다.

SDK 객체를 mock하지 않고 네트워크 응답만 흉내 내므로,
SDK의 실제 파싱·검증 경로가 그대로 실행된다.
"""

from __future__ import annotations

import json
from typing import Any

import anthropic
import httpx2
import pytest

from review_analysis.adapters.llm.anthropic_llm import AnthropicReviewLLM
from review_analysis.core.errors import LLMOutputError, UpstreamLLMError
from review_analysis.domain.enums import Category, Severity
from review_analysis.domain.models import Cluster, Feedback, ProjectContext

CTX = ProjectContext(project_title="앱", recruitment_title="v1 테스트", version=1)
FB = Feedback(feedback_id=1, user_id=1, content="로그인하면 꺼져요")
CLUSTER = Cluster(key="g1", members=(FB,), representative=FB, prompt_samples=(FB,))


def _llm(payload: Any, *, stop_reason: str = "end_turn", status: int = 200) -> AnthropicReviewLLM:
    def handler(_: httpx2.Request) -> httpx2.Response:
        if status != 200:
            return httpx2.Response(status, json={"type": "error", "error": {"type": "x"}})
        body = {
            "id": "msg_test",
            "type": "message",
            "role": "assistant",
            "model": "test",
            "content": [{"type": "text", "text": json.dumps(payload, ensure_ascii=False)}],
            "stop_reason": stop_reason,
            "stop_sequence": None,
            "usage": {"input_tokens": 10, "output_tokens": 10},
        }
        return httpx2.Response(200, json=body)

    client = anthropic.AsyncAnthropic(
        api_key="test",
        max_retries=0,
        http_client=httpx2.AsyncClient(transport=httpx2.MockTransport(handler)),
    )
    return AnthropicReviewLLM(client, label_model="m", reasoning_model="m")


@pytest.mark.anyio
async def test_parses_label_and_normalizes_lowercase_enum() -> None:
    llm = _llm(
        {
            "name": "로그인 시 앱 종료",
            "category": "bug",  # 소문자로 와도 정규화
            "severity": 1,
            "issue_title": "로그인 크래시",
            "issue_body": "## 현상",
        }
    )
    label = await llm.label_group(CTX, CLUSTER)

    assert label.category is Category.BUG
    assert label.severity is Severity.CRITICAL


@pytest.mark.anyio
async def test_praise_drops_stray_severity() -> None:
    llm = _llm({"name": "디자인 칭찬", "category": "PRAISE", "severity": 2})
    label = await llm.label_group(CTX, CLUSTER)

    assert label.category is Category.PRAISE
    assert label.severity is None


@pytest.mark.anyio
async def test_issue_without_severity_is_invalid_output() -> None:
    llm = _llm({"name": "x", "category": "BUG"})
    with pytest.raises(LLMOutputError):
        await llm.label_group(CTX, CLUSTER)


@pytest.mark.anyio
async def test_truncated_response_is_rejected() -> None:
    llm = _llm({"questions": ["a", "b", "c"]}, stop_reason="max_tokens")
    with pytest.raises(LLMOutputError):
        await llm.suggest_followups(CTX, FB)


@pytest.mark.anyio
async def test_api_error_maps_to_upstream_error() -> None:
    llm = _llm({}, status=529)
    with pytest.raises(UpstreamLLMError):
        await llm.suggest_followups(CTX, FB)


@pytest.mark.anyio
async def test_parses_grouping_response() -> None:
    llm = _llm(
        {
            "groups": [
                {"feedback_ids": [1, 2], "representative_feedback_id": 2},
                {"feedback_ids": [3]},
            ]
        }
    )
    groups = await llm.group_reviews(CTX, [FB])

    assert groups[0].feedback_ids == (1, 2)
    assert groups[0].representative_feedback_id == 2
    assert groups[1].representative_feedback_id is None
