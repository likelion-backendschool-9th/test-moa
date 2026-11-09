"""후속 질문 추천: 개발자가 복사해서 채팅으로 테스터에게 보낼 질문 3개."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from review_analysis.domain.models import Feedback, ProjectContext
    from review_analysis.ports.llm import ReviewLLM


class FollowupService:
    def __init__(self, llm: ReviewLLM) -> None:
        self._llm = llm

    async def suggest(self, context: ProjectContext, feedback: Feedback) -> list[str]:
        return await self._llm.suggest_followups(context, feedback)
