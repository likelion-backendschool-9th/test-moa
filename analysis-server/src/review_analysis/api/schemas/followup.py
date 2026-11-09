"""POST /v1/followup-questions — 후속 질문 추천 계약."""

from __future__ import annotations

from review_analysis.api.schemas.analysis import FeedbackIn
from review_analysis.api.schemas.common import ApiModel, ProjectContextIn


class FollowupRequest(ApiModel):
    context: ProjectContextIn
    feedback: FeedbackIn


class FollowupResponse(ApiModel):
    questions: list[str]
