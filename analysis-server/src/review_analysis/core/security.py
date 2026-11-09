"""내부 서비스 간 인증.

메인 백엔드(Spring)만 이 서버를 호출할 수 있도록 공유 토큰을 검증한다.
네트워크 차단(EC2 보안 그룹 IP 제한)과 함께 쓰는 2차 방어선이다.
"""

from __future__ import annotations

import secrets
from typing import Annotated

from fastapi import Depends, HTTPException, Security, status
from fastapi.security import APIKeyHeader

from review_analysis.core.config import Settings, get_settings

INTERNAL_TOKEN_HEADER = "X-Internal-Token"  # noqa: S105 - 헤더 이름이지 비밀값이 아님

_token_header = APIKeyHeader(name=INTERNAL_TOKEN_HEADER, auto_error=False)


def verify_internal_token(
    token: Annotated[str | None, Security(_token_header)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> None:
    expected = settings.internal_token.get_secret_value()
    # `==` 비교는 앞글자부터 틀린 지점에서 바로 멈춰서 응답 시간 차이로 토큰을 추측당할 수 있다.
    # compare_digest는 길이와 상관없이 항상 같은 시간이 걸리는 상수 시간 비교다.
    if token is None or not secrets.compare_digest(token.encode(), expected.encode()):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal token",
        )
