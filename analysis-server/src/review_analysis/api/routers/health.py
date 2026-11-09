"""헬스 체크.

- live : 프로세스가 살아 있는가 (도커 재시작 판단용)
- ready: 요청을 처리할 준비가 됐는가 (compose의 depends_on, 로드밸런서 판단용)

지금은 시작할 때 준비할 것(모델 로딩 등)이 없어 둘이 같지만,
나중에 준비가 필요한 의존성이 생기면 ready에서 확인하도록 분리해 둔다.
"""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter

from review_analysis.api.schemas.common import ApiModel

router = APIRouter(prefix="/health", tags=["health"])


class HealthOut(ApiModel):
    status: Literal["ok"]


@router.get("/live")
async def live() -> HealthOut:
    return HealthOut(status="ok")


@router.get("/ready")
async def ready() -> HealthOut:
    return HealthOut(status="ok")
