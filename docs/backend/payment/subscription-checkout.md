# 백엔드 구독 결제 화면 조회

시나리오 제목 끝의 태그가 확인 방법이다. `[테스트]`만 이 문서 시나리오와 백엔드 테스트가 1:1이고, `[직접]`은 사람이 API·화면·코드로 확인한다.

이슈: [#70](https://github.com/likelion-backendschool-9th/test-moa/issues/70). 요구·시나리오는 `#70-R…`, `#70-S…`부터 센다. 구독 상태·플랜 규칙은 [subscription.md](subscription.md), 도메인 결정은 [README.md](README.md).

## 한눈에
- 끝나면: 결제 화면이 쓸 값을 서버가 계산해 돌려준다. 고른 플랜, 구독 결제에 쓸 수 있는 크레딧, 크레딧으로 결제할 수 있는지와 모자란 양·남는 크레딧, 구독 중인지와 지금 만료일, 이번에 결제하면 생기는 이용 기간이다. 조회만 하고 아무것도 바꾸지 않는다.
- 선행: #69(`SubscriptionService.getStatus`, `payable()`, 플랜 목록 규칙).
- 화면: `/my/subscription/checkout` — [subscription.md](../../frontend/payment/subscription.md)
- 결제 실행은 #71, 프론트 목업 제거와 API 연동은 이 이슈 범위 밖이다.

## 정한 것 (#70)
- **경로는 `GET /api/v1/my/subscription/checkout?planId=`다.** #69와 같이 토큰의 회원을 쓰고 경로에 회원 id를 받지 않는다. 이슈 본문의 `/api/users/{userId}/subscription/checkout`은 쓰지 않는다.
- **`planId`는 지금 파는 플랜의 id여야 한다.** 없는 id이거나 옛 `version` 행이면 404다. 결제는 지금 파는 조건으로만 받기 때문이다. `planId`가 빠졌거나 숫자가 아니면 400이다.
- **`period.startAt`은 `max(지금, ACTIVE 행 중 가장 늦은 endAt)`이다.** #71 결제 실행이 쓸 시작 규칙과 같게 둔다([README.md](README.md)의 #71). `currentEndAt`은 #69의 화면 만료일(지금 기간에서 빈틈없이 이어 붙인 끝)이다. 결제가 항상 가장 늦은 끝에 이어 붙어서 빈틈이 생기지 않으므로 보통 둘은 같다. 다르게 나오는 경우가 둘 있다. ① 지금 기간이 환불로 `CANCELLED`가 됐는데 미리 결제한 다음 기간이 `ACTIVE`로 남은 경우, ② 시작 전인 `ACTIVE` 행만 있는 경우다. 이때는 `active=false`, `currentEndAt=null`이지만 `period.startAt`은 지금이 아니라 남은 `ACTIVE` 행의 가장 늦은 `endAt`이다. 그래서 화면은 이용 기간을 `currentEndAt`이 아니라 `period`로 보여 준다. (2026-11-08)
- **`period.endAt`은 한국 날짜의 끝이다(23:59:59).** (시작이 속한 한국 날짜 + `periodDays`일)의 23:59:59다. 예: 11/8 11:15에 시작하는 30일 플랜은 12/8 23:59:59에 끝난다. 시작한 날은 일부만 쓰고 그 뒤 `periodDays`일을 모두 쓰는 셈이다. 이어 붙은 다음 기간은 앞 기간의 끝(한국 날짜의 23:59:59)에서 시작해도 그 한국 날짜가 기준이라 `periodDays`일씩 정확히 늘어난다. (2026-11-08, 팀의 "마감은 그날 23:59:59까지" 규칙 [프로젝트 README](../project/README.md) 10을 따름)
- **날짜는 한국 시간으로 정하고, 저장하는 시각은 다른 코드처럼 서버 시간대의 값이다.** 한국 날짜의 끝을 서버 시간대로 바꿔 돌려준다. 서버가 UTC면 23:59:59가 14:59:59가 된다. 서버 설정을 바꾸지 않고, 시각을 다른 테이블과 같은 기준으로 비교하기 위해서다([프로젝트 README](../project/README.md) 9). 계산은 `SubscriptionTime.endAt`이 하고 결제 실행(#71)도 같은 메서드를 쓴다. (2026-11-08)
- **크레딧이 모자라면 `remainingAfter`는 `null`이다.** 0이나 음수로 내려주지 않는다. 현금 결제는 크레딧과 상관없이 할 수 있다.
- **응답 시각에는 시간대 정보가 없다.** `2026-12-08T14:59:59`처럼 서버 시간대의 값이다. 서버가 UTC면 한국 시간으로 바꿔 보여 줘야 해서, 프론트가 만료일을 날짜로 보여 줄 때 이 점을 알려야 한다(#92부터 모든 API가 같다).
- **운영자는 `eligible=false`만 돌려준다.** 플랜을 찾는 일도 하지 않는다.

## API

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| `GET` | `/api/v1/my/subscription/checkout?planId=` | 구독 결제 화면 조회. 로그인 필요 |

`SubscriptionController`·`SubscriptionService`에 메서드를 더한다(#69의 쌍).

### 응답

| 필드 | 의미 |
| --- | --- |
| `eligible` | 구독 대상인지. 운영자는 `false`이고 아래 필드가 모두 `null`이다 |
| `plan` | 고른 플랜 한 건. [플랜 응답](subscription.md#구독-플랜-응답-get-apiv1plans)과 같은 모양 |
| `payableCredits` | 구독 결제에 쓸 수 있는 크레딧. 지갑이 없으면 0 |
| `active` | 지금 구독 중인지 |
| `currentEndAt` | 지금 만료일. 구독 중이 아니면 `null` |
| `credit.affordable` | `payableCredits >= plan.creditPrice` |
| `credit.shortfall` | 모자란 크레딧 = `max(0, creditPrice - payableCredits)` |
| `credit.remainingAfter` | 크레딧으로 결제하면 남는 크레딧. 모자라면 `null` |
| `period.startAt` | 이번 결제의 이용 시작 |
| `period.endAt` | 이번 결제의 이용 끝 |

## 규칙

| 규칙 | 내용 |
| --- | --- |
| 결제 가능 크레딧 | #69와 같다: 이벤트 + 적립, 출금 처리 중(잠김) 제외 |
| 구독 중 | #69와 같다(`ACTIVE`이고 `startAt <= 지금 < endAt`) |
| 이용 시작 | 끝나지 않은 `ACTIVE` 행이 없으면 지금, 있으면 그 가운데 가장 늦은 `endAt`. 구독 중이 아니어도(시작 전 `ACTIVE` 행만 있어도) 그 행의 끝이다. 취소된 행은 세지 않는다 |
| 이용 끝 | (시작이 속한 한국 날짜 + `periodDays`일)의 23:59:59. 서버 시간대로 바꿔 돌려준다 |
| 운영자 | 결제 대상이 아니다(`eligible=false`) |
| 끝 시각 | 끝은 포함하지 않는다. 구독 중인지는 `지금 < endAt`으로 보므로 23:59:59.000부터는 구독 중이 아니다("23:59:59까지"보다 1초 짧다) |

---

## 시나리오

#70-S1 구독하지 않은 회원의 결제 화면 [테스트]
- Given 구독 행이 없고 payable이 10,000인 회원, 크레딧 9,000·현금 10,000·30일 플랜
- When  `GET /api/v1/my/subscription/checkout?planId=`
- Then  `plan`이 그 플랜이고 `payableCredits=10000`, `active=false`, `currentEndAt=null`이다
- Then  `period.startAt`은 지금이고 `period.endAt`은 시작한 한국 날짜 + 30일의 23:59:59다

#70-S2 크레딧이 모자란 회원 [테스트]
- Given payable이 4,000이고 크레딧 가격이 9,000
- Then  `credit.affordable=false`, `shortfall=5000`, `remainingAfter=null`이다. 응답에는 현금 가격도 들어 있어 현금 결제를 고를 수 있다

#70-S3 크레딧으로 결제하면 남는 크레딧 [테스트]
- Given payable이 10,000이고 크레딧 가격이 9,000
- Then  `credit.affordable=true`, `shortfall=0`, `remainingAfter=1000`이다
- Given payable이 정확히 9,000
- Then  `affordable=true`, `remainingAfter=0`이다. 지갑이 없는 회원은 payable이 0이다

#70-S4 구독 중이면 만료일부터 이어 붙는다 [테스트]
- Given 지금 기간이 12/1까지인 회원, 30일 플랜
- Then  `active=true`, `currentEndAt=12/1`, `period.startAt=12/1`, `period.endAt=12/31 23:59:59`이다
- Given 12/1~12/31으로 미리 결제해 이어 붙은 기간이 있는 회원
- Then  `currentEndAt`과 `period.startAt`이 12/31이다

#70-S5 끝났거나 취소된 구독은 이어 붙지 않는다 [테스트]
- Given `endAt`이 지났지만 `ACTIVE`인 행만 있는 회원, 또는 `CANCELLED` 행만 있는 회원
- Then  `active=false`, `currentEndAt=null`, `period.startAt`은 지금이다
- Given 11/1~12/1 `ACTIVE`, 12/1~12/31 `CANCELLED`
- Then  11/25에 `period.startAt`은 12/1이다
- Given 지금 기간(11/1~11/30)이 환불로 `CANCELLED`가 되고 미리 결제한 12/1~12/31이 `ACTIVE`로 남았다(시작 전)
- Then  `active=false`, `currentEndAt=null`이지만 `period.startAt`은 12/31이다
- Given 지금 기간이 12/1까지이고 12/5~1/4 행이 따로 있다(빈틈)
- Then  `currentEndAt`은 12/1이고 `period.startAt`은 1/4이다

#70-S6 운영자는 결제 대상이 아니다 [테스트]
- Given 운영자 토큰
- Then  `eligible=false`이고 나머지 필드가 `null`이다

#70-S7 플랜 id 검사 [테스트]
- When  `planId`가 없거나 숫자가 아니다
- Then  400
- When  없는 `planId`이거나 옛 `version` 행의 id다
- Then  404

#70-S8 로그인이 필요하다 [테스트]
- When  토큰 없이 `GET /api/v1/my/subscription/checkout?planId=`
- Then  401

#70-S9 전체 흐름 [직접]
- API: 위 표의 하나
- Given 일반 회원과 운영자 토큰(`POST /api/auth/login`), 운영자가 `POST /api/v1/admin/plans`로 등록한 플랜(`planId`)
- Then  모두 `GET /api/v1/my/subscription/checkout?planId=`로 확인한다
  1. 구독 전, 크레딧 9,000 미만: `active=false`, `currentEndAt=null`, `credit.affordable=false`, `shortfall=9000-payableCredits`, `remainingAfter=null`, `period.endAt`은 시작한 한국 날짜 + `periodDays`일의 23:59:59
  2. 지갑에 이벤트 크레딧 10,000: `affordable=true`, `shortfall=0`, `remainingAfter=1000`. 정확히 9,000이면 `remainingAfter=0`
  3. `subscriptions`에 `ACTIVE` 행(시작=지금−10일, 끝=지금+20일): `active=true`, `currentEndAt`과 `period.startAt`이 그 끝, `period.endAt`은 거기서 `periodDays`일 뒤의 23:59:59. 끝이 이어지는 행을 더 넣으면 두 번째 행의 끝부터
  4. 그 행을 `CANCELLED`로 바꾸거나 `end_at`을 과거로 바꾼다: `active=false`, `currentEndAt=null`, `period.startAt`은 지금
  5. 운영자 토큰: 200, `eligible=false`, `plan`·`credit`·`period`는 `null`
  6. `planId` 없음·`abc` → 400, 없는 id → 404, 같은 `tier`를 다시 등록한 뒤 옛 id → 404·새 id → 200, 토큰 없음 → 401
  7. 위를 여러 번 불러도 `credit_wallets` 잔액과 `subscriptions` 행 수가 그대로다(조회 전용)

#70-S10 이용 끝은 한국 날짜의 끝이다 [테스트]
- Given 서버 시간대가 서울이고 11/8 11:15에 시작하는 30일 플랜
- Then  `period.endAt`은 12/8 23:59:59다
- Given 서버 시간대가 UTC이고 11/8 02:15(UTC)에 시작한다
- Then  `period.endAt`은 12/8 14:59:59(UTC)다. 한국 시간으로 12/8 23:59:59와 같은 순간이다
- Given UTC 11/8 16:00(한국 11/9 01:00)에 시작한다
- Then  한국 날짜가 11/9라서 `period.endAt`은 12/9 14:59:59(UTC)다
- Given 앞 기간의 끝(12/8 23:59:59)에서 이어 붙는다
- Then  다음 끝은 1/7 23:59:59다(`periodDays`일씩 정확히 늘어난다)

---

## 범위 밖
- 결제 실행(#71)과 더블클릭 방지
- 프론트 목업 제거·API 연동
- 결제 수단별 수수료나 쿠폰

## 작업 순서
1. 응답 DTO(`CheckoutResponse`와 `credit`·`period` 모양)
2. `SubscriptionService.getCheckout`과 이용 시작 계산(가장 늦은 `ACTIVE` `endAt`을 읽는 메서드)
3. `SubscriptionController`에 경로 추가
4. 시나리오 S1~S8 테스트
5. 문서 정리(README 이슈 표 링크)

## 가정
- `SubscriptionService.getStatus`·`getPayableCredits`·`PlanRepository.findCurrentPlans`는 #69에 있다.
- 조회 단계에서는 지갑 행을 잠그지 않는다. 값은 안내용이고, 결제 실행(#71)이 잠근 채로 다시 계산한다.
