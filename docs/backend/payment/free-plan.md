# 백엔드 무료 플랜 조건

시나리오 제목 끝의 태그가 확인 방법이다. `[테스트]`만 이 문서 시나리오와 백엔드 테스트가 1:1이고, `[직접]`은 사람이 API·화면·코드로 확인한다.

이슈: [#203](https://github.com/likelion-backendschool-9th/test-moa/issues/203). 요구·시나리오는 `#203-R…`, `#203-S…`부터 센다. 이 이슈는 구독 화면의 프론트 연결도 같이 하며, 프론트 시나리오는 [subscription.md](../../frontend/payment/subscription.md)·[subscription-intro.md](../../frontend/payment/subscription-intro.md)에 둔다. 엔티티는 [entities.md](entities.md), 도메인 결정은 [README.md](README.md), 구독 플랜 API는 [subscription.md](subscription.md).

## 한눈에
- 끝나면: 서버가 무료 플랜의 이름과 혜택 목록을 로그인 없이 돌려주고, 운영자가 API로 그 값을 고친다. 무료 조건은 구독 플랜(`plans`)과 별도 테이블(`free_plans`)에 있어서 구독·결제 규칙과 섞이지 않는다.
- 선행: #69(구독 플랜 API, `Plan.benefits()`의 쉼표 규칙을 같이 쓴다).
- 화면: `/subscription`(공개 구독 소개)의 FREE 카드 — [subscription-intro.md](../../frontend/payment/subscription-intro.md)

## 정한 것 (#203, 2026-11-09)
- **무료 플랜은 `plans`에 넣지 않고 `free_plans` 테이블에 둔다.** `plans`에 행으로 넣으면 `GET /api/v1/plans`(지금 파는 플랜)에 섞여 결제 대상이 되고, `Subscription`이 생기면 구독 중으로 계산된다. 그래서 구독·결제 코드는 이 테이블을 모른다. ([#69](subscription.md)의 "무료는 행으로 두지 않는다"는 `plans` 안이라는 뜻으로 그대로 맞다.)
- **`plans`와 비슷한 모양으로 둔다.** 칼럼은 `tier`(이름), `description`(혜택 문구를 쉼표로 이은 TEXT), `created_at`, `updated_at`이고 가격·기간·`version`은 없다. 혜택은 `Plan`과 같이 쉼표로 잇고 서버가 잘라 `benefits` 배열로 내려준다(문구에 쉼표를 쓰지 않는다).
- **행은 하나다.** PK를 고정값 `1`로 둬서 DB가 행 하나만 허용하게 한다. 수정은 그 행을 고친다(운영자 한 명이 값을 고치는 설정이라 이력은 남기지 않는다).
- **행이 없으면 빈 혜택을 준다.** 조회는 404가 아니라 `{ "tier": "FREE", "benefits": [] }`를 200으로 준다. 프론트는 "혜택이 없으면 혜택 영역을 그리지 않는다"로 이미 처리해서 실패 경로가 늘지 않는다. 로컬·배포 DB가 비어 있어도 화면이 깨지지 않는다.
- **운영자 `PUT`이 만들기와 고치기를 겸한다.** 행이 없으면 만들고 있으면 고친다. 그래서 시드 없이 운영자 API로 초기 값을 넣는다(`plans`가 시드 없이 `POST`로 들어가는 것과 같은 방식). 로컬 시드(`backend/scripts/local_seed.sql`)에는 한 줄을 더한다.
- **경로는 구독 플랜 옆에 둔다.** 조회 `GET /api/v1/plans/free`는 로그인 없이 읽고(`SecurityConfig`에서 GET만 `permitAll`. `PUBLIC_PATHS`의 `/api/v1/plans`는 그 경로만 맞아서 `plans/free`는 따로 연다), 수정 `PUT /api/v1/admin/plans/free`는 `/api/v1/admin/**`의 `ADMIN` 규칙을 그대로 받는다. 컨트롤러와 서비스는 기존 쌍을 늘린다: `PlanController`·`PlanService`에 조회, `AdminPlanController`·`AdminPlanService`에 수정.
- **테이블은 JPA가 만든다.** 로컬(`ddl-auto: update`)과 배포(`compose.prod.yaml`의 `SPRING_JPA_HIBERNATE_DDL_AUTO: update`)가 엔티티를 보고 `free_plans`를 만든다. 별도 SQL은 필요 없다(`update`는 칼럼·테이블을 더하기만 한다).

### `free_plans`

| 필드 | 컬럼 | 타입 | null | 설명 |
| --- | --- | --- | --- | --- |
| `id` | `id` | Long | 불가 | PK. 고정값 1(행 하나) |
| `tier` | `tier` | String | 불가 | 무료 플랜 이름 |
| `description` | `description` | TEXT | 가능 | 혜택 문구. 쉼표로 이어 넣고 `benefits()`가 자른다 |

모든 엔티티처럼 `created_at`·`updated_at`이 있다.

## API

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| `GET` | `/api/v1/plans/free` | 무료 플랜 조건 조회. 로그인 없이 읽는다 |
| `PUT` | `/api/v1/admin/plans/free` | 무료 플랜 조건 저장(없으면 만들고 있으면 고침). 운영자만 |

### 무료 플랜 응답 (`GET`, `PUT` 공통)

| 필드 | 의미 |
| --- | --- |
| `tier` | 무료 플랜의 이름. 행이 없으면 `FREE` |
| `benefits` | 혜택 문구 목록. 행이 없거나 비어 있으면 빈 배열 |

### 저장 요청 (`PUT`)

| 필드 | 규칙 |
| --- | --- |
| `tier` | 필수. 공백만 안 됨. 255자까지. 앞뒤 공백은 지운다 |
| `benefits` | 선택(없으면 빈 목록으로 저장). 10개까지, 항목은 100자까지, 비거나 쉼표를 담으면 거절 |

잘못된 값은 구독 플랜 등록과 같은 `INVALID_INPUT`(400)이다.

## 시나리오

#203-S1 행이 없으면 빈 혜택을 준다 [테스트]
- Given `free_plans`가 비어 있다
- When  로그인 없이 `GET /api/v1/plans/free`
- Then  200이고 `tier`는 `FREE`, `benefits`는 빈 배열이다

#203-S2 운영자가 처음 저장하면 만들어지고 조회에 반영된다 [테스트]
- Given `free_plans`가 비어 있다
- When  운영자가 `tier` "FREE", 혜택 "선착순 자동 확정"·"기본 보상"으로 `PUT /api/v1/admin/plans/free`
- Then  200이고 응답 `benefits`는 그 두 개다. 행은 하나가 생긴다
- When  로그인 없이 `GET /api/v1/plans/free`
- Then  같은 값이 보인다(앞뒤 공백은 지워져 있다)

#203-S3 다시 저장하면 같은 행이 고쳐진다 [테스트]
- Given 무료 플랜이 저장되어 있다
- When  운영자가 다른 혜택으로 `PUT`
- Then  행은 여전히 하나이고 조회 값이 새 혜택이다. 혜택을 빈 목록으로 저장하면 조회는 빈 배열이다

#203-S4 잘못된 값은 거절한다 [테스트]
- Given 운영자
- When  `tier`가 비었거나 255자를 넘거나, 혜택이 11개 이상이거나, 혜택 항목이 비었거나 100자를 넘거나 쉼표를 담았다
- Then  400 `INVALID_INPUT`이고 저장된 값은 그대로다

#203-S5 운영자만 저장한다 [테스트]
- Given 일반 회원, 비로그인
- When  `PUT /api/v1/admin/plans/free`
- Then  일반 회원은 403, 비로그인은 401이다. 조회 `GET`은 둘 다 열려 있다

#203-S6 무료 플랜은 구독·결제와 관계없다 [테스트]
- Given 무료 플랜이 저장되어 있고 구독 플랜이 하나 있다
- When  `GET /api/v1/plans`
- Then  구독 플랜만 나오고 무료는 없다
- When  구독 상태·결제 가능 크레딧을 조회하고, 구독 결제 화면 조회를 한다
- Then  무료 플랜 저장 전과 같다(구독 중이 되지 않고 결제할 수 있는 플랜도 늘지 않는다)

#203-S7 테이블 모양 [테스트: `FreePlanRepositoryTest`]
- Given 무료 플랜 행이 이미 있다
- When  같은 PK로 한 행을 더 저장하려 한다
- Then  행은 하나뿐이다(고정 PK)

## 범위 밖
- 무료 플랜 변경 이력(`version`), 가격·기간
- 무료 한도(모집 인원 등). 한도는 백엔드에서 없앴다([#69](subscription.md))
- 구독 결제·환불. 무료는 결제 대상이 아니다
- 운영자 화면에서 무료 조건을 고치는 UI(API만 만든다)

## 작업 순서
1. 문서: 이 문서, [README.md](README.md)(이슈 표·정한 것·데이터 구조), [entities.md](entities.md), [subscription.md](subscription.md)의 "프론트가 가진다" 문장
2. `FreePlan` 엔티티와 `FreePlanRepository`(S7)
3. `PlanService`·`PlanController`에 조회, `SecurityConfig`에서 `GET /api/v1/plans/free`만 `permitAll`(S1, S6)
4. `AdminPlanService`·`AdminPlanController`에 저장(S2~S5)
5. 로컬 시드에 무료 플랜 한 줄, 구독 플랜 이름을 "PRO"로
6. 프론트 연결: 구독 소개의 FREE 카드, 구독 화면의 상태·플랜·결제 가능 크레딧([subscription.md](../../frontend/payment/subscription.md) 시나리오)

## 가정
- 무료 조건을 고치는 사람은 운영자 한 명뿐이라 동시에 저장하는 일은 드물다. 빈 테이블에 처음 저장하는 요청 두 개가 동시에 오면 PK가 같아 한쪽이 실패할 수 있고, 다시 보내면 된다.
- 무료 플랜의 이름은 화면 카드 이름(`FREE`)과 같다. 값은 운영자가 정한다.
- 카드의 제목·한 줄 설명·"무료" 가격 표기는 서버 값이 아니라 프론트 문구다.
