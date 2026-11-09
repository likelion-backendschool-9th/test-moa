"""v1 분석 API. 모든 엔드포인트는 내부 토큰이 필요하다.

URL에 버전(/v1)을 두면, 나중에 계약을 크게 바꿀 때 /v2를 따로 열고
메인 백엔드를 천천히 옮길 수 있다.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from review_analysis.api.deps import (
    AnalysisServiceDep,
    ComparisonServiceDep,
    FollowupServiceDep,
)
from review_analysis.api.schemas.analysis import AnalysisRequest, AnalysisResponse
from review_analysis.api.schemas.comparison import ComparisonRequest, ComparisonResponse
from review_analysis.api.schemas.followup import FollowupRequest, FollowupResponse
from review_analysis.core.security import verify_internal_token

router = APIRouter(prefix="/v1", dependencies=[Depends(verify_internal_token)])


@router.post("/analyses", summary="버전 1개의 리뷰 클러스터링·우선순위·이슈 초안")
async def create_analysis(body: AnalysisRequest, service: AnalysisServiceDep) -> AnalysisResponse:
    result = await service.analyze(
        body.context.to_domain(), [f.to_domain() for f in body.feedbacks]
    )
    return AnalysisResponse.from_domain(result)


@router.post("/comparisons", summary="직전 버전과 현재 버전의 문제 그룹 비교")
async def create_comparison(
    body: ComparisonRequest, service: ComparisonServiceDep
) -> ComparisonResponse:
    result = await service.compare(body.previous.to_domain(), body.current.to_domain())
    return ComparisonResponse.from_domain(result)


@router.post("/followup-questions", summary="테스터에게 보낼 후속 질문 3개 추천")
async def create_followup_questions(
    body: FollowupRequest, service: FollowupServiceDep
) -> FollowupResponse:
    questions = await service.suggest(body.context.to_domain(), body.feedback.to_domain())
    return FollowupResponse(questions=questions)
