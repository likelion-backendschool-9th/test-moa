# 백엔드 프로젝트·테스터·피드백

프로젝트·모집글·테스트 항목·지원·피드백의 백엔드 계획([#34](https://github.com/likelion-backendschool-9th/test-moa/issues/34)). 여러 이슈에 걸친 결정과 데이터 구조는 이 문서에 두고, 이슈별 계획은 이 폴더의 `<기능>.md`로 나눈다.

## 이슈와 문서

| 이슈 | 내용 | 문서 |
| --- | --- | --- |
| [#89](https://github.com/likelion-backendschool-9th/test-moa/issues/89) | 프로젝트·테스터·피드백 엔티티 | [entities.md](entities.md) |
| [#107](https://github.com/likelion-backendschool-9th/test-moa/issues/107) | AI 리뷰 묶기·우선순위와 GitHub 이슈 초안 | |
| [#108](https://github.com/likelion-backendschool-9th/test-moa/issues/108) | AI 버전 간 비교 | |
| [#109](https://github.com/likelion-backendschool-9th/test-moa/issues/109) | AI 후속 질문 추천 | [ai-followup.md](ai-followup.md) |

Repository·Service·API는 다음 이슈에서 한다. 진행 상태는 이슈와 PR에서 본다.

프론트: [개발자 프로젝트](../../frontend/project/projects.md), [참여 테스트](../../frontend/project/participations.md), [모집글 상세](../../frontend/project/recruitment-detail.md)

## 정한 것
- [결제·구독·크레딧](../payment/README.md#정한-것)과 같은 기준을 쓴다. ERD보다 복잡하게 만들지 않고, 조건이 붙는 규칙은 백엔드가 맡는다.

| 어디서 | 무엇을 |
| --- | --- |
| 엔티티 메서드 | 상태 전이와 값끼리의 규칙. setter는 두지 않는다. 상태는 밖에서 받지 않고 메서드가 정한다 |
| 서비스(다음 이슈) | 다른 테이블까지 보는 규칙: 확정 테스터가 있는 모집의 취소 가능 여부, 선착순 자동 확정, 피드백 중복 제출, 필수 항목 누락 |

| # | 결정 | 이유 |
| --- | --- | --- |
| 1 | 피드백은 테스트 항목별 행으로 저장하고 한 번에 제출한다 | ERD와 개발자 화면이 항목별이다. 같은 `submittedAt`을 넣어 72시간 기준을 하나로 둔다 |
| 2 | 보상 스냅샷은 `Register`에 둔다 | ERD와 같다. 확정할 때 금액을 고정할 수 있고, 피드백이 여러 행이어도 보상은 참가당 한 번이다 |
| 3 | `recruit_count`를 뺀다 | 팀에서 모집 인원을 아예 빼기로 했고 ERD에서도 지웠다. 화면은 #78에서 뺀다 |
| 4 | `Feedback.testItem`은 null을 허용한다 | ERD 내보내기는 `NOT NULL`이지만 기타 의견을 null로 표현한다 |
| 5 | 테스트 항목 이미지는 `TestItemImage`다 | 프로젝트 이미지는 `projects.image_url`, 모집글 이미지는 `recruitment_images`가 맡아 테스트 항목 이미지만 남는다 |
| 6 | ERD에 `cancel_reason`, `cancelled_at`, `is_recommended`를 더한다 | 프론트 화면에 필요하고 ERD에 없다. 코드와 함께 ERD도 고친다 |
| 7 | 모집글의 주소 키로 slug를 저장하지 않는다 | ERD에 없다. API를 만들 때 프론트의 slug 자리에 `recruitment_id`를 넘긴다 |

### AI 분석 서버 연동 (#107~#109)
리뷰 묶기·버전 비교·후속 질문은 파이썬 분석 서버(`analysis-server`, 별도 EC2)가 만들고, 메인 백엔드는 데이터를 모아 보내고 결과를 받는다. 분석 서버는 DB에 연결하지 않는다.

| # | 결정 | 이유 |
| --- | --- | --- |
| 1 | 분석 서버 주소는 `application.yml`의 `analysis.base-url`(환경 변수 `ANALYSIS_BASE_URL`로도 바꿈), 내부 토큰(`X-Internal-Token`)은 환경 변수 `ANALYSIS_INTERNAL_TOKEN`으로만 넘긴다. 서버에서는 `.env`에 두 값을 넣으면 `compose.prod.yaml`이 백엔드에 넘긴다. 로컬에서는 `backend/.env`에 적으면 백엔드가 직접 읽는다(`spring.config.import`, 같은 이름의 환경 변수가 이김) (#109, 11-06) | 분석 서버는 다른 EC2에 배포한다. 토큰은 `JWT_SECRET`처럼 커밋하지 않는다. 토큰이 비어 있어도 서버와 테스트는 뜨고, 분석 기능을 부를 때만 503이다 |
| 2 | 분석 서버 호출은 DB 트랜잭션 밖에서 하고, 결과는 받은 뒤 짧은 트랜잭션으로 저장한다. 그래서 `spring.jpa.open-in-view`를 끈다 (#109, 11-06) | 응답을 기다리는 동안 DB 연결을 잡고 있지 않는다(분석 서버 README 권장). 켜 두면 트랜잭션이 없어도 요청이 끝날 때까지 연결이 묶여, 분석이 느릴 때 연결 풀(기본 10개)이 바닥난다. 지금 서비스는 모두 트랜잭션 안에서 응답을 만들어 끄더라도 영향이 없다 |
| 3 | 분석 서버의 5xx·연결 실패·시간 초과는 503 `AI_UNAVAILABLE`, 401·422와 계약과 다른 응답(JSON이 아님, 필드 없음)은 메인 백엔드의 설정·계약 문제라 500 `INTERNAL_ERROR`로 바꾼다 (#109, 11-06) | 분석 서버 오류는 `type`(`llm-upstream-error`, `validation-error` 등)으로 나뉜다. 사용자가 다시 시도해서 나아지는 것만 503이다 |
| 4 | 요청마다 `X-Request-ID`를 만들어 보내고, 성공·실패 모두 로그에 남긴다 (#109, 11-06) | 두 서버 로그를 같은 ID로 이어 본다 |
| 5 | 응답 대기는 nginx의 응답 대기(기본 60초)보다 짧게 둔다 (#109, 11-06) | 백엔드가 먼저 끊어야 사용자가 nginx의 504 대신 503 안내를 본다 |

## 데이터 구조

```mermaid
erDiagram
  users ||--o{ projects : owns
  projects ||--o{ recruitments : has
  recruitments ||--o{ recruitment_types : has
  types ||--o{ recruitment_types : has
  recruitments ||--o{ recruitment_images : has
  recruitments ||--o{ test_items : has
  test_items ||--o{ test_item_images : has
  recruitments ||--o{ registers : has
  users ||--o{ registers : applies
  registers ||--o{ feedbacks : writes
  test_items |o--o{ feedbacks : about
  feedbacks ||--o{ feedback_images : has
```

| 테이블 | 한 행이 뜻하는 것 | 자세히 |
| --- | --- | --- |
| `projects` | 개발자의 소프트웨어 하나 | [entities.md 1](entities.md#1-프로젝트와-모집글-89-r1) |
| `recruitments` | 프로젝트의 테스트 모집 한 번 | [entities.md 1](entities.md#1-프로젝트와-모집글-89-r1) |
| `test_items` | 모집글의 테스트 항목 하나 | [entities.md 2](entities.md#2-테스트-항목-89-r2) |
| `registers` | 테스터 한 명의 지원·참가 한 건 | [entities.md 3](entities.md#3-지원과-참가-89-r3) |
| `feedbacks` | 테스트 항목 하나에 대한 피드백(기타 의견은 항목 없음) | [entities.md 4](entities.md#4-피드백-89-r4) |

## 다른 담당과 맞닿는 곳

| 담당 | 맞출 것 |
| --- | --- |
| 크레딧(#66) | 승인 대기 보상을 `Feedback(SUBMITTED)` 행의 합이 아니라 제출된 참가 건의 `Register` 스냅샷 합으로 계산한다. 피드백 행마다 더하면 중복된다. [결제·구독·크레딧](../payment/README.md#정한-것)의 관련 문장도 고친다 |
| 신고 | 신고가 접수되면 `report()`, 처리되면 `reward()` 또는 `exclude()`를 부른다 |
| 보상액 | `confirm`에 넘길 기본·추가 보상액을 정한다 |
| AI 분석 | 분석 테이블은 `recruitments`를 가리키고, `analysis_status`와 `version`은 #89에서 컬럼만 만들었다 |

## 아직 정하지 않은 것

| # | 무엇을 | 추천 |
| --- | --- | --- |
| 1 | 72시간 자동 지급 담당 | 크레딧 계획 문서는 프로젝트 도메인으로 적었다. 팀에서 확정한다 |
| 2 | 항목별 피드백 중 한 건만 신고되면 보상을 어떻게 할지 | **정함(#66):** 참가 전체 지급을 보류한다. 승인 대기는 `EXISTS SUBMITTED`이고 `NOT EXISTS REPORTED`일 때만 합산한다 |
| 3 | `RecruitmentStatus.CLOSED` | 화면 상태는 날짜로 계산하므로 지금은 저장하지 않고 남겨 둔다. API를 만들 때 지울지 정한다 |
| 4 | 보상 상한 | 모집 인원이 없어 선착순 지급에 상한이 없다. 팀에서 정한다 |

- ERD에 `cancel_reason`, `cancelled_at`, `is_recommended`와 `test_item_images` 이름을 반영하는 일
