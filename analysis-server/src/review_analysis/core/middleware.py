"""요청 ID 미들웨어 (순수 ASGI).

메인 백엔드가 ``X-Request-ID``를 보내면 그대로 쓰고, 없으면 새로 만든다.
같은 ID가 양쪽 서버 로그에 찍히므로 장애 시 한 요청의 흐름을 추적할 수 있다.

Starlette의 ``BaseHTTPMiddleware``는 응답 스트리밍·contextvars 전파에 제약이 있어
순수 ASGI 미들웨어로 작성한다.
"""

from __future__ import annotations

import re
import time
import uuid
from typing import TYPE_CHECKING

import structlog

if TYPE_CHECKING:
    from starlette.types import ASGIApp, Message, Receive, Scope, Send

REQUEST_ID_HEADER = b"x-request-id"
_SAFE_ID = re.compile(r"^[A-Za-z0-9\-_.]{1,64}$")  # 로그 인젝션 방지

logger = structlog.get_logger("access")


class RequestContextMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        incoming = dict(scope["headers"]).get(REQUEST_ID_HEADER, b"").decode("latin-1")
        request_id = incoming if _SAFE_ID.match(incoming) else uuid.uuid4().hex
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)

        started = time.perf_counter()
        status_code = 500

        async def send_wrapper(message: Message) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
                message.setdefault("headers", [])
                message["headers"].append((REQUEST_ID_HEADER, request_id.encode()))
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            logger.info(
                "request",
                method=scope["method"],
                path=scope["path"],
                status=status_code,
                duration_ms=round((time.perf_counter() - started) * 1000, 1),
            )
