"""테스트용 가짜 구현체.

포트(Protocol)를 만족하기만 하면 되므로, 실제 Claude 호출 없이
빠르고 결정적인 테스트를 할 수 있다. (Mockito 대신 직접 만든 Fake 객체)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING

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

# 키워드가 같은 리뷰끼리 묶는다. Claude의 판단을 흉내 낸 것.
TOPICS: tuple[str, ...] = ("로그인", "사진", "좋아요", "결제")


@dataclass
class FakeLLM:
    fail_with: Exception | None = None
    proposed_matches: list[GroupMatch] = field(default_factory=list)
    # 지정하면 group_reviews가 이 값을 그대로 돌려준다 (잘못된 응답 흉내용)
    proposed_groups: list[ProposedGroup] | None = None
    group_fail_with: Exception | None = None
    overall_fail_with: Exception | None = None
    praise_fail_with: Exception | None = None
    calls: list[str] = field(default_factory=list)

    async def group_reviews(
        self, context: ProjectContext, feedbacks: Sequence[Feedback]
    ) -> list[ProposedGroup]:
        self.calls.append("group")
        if self.group_fail_with:
            raise self.group_fail_with
        if self.proposed_groups is not None:
            return list(self.proposed_groups)
        by_topic: dict[str, list[int]] = {}
        for f in feedbacks:
            topic = next((t for t in TOPICS if t in f.content), f"single-{f.feedback_id}")
            by_topic.setdefault(topic, []).append(f.feedback_id)
        return [ProposedGroup(feedback_ids=tuple(ids)) for ids in by_topic.values()]

    async def label_group(self, context: ProjectContext, cluster: Cluster) -> GroupLabel:
        self.calls.append("label")
        if self.fail_with:
            raise self.fail_with
        text = cluster.representative.content
        if "좋아요" in text:
            return GroupLabel(name="칭찬", category=Category.PRAISE)
        return GroupLabel(
            name=text[:20],
            category=Category.BUG,
            severity=Severity.CRITICAL if "꺼" in text else Severity.MINOR,
            issue_title=f"[버그] {text[:20]}",
            issue_body="## 현상\n...",
        )

    async def summarize_praise(self, context: ProjectContext, praises: Sequence[Feedback]) -> str:
        self.calls.append("praise")
        if self.praise_fail_with:
            raise self.praise_fail_with
        return f"칭찬 {len(praises)}건 요약"

    async def summarize_overall(
        self, context: ProjectContext, groups: Sequence[tuple[GroupLabel, Cluster]]
    ) -> str:
        self.calls.append("overall")
        if self.overall_fail_with:
            raise self.overall_fail_with
        # 맨 앞(가장 심각한) 그룹 이름을 돌려줘 정렬을 확인할 수 있게 한다
        return f"{groups[0][0].name} 먼저 확인"

    async def match_versions(
        self, previous: VersionSnapshot, current: VersionSnapshot
    ) -> tuple[list[GroupMatch], str]:
        self.calls.append("match")
        return list(self.proposed_matches), "변화 요약"

    async def suggest_followups(self, context: ProjectContext, feedback: Feedback) -> list[str]:
        self.calls.append("followup")
        return ["질문1", "질문2", "질문3"]
