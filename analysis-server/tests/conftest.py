from __future__ import annotations

from typing import TYPE_CHECKING

import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr

from review_analysis.container import wire
from review_analysis.core.config import Settings, get_settings
from review_analysis.core.security import INTERNAL_TOKEN_HEADER
from review_analysis.main import create_app
from tests.fakes import FakeLLM

if TYPE_CHECKING:
    from collections.abc import Iterator

TOKEN = "t" * 32


@pytest.fixture
def settings() -> Settings:
    return Settings(
        internal_token=SecretStr(TOKEN),
        anthropic_api_key=SecretStr("test-key"),
        max_groups=10,
        prompt_samples_per_group=3,
        _env_file=None,  # type: ignore[call-arg]
    )


@pytest.fixture
def llm() -> FakeLLM:
    return FakeLLM()


@pytest.fixture
def client(settings: Settings, llm: FakeLLM) -> Iterator[TestClient]:
    app = create_app(settings, lambda s: wire(s, llm=llm))
    # 토큰 검증 의존성이 테스트 설정을 쓰도록 교체
    app.dependency_overrides[get_settings] = lambda: settings
    with TestClient(app, headers={INTERNAL_TOKEN_HEADER: TOKEN}) as c:  # with → lifespan 실행
        yield c


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"
