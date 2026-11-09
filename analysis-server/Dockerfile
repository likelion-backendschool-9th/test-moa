# syntax=docker/dockerfile:1.7
# ─────────────────────────────────────────────────────────────
# 멀티 스테이지 빌드
#   builder : uv로 의존성 설치 (빌드 도구는 최종 이미지에 안 들어감)
#   runtime : 실행에 필요한 것만 담은 작은 이미지, root가 아닌 사용자로 실행
# ─────────────────────────────────────────────────────────────

ARG PYTHON_VERSION=3.13

FROM python:${PYTHON_VERSION}-slim-bookworm AS builder
COPY --from=ghcr.io/astral-sh/uv:0.11 /uv /bin/uv
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=0
WORKDIR /app

# 1) 의존성만 먼저 설치 → 소스만 바뀌면 이 레이어는 캐시를 재사용해 빌드가 빠르다
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --locked --no-dev --no-install-project

# 2) 프로젝트 설치
COPY pyproject.toml uv.lock README.md ./
COPY src ./src
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev --no-editable


FROM python:${PYTHON_VERSION}-slim-bookworm AS runtime

RUN groupadd --system app && useradd --system --gid app --no-create-home app
WORKDIR /app

COPY --from=builder --chown=app:app /app/.venv /app/.venv

ENV PATH="/app/.venv/bin:${PATH}" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    ANALYSIS_ENVIRONMENT=production \
    ANALYSIS_ENABLE_DOCS=false

USER app
EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=3s --start-period=15s --retries=3 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health/ready', timeout=2)"]

# 워커 1개로 충분하다: 무거운 계산 없이 Claude 응답을 기다리는(async) 작업이 대부분이라
# 프로세스 하나가 여러 요청을 동시에 처리한다. 동시 호출 수는 ANALYSIS_LLM_CONCURRENCY로 조절.
# 앞단 Caddy가 붙여주는 X-Forwarded-* 헤더를 신뢰한다 (이 컨테이너 포트는 외부에 열지 않음).
CMD ["uvicorn", "review_analysis.main:app", \
     "--host", "0.0.0.0", "--port", "8000", \
     "--workers", "1", "--no-access-log", \
     "--proxy-headers", "--forwarded-allow-ips", "*"]
