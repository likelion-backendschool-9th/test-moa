"""FastAPI 애플리케이션 팩토리.

``create_app()`` 팩토리로 앱을 만들면 테스트에서 설정·의존성을 바꾼 앱을 자유롭게 만들 수 있다.
실행: ``uvicorn review_analysis.main:app`` (또는 ``--factory review_analysis.main:create_app``)
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import TYPE_CHECKING

from fastapi import FastAPI

from review_analysis.api.routers import health, v1
from review_analysis.container import build_container
from review_analysis.core.config import Settings, get_settings
from review_analysis.core.errors import register_exception_handlers
from review_analysis.core.logging import configure_logging
from review_analysis.core.middleware import RequestContextMiddleware

if TYPE_CHECKING:
    from collections.abc import AsyncIterator, Callable

    from review_analysis.container import Container


def create_app(
    settings: Settings | None = None,
    container_factory: Callable[[Settings], Container] = build_container,
) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(level=settings.log_level, json_logs=settings.is_production)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        container = container_factory(settings)
        app.state.container = container
        try:
            yield
        finally:
            # 종료 시 Claude HTTP 연결을 정리한다
            await container.aclose()

    app = FastAPI(
        title="Review Analysis Service",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs" if settings.enable_docs else None,
        redoc_url=None,
        openapi_url="/openapi.json" if settings.enable_docs else None,
    )
    app.add_middleware(RequestContextMiddleware)
    register_exception_handlers(app)
    app.include_router(health.router)
    app.include_router(v1.router)
    # CORS는 설정하지 않는다: 브라우저가 아니라 메인 백엔드만 호출하는 서버이기 때문.
    return app


def __getattr__(name: str) -> FastAPI:
    # `uvicorn review_analysis.main:app` 지원. import 시점이 아니라 실제 접근 시점에 앱을 만든다
    # (테스트에서 이 모듈을 import만 해도 환경변수 검증이 실행되는 것을 방지).
    if name == "app":
        return create_app()
    raise AttributeError(name)
