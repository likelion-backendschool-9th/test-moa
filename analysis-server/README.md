# Review Analysis Service

테스터 리뷰를 분석하는 내부 전용 API 서버입니다. EC2에서 단독으로 실행되며 **DB에 연결하지 않습니다.**
메인 백엔드(Spring)가 필요한 데이터를 요청 본문으로 보내면, 분석 결과를 응답으로 돌려줍니다.

```
메인 백엔드(Spring) ──HTTPS + X-Internal-Token──▶ Caddy ──▶ 분석 서버(FastAPI)
                                                              └─ Claude API
                                                                 (리뷰 묶기 · 이슈 작성 · 비교 · 질문)
```

| API | 기능 |
|---|---|
| `POST /v1/analyses` | 버전 1개의 리뷰 → 그룹 · 심각도 · GitHub 이슈 초안 · 대표 리뷰 · 리뷰 전체 한 문장 분석 · 칭찬 요약 |
| `POST /v1/comparisons` | 직전 버전 vs 현재 버전 그룹 짝짓기 · 변화 요약 |
| `POST /v1/followup-questions` | 리뷰 1개 → 테스터에게 보낼 후속 질문 3개 |
| `GET /health/live`, `/health/ready` | 프로세스 생존 / 모델 로딩 완료 |

---

## 빠른 시작 (로컬)

[uv](https://docs.astral.sh/uv/)가 필요합니다. (`pip`·`venv`·`poetry`를 대체하는 파이썬 패키지 관리자)

```bash
uv sync                               # 가상환경 생성 + 의존성 설치 (Gradle의 build와 비슷)
cp .env.example .env                  # 토큰·API 키 입력
uv run uvicorn review_analysis.main:app --reload
```

`http://localhost:8000/docs` 에서 Swagger로 바로 요청해볼 수 있습니다. (우측 상단 Authorize에 토큰 입력)

## 품질 검사

```bash
uv run ruff format .     # 코드 포맷
uv run ruff check .      # 린트 (보안·비동기·FastAPI 규칙 포함)
uv run mypy              # 타입 검사 (strict)
uv run pytest            # 테스트 (실제 Claude 호출 없이 실행)
```

CI(`.github/workflows/ci.yml`)가 PR마다 위 4개와 도커 빌드를 실행합니다.

---

## 구조

```
src/review_analysis/
├── main.py              앱 팩토리, lifespan(시작·종료 처리)
├── container.py         구현체 조립 (컴포지션 루트)
├── core/                설정 · 로깅 · 예외(RFC 9457) · 내부 토큰 인증 · 요청 ID
├── domain/              순수 로직 — HTTP/DB/SDK를 모름
│   ├── enums.py         Category, Severity (DB 값과 일치해야 함)
│   ├── models.py        불변 도메인 객체
│   ├── clustering.py    Claude가 제안한 묶음 검증 · 미분류 처리 · 대표 리뷰
│   └── comparison.py    LLM 매칭 결과 검증 · 신규/미보고 계산
├── ports/               인터페이스 (ReviewLLM)
├── adapters/            구현체 (Claude)
│   └── llm/prompts.py   프롬프트 템플릿
├── services/            유스케이스 (분석 · 비교 · 후속 질문)
└── api/                 라우터 · 요청/응답 스키마(DTO)
```

Spring에 비유하면 `api` = Controller + DTO, `services` = Service, `ports` = 인터페이스,
`adapters` = 인터페이스 구현체(외부 연동), `container.py` = `@Configuration`입니다.

**의존 방향은 항상 안쪽으로만** 흐릅니다: `api → services → ports ← adapters`, 모두 `domain`을 사용.
`domain`은 아무것도 import하지 않으므로, Claude를 다른 LLM으로 바꿔도 `adapters`만 새로 만들면 됩니다.

---

## 메인 백엔드 연동 가이드

### 공통
- JSON 필드는 **camelCase**입니다 (Jackson 기본값과 동일).
- 모든 `/v1` 요청에 `X-Internal-Token` 헤더가 필요합니다.
- `X-Request-ID`를 보내면 응답과 로그에 같은 ID가 찍혀 양쪽 로그를 연결할 수 있습니다.
- 계약에 없는 필드를 보내면 422로 거부됩니다(`extra="forbid"`). 계약이 어긋난 걸 바로 알 수 있습니다.
- 오류는 `application/problem+json` 형식이며, `type` 필드로 분기합니다.

| type | status | 메인 백엔드 처리 |
|---|---|---|
| `validation-error` | 422 | 요청 데이터 버그. 재시도하지 않음 |
| `llm-upstream-error` | 502 | Claude 장애. 잠시 후 재시도 |
| `llm-output-invalid` | 502 | 재시도 |

### `/v1/analyses` 응답 저장 방법
- `groups[].key`는 **응답 안에서만 쓰는 임시 키**입니다. `cluster_group`에 저장하며 실제 ID를 발급하세요.
- `groups[].feedbackIds` → `feedback_cluster` 매핑 행
- `improvementRank`, `gitIssueTitle`, `gitIssueContent`는 `PRAISE`/`UNCLASSIFIED`일 때 `null`
- `analyticsSummary`는 리뷰 전체를 한 문장으로 요약한 분석입니다. `recruitments.analytics_summary`에 저장하고,
  의미 있는 그룹이 없거나 요약 응답이 이상하면 `null`입니다(묶은 결과는 그대로 옵니다).
- 리뷰 수·테스터 수는 이 서버가 주지 않습니다. 매핑 테이블로 메인 백엔드에서 계산합니다.
- `group_code` 발급은 메인 백엔드 담당입니다. `/v1/comparisons` 결과의 `matches`로
  이전 그룹의 코드를 이어받고, `newGroupIds`에는 새 코드를 발급하세요.

### `/v1/comparisons`
- `notReportedGroupIds`는 **"해결됨"이 아닙니다.** 화면에는 "이번 버전에서 보고되지 않음"으로 표시하세요.
- LLM이 존재하지 않는 ID를 만들거나 중복 매칭해도 서버가 걸러서 돌려줍니다.

### Spring 호출 예시

```java
@Bean
RestClient analysisClient(AnalysisProperties props) {
    var factory = new JdkClientHttpRequestFactory(
        HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build());
    factory.setReadTimeout(Duration.ofMinutes(5));          // 분석은 오래 걸릴 수 있음
    return RestClient.builder()
        .baseUrl(props.baseUrl())
        .requestFactory(factory)
        .defaultHeader("X-Internal-Token", props.token())
        .build();
}
```

분석 호출은 트랜잭션 **밖에서** 하고, 결과를 받은 뒤 짧은 트랜잭션으로 저장하세요.

---

## EC2 배포

```bash
cp .env.example .env     # 운영 값 입력, DOMAIN 설정
docker compose up -d --build
```

### 보안 그룹 설정 (중요)

| 포트 | 허용 대상 | 이유 |
|---|---|---|
| 443 | **메인 서버 공인 IP만** | 실제 API |
| 80 | 0.0.0.0/0 | Let's Encrypt 인증서 발급·갱신(HTTP-01). Caddy가 API 요청은 443으로 돌려보냄 |
| 22 | 내 IP만 | SSH |

80을 막으면 인증서 발급·갱신이 실패합니다. 80을 열고 싶지 않다면 DNS 인증(Caddy DNS 플러그인)이나
ALB + ACM을 쓰는 방법이 있습니다.

### 운영 체크리스트
- API 키는 이 서비스 전용으로 발급하고, Anthropic 콘솔에서 **월 지출 한도**를 설정하세요.
- `.env` 대신 AWS SSM Parameter Store / Secrets Manager를 쓰면 더 안전합니다.
- 로컬 모델이 없어 가볍습니다. 컨테이너 메모리 제한은 512MB(`compose.yaml`)이고, **EC2는 가장 작은 사양(1~2GB)**으로 충분합니다.
- 운영 이미지는 `/docs`가 꺼져 있습니다(`ANALYSIS_ENABLE_DOCS=false`).

---

## 왜 로컬 임베딩 모델을 쓰지 않나

처음에는 로컬 임베딩 모델 + 유사도 기준값으로 리뷰를 묶었지만, 실제 한국어 리뷰로 확인한 결과:
- 소형 모델(약 220MB)은 "색감이 예뻐요"와 "결제 금액이 이상해요"를 유사도 0.93으로 판단해 구분이 불가능했고
- 구분이 되는 모델(e5-large, 약 2.2GB)은 서버 메모리 8GB가 필요했다.

버전 하나의 리뷰는 수십~수백 개라 Claude 호출 1번으로 충분히 처리되고, 한국어 의미 구분도 더 정확하다.
대신 Claude 응답을 그대로 믿지 않고 `domain/clustering.py`가 검증한다(없는 ID 제거, 빠진 리뷰는 미분류).

## 튜닝 포인트

실제 리뷰가 쌓이면 아래 값을 조정하세요. 모두 환경변수로 바꿀 수 있습니다.

| 설정 | 기본값 | 영향 |
|---|---|---|
| `ANALYSIS_MAX_GROUPS` | 40 | 그룹별 라벨링 호출 수 상한. 넘는 그룹의 리뷰는 "미분류"로 |
| `ANALYSIS_PROMPT_SAMPLES_PER_GROUP` | 5 | 그룹당 Claude에 보내는 리뷰 수 (비용 ↔ 정확도) |
| `ANALYSIS_GROUPING_MAX_TOKENS` | 8000 | 리뷰 묶기 응답 최대 길이. 리뷰가 수백 개라 응답이 잘리면(502) 늘릴 것 |
| `ANALYSIS_LLM_TIMEOUT_SECONDS` | 180 | 리뷰가 많으면 묶기가 오래 걸림 |
