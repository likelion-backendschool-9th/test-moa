"""구조화 로깅(structlog).

- 로컬: 사람이 읽기 좋은 컬러 콘솔
- 운영: 한 줄 JSON (CloudWatch 등 로그 수집기에서 필드로 검색 가능)

주의: 리뷰 본문은 개인 의견이 담긴 사용자 데이터이므로 로그에 남기지 않는다.
개수·ID·소요 시간 같은 메타데이터만 기록한다.
"""

from __future__ import annotations

import logging
import sys

import structlog


def configure_logging(*, level: str, json_logs: bool) -> None:
    shared_processors: list[structlog.types.Processor] = [
        structlog.contextvars.merge_contextvars,  # request_id 등 요청 단위 컨텍스트
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        structlog.processors.StackInfoRenderer(),
    ]
    renderer: structlog.types.Processor = (
        structlog.processors.JSONRenderer() if json_logs else structlog.dev.ConsoleRenderer()
    )
    if json_logs:
        shared_processors.append(structlog.processors.format_exc_info)

    structlog.configure(
        processors=[*shared_processors, renderer],
        wrapper_class=structlog.make_filtering_bound_logger(logging.getLevelName(level)),
        logger_factory=structlog.PrintLoggerFactory(file=sys.stdout),
        cache_logger_on_first_use=True,
    )
