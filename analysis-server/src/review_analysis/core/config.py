"""애플리케이션 설정.

모든 값은 환경변수(접두사 ``ANALYSIS_``) 또는 ``.env`` 파일에서 읽는다.
비밀 값은 ``SecretStr``로 감싸서 로그·repr·예외 메시지에 평문이 찍히지 않게 한다.
"""

from __future__ import annotations

from enum import StrEnum
from functools import lru_cache
from typing import Annotated

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Environment(StrEnum):
    LOCAL = "local"
    PRODUCTION = "production"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="ANALYSIS_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        frozen=True,  # 설정은 런타임에 바뀌지 않는다
    )

    environment: Environment = Environment.LOCAL
    log_level: str = "INFO"

    # ── 보안 ──
    # 메인 백엔드만 아는 공유 토큰. 최소 32자 이상을 강제해 약한 토큰을 막는다.
    internal_token: Annotated[SecretStr, Field(min_length=32)]
    anthropic_api_key: SecretStr

    # ── LLM ──
    # 대량·단순 작업(그룹 라벨링)은 가벼운 모델, 요약·비교는 상위 모델로 나눠 비용을 줄인다.
    label_model: str = "claude-haiku-5-5"
    reasoning_model: str = "claude-sonnet-5-5"
    # 리뷰 묶기는 리뷰 수백 개를 한 번에 읽고 ID 목록을 길게 써야 해서 오래 걸릴 수 있다.
    llm_timeout_seconds: float = 180.0
    llm_max_retries: int = 3
    llm_concurrency: Annotated[int, Field(ge=1, le=32)] = 4

    # ── 리뷰 묶기 ──
    # 로컬 임베딩 모델을 쓰지 않고 Claude가 리뷰를 의미로 묶는다.
    # (소형 모델은 한국어 짧은 리뷰를 구분하지 못했고, 구분되는 모델은 서버 메모리 8GB가 필요했다)
    # 묶기 응답은 리뷰 ID 목록이라, 리뷰가 많으면 출력 토큰이 늘어난다.
    grouping_max_tokens: Annotated[int, Field(ge=1000, le=32000)] = 8000
    max_groups: Annotated[int, Field(ge=1)] = 40
    prompt_samples_per_group: Annotated[int, Field(ge=1, le=20)] = 5

    # ── 운영 ──
    # 운영 환경에서는 /docs(Swagger)를 끈다. 내부 API 명세가 외부에 노출되지 않도록.
    enable_docs: bool = True

    @property
    def is_production(self) -> bool:
        return self.environment is Environment.PRODUCTION


@lru_cache
def get_settings() -> Settings:
    # 필수값(internal_token 등)은 환경변수에서 채워지므로 인자 없이 생성한다.
    return Settings()
