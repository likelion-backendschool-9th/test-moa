"""라우터에서 쓰는 의존성.

``Annotated[타입, Depends(...)]``를 타입 별칭으로 만들어 두면 라우터 시그니처가 짧아지고,
같은 의존성을 여러 곳에서 일관되게 쓸 수 있다 (FastAPI 공식 권장 방식).
"""

from __future__ import annotations

from typing import Annotated, cast

from fastapi import Depends, Request

from review_analysis.container import Container
from review_analysis.services.analysis import AnalysisService
from review_analysis.services.comparison import ComparisonService
from review_analysis.services.followup import FollowupService


def get_container(request: Request) -> Container:
    return cast("Container", request.app.state.container)


ContainerDep = Annotated[Container, Depends(get_container)]


def _analysis(c: ContainerDep) -> AnalysisService:
    return c.analysis


def _comparison(c: ContainerDep) -> ComparisonService:
    return c.comparison


def _followup(c: ContainerDep) -> FollowupService:
    return c.followup


AnalysisServiceDep = Annotated[AnalysisService, Depends(_analysis)]
ComparisonServiceDep = Annotated[ComparisonService, Depends(_comparison)]
FollowupServiceDep = Annotated[FollowupService, Depends(_followup)]
