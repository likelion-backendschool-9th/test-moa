# 백엔드 운영자 구독 부여·해제

시나리오 제목 끝의 태그가 확인 방법이다. `[테스트]`만 이 문서 시나리오와 백엔드 테스트가 1:1이고, `[직접]`은 사람이 API·화면·코드로 확인한다.

이슈: [#204](https://github.com/likelion-backendschool-9th/test-moa/issues/204). 요구·시나리오는 `#204-R…`, `#204-S…`부터 센다. 이 문서의 시나리오는 `#204-S1`~`S10`과 리뷰 반영으로 더한 `#204-S24`다(`S11`~`S23`은 프론트 문서). 이 이슈는 구독 결제 화면의 프론트 연결도 같이 하며, 프론트 시나리오는 [subscription.md](../../frontend/payment/subscription.md)(결제 연결)와 [subscriptions.md](../../frontend/admin/subscriptions.md)(운영자 화면)에 둔다. 구독 상태·플랜은 [subscription.md](subscription.md), 결제 실행은 [subscription-payment.md](subscription-payment.md), 엔티티는 [entities.md](entities.md).

## 한눈에
- 끝나면: 운영자가 **회원의 이메일**로 그 회원의 구독 상태를 보고, **결제 없이** 구독을 주거나 빼서 시연·확인용 계정을 만든다. 주면 그 회원의 `/my/subscription`에 구독 중으로 나온다.
- 선행: #69(구독 상태·플랜), #71(이용 기간 규칙).
- 화면: `/admin/plans?tab=subscriptions`(#257에서 옮김) — [subscriptions.md](../../frontend/admin/subscriptions.md)
- 결제·환불은 이 이슈 범위 밖이다.

## 정한 것 (#204, 2026-11-09)
- **시연·확인용 기능이다.** 실제 결제 없이 구독을 만든다. 결제(`payments`)와 크레딧(지갑·내역)은 건드리지 않아서 결제 이력과 크레딧 내역에는 나오지 않는다.
- **회원은 이메일로 찾는다.** 운영자가 회원 id를 모르고, 소셜 가입 회원도 이메일이 있다. 목록 API는 만들지 않는다. 이메일은 앞뒤 공백을 지우고, 비교는 `UserRepository.findByEmail`의 기존 규칙을 따른다.
- **경로는 `/api/v1/admin/subscriptions` 하나에 메서드로 나눈다.** `/api/v1/admin/**`의 `ADMIN` 규칙(`SecurityConfig`)을 그대로 받는다.
- **부여는 결제 없이 `subscriptions` 행 하나를 만든다.** 플랜은 지금 파는 플랜(같은 `tier`의 가장 큰 `version`)이어야 한다. 기간은 #71과 같은 규칙이다: 시작 = `max(지금, 끝나지 않은 ACTIVE 행 중 가장 늦은 end_at)`, 끝 = 시작 + `periodDays`일. 이미 구독 중이면 끝난 시각부터 이어 붙는다.
- **해제는 끝나지 않은 ACTIVE 기간을 모두 `CANCELLED`로 바꾼다.** 이미 끝난 기간과 이미 취소된 기간은 건드리지 않는다. 해제한 뒤 구독 상태는 미구독이다. 행을 지우지 않는다.
  - **`CANCELLED`는 원래 "환불로 취소됨"이라는 뜻이다**([entities.md](entities.md)). 이 해제는 환불이 아니라서 값의 뜻이 겹친다. 시연용 기능이라 값을 새로 만들지 않고 재사용하며, 이 겹침을 알고 쓴다.
  - **실제로 결제한 기간도 같이 취소된다.** 결제 기록(`payments`)은 그대로 남고 구독만 사라지므로, 결제와 구독 상태가 어긋난다. 실제 회원에게 쓰는 기능이 아니다.
- **운영자 계정은 구독 대상이 아니다.** 조회는 `eligible=false`로 답하고, 부여는 403(메시지 "운영자 계정은 구독 대상이 아니에요")이다. 해제는 할 것이 없어 `eligible=false`로 답한다(조회와 같다).
- **없는 이메일은 404다.** 같은 회원에 대한 동시 부여·해제는 회원 행을 `PESSIMISTIC_WRITE`로 잠가 한 줄로 처리한다(`findByIdForUpdate`). 구독 결제([subscription-payment.md](subscription-payment.md))도 같은 회원 행을 먼저 잠그고 이용 시작을 계산하므로, 결제와 운영자 작업이 겹쳐도 차례로 처리된다.
- **응답 시각에는 오프셋이 붙는다.** UTC로 고정한 서버 값이 `…Z`로 내려간다([server-time.md](../../server-time.md)).

## API

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| `GET` | `/api/v1/admin/subscriptions?email=` | 회원의 이름·이메일과 구독 상태 조회 |
| `POST` | `/api/v1/admin/subscriptions` | 결제 없이 구독을 준다 |
| `DELETE` | `/api/v1/admin/subscriptions?email=` | 끝나지 않은 구독 기간을 모두 취소한다 |

### 응답 (`GET`, `POST`, `DELETE` 공통)

| 필드 | 의미 |
| --- | --- |
| `nickname` | 회원 닉네임 |
| `email` | 회원 이메일 |
| `eligible` | 구독 대상인지. 운영자는 `false` |
| `active` | 구독 중인지. 운영자는 `null` |
| `plan` | 지금 구독 중인 플랜 이름(`tier`). 미구독이면 `null` |
| `endAt` | 이어진 구독의 끝 시각. 미구독이면 `null` |
| `remainingDays` | 남은 날(하루가 안 남아도 1). 미구독이면 `null` |

`active`·`plan`·`endAt`·`remainingDays`는 [#69의 내 구독 상태](subscription.md)와 같은 규칙으로 계산한다.

### 부여 요청 (`POST`)

| 필드 | 규칙 |
| --- | --- |
| `email` | 필수. 공백만 안 됨 |
| `planId` | 필수. 지금 파는 플랜의 id |

잘못된 값은 `INVALID_INPUT`(400)이다. 부여 성공은 201이고, 해제·조회는 200이다.

## 시나리오

#204-S1 회원의 구독 상태를 이메일로 조회한다 [테스트]
- Given 구독 중인 일반 회원과 구독하지 않은 일반 회원
- When  운영자가 각 이메일로 `GET /api/v1/admin/subscriptions`
- Then  200이고 닉네임·이메일과 구독 상태(`active`, `plan`, `endAt`, `remainingDays`)가 맞다. 구독하지 않은 회원은 `active=false`이고 나머지는 `null`이다

#204-S2 없는 이메일은 404다 [테스트]
- When  가입하지 않은 이메일로 조회·부여·해제한다
- Then  404(`NOT_FOUND`)이고 어떤 행도 만들어지거나 바뀌지 않는다

#204-S3 운영자 계정은 구독 대상이 아니다 [테스트]
- Given 운영자 회원의 이메일
- When  조회한다
- Then  200이고 `eligible=false`, 나머지 상태 필드는 `null`이다
- When  같은 이메일로 부여한다
- Then  403이고 구독 행이 생기지 않는다
- When  같은 이메일로 해제한다
- Then  200이고 `eligible=false`다

#204-S4 구독을 주면 결제 없이 구독 중이 된다 [테스트]
- Given 구독하지 않은 일반 회원, 지금 파는 플랜(30일)
- When  `POST`로 이메일과 `planId`를 보낸다
- Then  201이고 `active=true`, `plan`은 그 플랜 이름, `endAt`은 지금 + 30일이다. `subscriptions`에 ACTIVE 행이 하나 생기고, 결제(`payments`)와 지갑·크레딧 내역은 그대로다. 그 회원의 `GET /api/v1/my/subscription/status`도 구독 중이다

#204-S5 이미 구독 중이면 끝난 시각부터 이어 준다 [테스트]
- Given 지금부터 10일 뒤에 끝나는 구독이 있는 회원
- When  30일 플랜을 준다
- Then  새 기간의 시작이 기존 `endAt`이고 끝이 그 + 30일이라 상태의 `endAt`이 40일 뒤다

#204-S6 지금 파는 플랜이 아니면 거절한다 [테스트]
- When  없는 `planId`, 또는 같은 등급의 새 버전이 나와 더 이상 팔지 않는 옛 플랜의 id로 준다
- Then  404(`NOT_FOUND`)이고 행이 생기지 않는다

#204-S7 요청 값이 잘못되면 거절한다 [테스트]
- When  이메일이 비었거나 `planId`가 없다
- Then  400(`INVALID_INPUT`)이다

#204-S8 구독을 빼면 끝나지 않은 기간이 모두 취소된다 [테스트]
- Given 지금 기간 하나와 이어진 미리 결제한 기간 하나가 있고, 이미 끝난 기간 하나가 있는 회원
- When  `DELETE`로 이메일을 보낸다
- Then  200이고 `active=false`다. 끝나지 않은 두 기간은 `CANCELLED`가 되고 끝난 기간은 그대로다. 행은 지워지지 않는다. 결제 이력과 크레딧은 그대로다

#204-S9 뺄 구독이 없어도 같은 결과다 [테스트]
- Given 구독하지 않은 회원
- When  해제한다
- Then  200이고 `active=false`다. 바뀌는 행은 없다

#204-S10 운영자만 쓴다 [테스트]
- When  일반 회원 토큰, 비로그인으로 세 API를 부른다
- Then  일반 회원은 403, 비로그인은 401이다

#204-S24 결제와 운영자 부여·해제가 겹쳐도 차례로 처리된다 [테스트] (리뷰 반영)
- Given 지갑이 있고 10일 뒤에 끝나는 구독이 있는 회원. 결제가 구독 기간을 읽은 뒤 멈춘다
- When  그 사이 운영자가 30일 구독을 준다
- Then  운영자 작업은 결제가 끝날 때까지 기다리고, 결제 30일과 부여 30일이 서로의 끝에서 시작해 남은 기간이 70일이다(기존 10일 + 30일 + 30일). 기간이 겹치지 않는다
- When  그 사이 운영자가 구독을 뺀다
- Then  결제가 먼저 끝난 뒤 해제가 그 기간까지 취소해서 끝나지 않은 ACTIVE 기간이 남지 않는다. 결제 기록은 한 건이다

---

## 범위 밖
- 회원 목록·검색 API(이메일로만 찾는다)
- 플랜 가격·기간을 부여할 때 바꾸는 것(지금 파는 플랜 그대로)
- 부여·해제 이력 기록(누가 언제 했는지). 시연용이라 남기지 않는다
- 환불, 결제 이력 정리

## 작업 순서
1. 이 문서와 [subscriptions.md](../../frontend/admin/subscriptions.md)
2. `Subscription.cancel()`(엔티티), `AdminSubscriptionService`·`Controller`, 응답·요청 DTO(S1~S10 테스트와 함께)
3. 프론트: 운영자 화면과 API 연결

## 가정
- 로컬에서는 운영자 계정이 없어 DB에서 회원의 `role`을 `ADMIN`으로 바꿔 쓴다.
- 운영자 계정에도 이메일이 있어 조회는 된다(구독 대상이 아니라고만 답한다).
- 해제 뒤 같은 기간을 다시 주면 새 행이 생긴다(취소한 행을 되살리지 않는다).
