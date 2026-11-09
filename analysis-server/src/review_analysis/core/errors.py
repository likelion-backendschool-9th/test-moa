"""예외 계층과 RFC 9457(Problem Details) 응답 변환.

서비스/어댑터는 HTTP를 모른 채 도메인 예외만 던지고,
HTTP 상태 코드로의 변환은 여기 한 곳에서만 한다.
메인 백엔드(Spring)는 ``type`` 필드로 오류 종류를 분기할 수 있다.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, ClassVar

import structlog
from fastapi import status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

if TYPE_CHECKING:
    from fastapi import FastAPI, Request

logger = structlog.get_logger(__name__)

PROBLEM_JSON = "application/problem+json"


class AnalysisError(Exception):
    """이 서비스의 모든 예외의 부모."""

    status_code: ClassVar[int] = status.HTTP_500_INTERNAL_SERVER_ERROR
    type_: ClassVar[str] = "internal-error"
    title: ClassVar[str] = "Internal error"

    def __init__(self, detail: str) -> None:
        super().__init__(detail)
        self.detail = detail


class UpstreamLLMError(AnalysisError):
    """LLM 호출 실패(타임아웃, 과부하, 재시도 소진 등). 메인 백엔드가 재시도할 수 있다."""

    status_code = status.HTTP_502_BAD_GATEWAY
    type_ = "llm-upstream-error"
    title = "LLM upstream failure"


class LLMOutputError(AnalysisError):
    """LLM이 거절했거나 스키마에 맞지 않는 응답을 반환."""

    status_code = status.HTTP_502_BAD_GATEWAY
    type_ = "llm-output-invalid"
    title = "LLM returned unusable output"


def _problem(status_code: int, type_: str, title: str, detail: object) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        media_type=PROBLEM_JSON,
        content=jsonable_encoder(
            {"type": type_, "title": title, "status": status_code, "detail": detail}
        ),
    )


async def _handle_analysis_error(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, AnalysisError)  # noqa: S101 - 등록 타입으로 보장됨
    logger.warning("analysis_error", type=exc.type_, detail=exc.detail)
    return _problem(exc.status_code, exc.type_, exc.title, exc.detail)


async def _handle_validation_error(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, RequestValidationError)  # noqa: S101
    # 입력값(리뷰 본문)이 그대로 되돌아가지 않도록 위치와 메시지만 남긴다.
    errors = [{"loc": e["loc"], "msg": e["msg"]} for e in exc.errors()]
    return _problem(
        status.HTTP_422_UNPROCESSABLE_CONTENT, "validation-error", "Invalid request", errors
    )


async def _handle_unexpected(_: Request, exc: Exception) -> JSONResponse:
    logger.exception("unhandled_error", exc_type=type(exc).__name__)
    # 내부 구현 정보(스택, 메시지)는 응답에 노출하지 않는다.
    return _problem(500, "internal-error", "Internal error", "Unexpected server error")


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AnalysisError, _handle_analysis_error)
    app.add_exception_handler(RequestValidationError, _handle_validation_error)
    app.add_exception_handler(Exception, _handle_unexpected)
