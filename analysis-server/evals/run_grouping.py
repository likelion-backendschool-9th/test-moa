"""리뷰 묶기 기준을 바꾸기 전후로 비교하는 평가 스크립트 (#283).

실제 Claude를 부르므로 비용이 든다(리뷰 40건 기준 1회에 묶기 1번 + 그룹 수만큼 라벨 호출).
테스트(pytest)에 넣지 않고 손으로 돌린다.

    uv run python evals/run_grouping.py [반복 횟수]

환경 변수 ANALYSIS_ANTHROPIC_API_KEY, ANALYSIS_INTERNAL_TOKEN이 필요하다.
"""

from __future__ import annotations

import asyncio
import json
import statistics
import sys
from pathlib import Path

from review_analysis.container import build_container
from review_analysis.core.config import get_settings
from review_analysis.domain.enums import Category
from review_analysis.domain.models import AnalysisResult, Feedback, ProjectContext

DATA = Path(__file__).with_name("grouping_reviews.json")


def _load() -> tuple[ProjectContext, list[Feedback]]:
    raw = json.loads(DATA.read_text(encoding="utf-8"))
    feedbacks = [
        Feedback(
            feedback_id=f["id"], user_id=f["user"], content=f["content"], test_item_title=f["item"]
        )
        for f in raw["feedbacks"]
    ]
    return ProjectContext(**raw["context"]), feedbacks


def _report(n: int, result: AnalysisResult, content: dict[int, str]) -> tuple[int, int, int]:
    named = [g for g in result.groups if g.label.category is not Category.UNCLASSIFIED]
    singletons = sum(1 for g in named if len(g.feedback_ids) == 1)
    unclassified = sum(
        len(g.feedback_ids) for g in result.groups if g.label.category is Category.UNCLASSIFIED
    )
    print(f"\n[{n}회] 그룹 {len(named)}개 · 1건 그룹 {singletons}개 · 미분류 리뷰 {unclassified}건")
    for g in result.groups:
        severity = g.label.severity.value if g.label.severity else "-"
        ids = list(g.feedback_ids)
        print(f"  {g.label.category:<12} 심각도 {severity}  {g.label.name}  ({len(ids)}건) {ids}")
        rep = g.representative_feedback_id
        print(f"      대표: #{rep} {content[rep]}")
    return len(named), singletons, unclassified


async def _run(runs: int) -> list[tuple[int, int, int]]:
    context, feedbacks = _load()
    content = {f.feedback_id: f.content for f in feedbacks}
    container = build_container(get_settings())
    try:
        return [
            _report(n + 1, await container.analysis.analyze(context, feedbacks), content)
            for n in range(runs)
        ]
    finally:
        await container.aclose()


def main() -> None:
    runs = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    stats = asyncio.run(_run(runs))
    groups, singles, leftover = (statistics.mean(col) for col in zip(*stats, strict=True))
    print(f"\n평균: 그룹 {groups:.1f}개 · 1건 그룹 {singles:.1f}개 · 미분류 리뷰 {leftover:.1f}건")


if __name__ == "__main__":
    main()
