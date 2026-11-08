# 백엔드 구독 결제 실행

시나리오 제목 끝의 태그가 확인 방법이다. `[테스트]`만 이 문서 시나리오와 백엔드 테스트가 1:1이고, `[직접]`은 사람이 API·화면·코드로 확인한다.

이슈: [#71](https://github.com/likelion-backendschool-9th/test-moa/issues/71). 요구·시나리오는 `#71-R…`, `#71-S…`부터 센다. 결제 화면 조회는 [subscription-checkout.md](subscription-checkout.md), 구독 상태·플랜은 [subscription.md](subscription.md), 엔티티는 [entities.md](entities.md), 도메인 결정은 [README.md](README.md).

## 한눈에
- 끝나면: 결제 수단(현금·크레딧)과 플랜을 골라 결제하면 결제 한 건과 이용 기간(구독) 한 건이 짝으로 저장된다. 크레딧 결제는 지갑에서 빼고 크레딧 내역에 남긴다. 결제 이력도 조회한다. 실제 PG 결제는 하지 않고, 현금은 완료 기록만 남긴다.
- 선행: #70(결제 화면 조회), #69(플랜·구독 상태), #66(지갑·내역).
- 화면: `/my/subscription/checkout` → 결제 뒤 `/my/subscription?notice=paid` — [subscription.md](../../frontend/payment/subscription.md)
- 프론트 목업 제거와 API 연동, 환불은 이 이슈 범위 밖이다.

## 정한 것 (#71)
- **경로는 `POST /api/v1/my/subscription/checkout`이다.** 본문은 `planId`, `method`(`CASH`|`CREDIT`). #69·#70과 같이 토큰의 회원을 쓰고 경로에 회원 id를 받지 않는다. 이슈 본문의 `/api/users/{userId}/subscription/checkout`은 쓰지 않는다. 결제 이력은 `GET /api/v1/my/subscription/payments`다.
- **컨트롤러·서비스는 `PaymentController`·`PaymentService` 한 쌍이다.** 결제 실행과 이력을 맡는다. 화면 값을 계산하는 `GET .../checkout`(#70)은 `SubscriptionController`에 그대로 둔다.
- **동시에 두 번 결제할 때는 지갑 행을 잠근다.** 운영자와 플랜 검사를 마친 뒤 그 회원의 지갑 행을 `PESSIMISTIC_WRITE`로 잠그고, 이용 시작을 계산하는 읽기도 그 안에서 한다. 잠그지 않으면 두 요청이 같은 "가장 늦은 `end_at`"을 읽어 같은 기간 행이 두 개 생길 수 있다. 현금 결제도 같은 지갑 행을 잠가서 현금과 크레딧이 섞여도 한 줄로 처리된다. 처음 구독하는 회원은 잠글 구독 행이 없어서 구독 행이 아니라 지갑 행을 잠근다.
- **지갑은 결제할 때 없으면 만든다.** 가입할 때 지갑을 만드는 코드가 없다(회원가입은 `CreditWallet`을 만들지 않는다). 그래서 결제 트랜잭션이 먼저 "없을 때만 넣는" SQL(`INSERT … ON CONFLICT (user_id) DO NOTHING`)로 지갑을 만든 뒤 그 행을 잠근다. 처음 결제 둘이 동시에 와도 유일 제약 오류 없이 지갑은 하나다. 모집 유형을 처음 쓸 때 만드는 방식(`TypeRepository.insertIfAbsent`)과 같다. 결제가 실패해 롤백되면 이때 만든 지갑도 같이 사라진다.
- **더블클릭은 직전 결제 후 5초 안이면 거절한다.** 그 회원의 가장 최근 결제의 `paidAt`이 `지금 − 5초`보다 뒤면 플랜·수단과 상관없이 409(`DUPLICATE_PAYMENT`)다. 지갑을 잠근 뒤에 확인해서 동시에 온 요청도 막는다. 5초가 지나면 미리 결제(연장)는 다시 할 수 있다.
- **이용 기간은 #70과 같은 규칙이다.** 시작 = `max(지금, 끝나지 않은 ACTIVE 행 중 가장 늦은 end_at)`, 끝 = 시작 + `periodDays`일. 조회 응답 값은 받지 않고 결제할 때 다시 계산한다([README.md](README.md)의 #71).
- **금액은 고른 수단의 가격이다.** `CASH`는 `plan.cashPrice`, `CREDIT`은 `plan.creditPrice`. 가격이 0이면 그대로 결제하고 크레딧 차감과 내역 행은 만들지 않는다(`spendForSubscription`은 1 이상만 받는다).
- **크레딧은 이벤트를 먼저 쓰고 모자란 만큼 적립에서 뺀다.** `CreditWallet.spendForSubscription`을 쓴다. 출금 처리 중(잠긴) 크레딧은 `payable()`에 들어가지 않아 쓰지 않는다. 내역에는 이벤트 한 줄, 적립 한 줄로 남고 0인 쪽은 행이 없다. 설명은 `구독 결제(이벤트 크레딧)`, `구독 결제(적립 크레딧)`다.
- **산 플랜은 산 당시 행이다.** `Subscription.plan`은 결제할 때의 지금 파는 플랜 행을 가리킨다. 지금 파는 플랜(같은 `tier`의 가장 큰 `version`)이 아니면 404다(#70과 같음).
- **운영자는 결제 대상이 아니라 403이다.** 결제 이력은 빈 배열이다.
- **응답 시각에는 시간대 정보가 없다.** 서버 시간대의 값이다(다른 API와 같다). 프론트가 한국 시간으로 바꿔 써야 한다([subscription-checkout.md](subscription-checkout.md)).
- **만료로 바꾸는 배치는 두지 않는다.** 구독 중인지는 날짜로 판단한다.

## API

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| `POST` | `/api/v1/my/subscription/checkout` | 구독 결제 실행. 로그인 필요 |
| `GET` | `/api/v1/my/subscription/payments` | 내 결제 이력(최신순). 로그인 필요 |

### 결제 요청·응답 (`POST`, 201)

| 본문 필드 | 규칙 |
| --- | --- |
| `planId` | 필수. 지금 파는 플랜의 id |
| `method` | 필수. `CASH` 또는 `CREDIT` |

| 응답 필드 | 의미 |
| --- | --- |
| `paymentId` | 만든 결제의 id |
| `method`, `amount` | 결제 수단과 금액 |
| `paidAt` | 결제 시각 |
| `period.startAt`, `period.endAt` | 이번 결제로 생긴 이용 기간 |
| `payableCredits` | 결제한 뒤 구독 결제에 쓸 수 있는 크레딧 |

### 결제 이력 응답 (`GET`)

최신순(결제 시각이 늦은 것부터) 배열이다. 한 건:

| 필드 | 의미 |
| --- | --- |
| `paymentId` | 결제 id |
| `plan` | 산 플랜의 `tier` |
| `method`, `amount`, `status` | 수단, 금액, 상태(`COMPLETED`·`REFUNDED`) |
| `paidAt` | 결제 시각 |
| `period.startAt`, `period.endAt` | 그 결제로 산 이용 기간 |

페이지 나누기는 하지 않는다. 회원 한 명의 결제는 많지 않다.

### 실패 응답

| 상황 | 상태 | 코드 |
| --- | --- | --- |
| `planId`·`method`가 없거나 잘못됨 | 400 | `INVALID_INPUT` |
| 토큰 없음 | 401 | `UNAUTHORIZED` |
| 운영자 | 403 | `FORBIDDEN` |
| 없는 플랜, 지금 파는 플랜이 아님 | 404 | `NOT_FOUND` |
| 직전 결제 후 5초 안 | 409 | `DUPLICATE_PAYMENT` |
| 크레딧 결제인데 `payableCredits`가 모자람 | 409 | `INSUFFICIENT_CREDIT` |

두 409는 `ErrorCode`에 더한다.

## 규칙

| 규칙 | 내용 |
| --- | --- |
| 한 트랜잭션 | ① 지갑 없으면 만들기 ② 지갑 행 잠금 ③ 검증(더블클릭, 크레딧 잔액) ④ 이용 시작·끝 계산 ⑤ `Subscription`(ACTIVE) 저장 ⑥ `Payment`(COMPLETED) 저장 ⑦ 크레딧이면 차감·내역 저장 ⑧ 커밋. 어느 단계든 실패하면 전부 롤백되고 잠금도 풀린다 |
| 검증 순서 | 운영자 → 플랜 → (지갑 잠금) → 더블클릭 → 크레딧 잔액 |
| 구독 1 : 결제 1 | 결제 한 건마다 구독 행 한 건이 짝이다([entities.md](entities.md)) |
| 이용 시작 | `max(지금, 끝나지 않은 ACTIVE 행 중 가장 늦은 end_at)`. 취소된 행은 세지 않는다 |
| 이용 끝 | 시작 + `periodDays`일 |
| 더블클릭 | 가장 최근 결제의 `paidAt > 지금 − 5초`면 거절 |
| 크레딧 차감 | 이벤트 먼저, 모자란 만큼 적립. `payable()` 이하만 가능 |
| 환불 | 이 이슈에서 하지 않는다 |

---

## 시나리오

#71-S1 구독하지 않은 회원의 현금 결제 [테스트]
- Given 구독 행이 없는 회원, 현금 10,000·크레딧 9,000·30일 플랜
- When  `POST /api/v1/my/subscription/checkout` `method=CASH`
- Then  201. 결제 한 건(`CASH`, 10,000, `COMPLETED`)과 구독 한 건(`ACTIVE`, 시작=지금, 끝=지금+30일)이 짝으로 저장된다
- Then  지갑 잔액은 그대로이고 크레딧 내역은 늘지 않는다

#71-S2 구독 중이면 가장 늦은 만료일부터 이어진다 [테스트]
- Given 지금 기간이 12/1까지인 회원
- Then  새 구독의 시작은 12/1, 끝은 12/31이다
- Given 12/1~12/31으로 이미 이어 붙은 기간이 있는 회원
- Then  시작은 12/31이다. 취소된 기간은 세지 않는다
- Given 끝났거나 취소된 기간만 있는 회원
- Then  시작은 지금이다

#71-S3 크레딧 결제는 이벤트 크레딧을 먼저 쓴다 [테스트]
- Given 이벤트 5,000·적립 6,000, 크레딧 가격 9,000
- When  `method=CREDIT`
- Then  이벤트 0, 적립 2,000이 된다. 결제 금액은 9,000이다
- Then  크레딧 내역에 이벤트 −5,000 한 줄(`구독 결제(이벤트 크레딧)`), 적립 −4,000 한 줄(`구독 결제(적립 크레딧)`)이 남는다

#71-S4 한쪽 크레딧만 쓰면 내역은 한 줄이다 [테스트]
- Given 이벤트 10,000, 크레딧 가격 9,000
- Then  이벤트만 −9,000 한 줄이고 적립 행은 없다
- Given 이벤트 0·적립 10,000
- Then  적립만 −9,000 한 줄이다

#71-S5 출금 처리 중인 크레딧은 쓰지 않는다 [테스트]
- Given 적립 6,000 중 4,000이 출금 처리 중(잠김), 이벤트 3,000, 크레딧 가격 9,000
- Then  쓸 수 있는 크레딧은 5,000이라 409 `INSUFFICIENT_CREDIT`이다. 잠긴 금액은 그대로다

#71-S6 크레딧이 모자라면 크레딧 결제는 되지 않는다 [테스트]
- Given 쓸 수 있는 크레딧이 8,999, 크레딧 가격 9,000
- When  `method=CREDIT`
- Then  409 `INSUFFICIENT_CREDIT`. 결제·구독·내역이 늘지 않고 지갑도 그대로다
- When  같은 회원이 `method=CASH`로 결제한다
- Then  201. 현금 결제는 크레딧과 상관없이 된다
- Given 지갑이 없는 회원
- Then  크레딧 결제는 409이고 지갑 행은 남지 않는다(롤백)

#71-S7 더블클릭은 5초 안이면 거절한다 [테스트]
- Given 방금 결제한 회원
- When  5초 안에 같은 결제를 다시 보낸다
- Then  409 `DUPLICATE_PAYMENT`. 결제·구독이 늘지 않고 크레딧도 다시 빠지지 않는다
- When  마지막 결제가 5초보다 오래됐다
- Then  201. 미리 결제(연장)가 된다
- Given 마지막 결제가 지금보다 정확히 5초 전이다
- Then  201이다. `paidAt > 지금 − 5초`일 때만 거절한다
- Given 마지막 결제가 지금보다 4.999초 전이다
- Then  409 `DUPLICATE_PAYMENT`다

#71-S8 동시에 두 번 결제해도 기간이 겹치지 않는다 [테스트]
- Given 같은 회원이 서로 다른 스레드로 거의 동시에 결제 요청 둘을 보낸다
- Then  하나만 201이고 다른 하나는 409다(더블클릭 규칙). 구독은 한 건이고 기간이 겹치지 않는다
- Given 더블클릭 시간을 지난 뒤의 두 요청이 겹쳐 들어오는 경우(시계를 조절한 테스트)
- Then  지갑 잠금 때문에 두 요청이 차례로 처리되어 두 번째 시작이 첫 번째 끝과 같다

#71-S9 지갑이 없는 회원도 현금으로 결제할 수 있다 [테스트]
- Given 지갑이 없는 회원
- When  `method=CASH`
- Then  201. 지갑이 잔액 0으로 만들어진다
- Given 지갑이 없는 같은 회원의 첫 결제 둘이 동시에 온다
- Then  하나는 201이고 다른 하나는 409이며, 지갑은 하나다(`ON CONFLICT DO NOTHING`). 구독도 한 건이다(S8)

#71-S10 중간에 실패하면 모두 되돌려진다 [테스트]
- Given 결제 저장 이후(내역 저장 등)에 예외가 나는 상황
- Then  결제·구독·지갑 변동·내역이 모두 저장되지 않는다

#71-S11 입력 검사 [테스트]
- When  `planId`가 없거나 `method`가 없거나 `CASH`·`CREDIT`이 아니다
- Then  400
- When  없는 `planId`이거나 옛 `version` 행의 id다
- Then  404. 결제가 생기지 않는다

#71-S12 운영자는 결제할 수 없다 [테스트]
- Given 운영자 토큰
- Then  결제는 403이고 결제 이력은 빈 배열이다

#71-S13 로그인이 필요하다 [테스트]
- When  토큰 없이 결제와 이력을 부른다
- Then  401

#71-S14 결제한 뒤 구독 화면의 값이 바뀐다 [테스트]
- Given 크레딧으로 결제한 회원
- Then  `GET /api/v1/my/subscription/status`가 `active=true`와 바뀐 만료일을 주고, `/payable-credits`와 `/checkout`(#70)의 `payableCredits`가 차감된 값이다

#71-S15 결제 이력은 최신순이다 [테스트]
- Given 결제 세 건(시각이 다름)
- When  `GET /api/v1/my/subscription/payments`
- Then  결제 시각이 늦은 것부터 나오고, 각 건에 산 플랜의 `tier`, 수단, 금액, 상태, 이용 기간이 있다
- Given 결제가 없는 회원
- Then  빈 배열이다
- Given 다른 회원의 결제가 있다
- Then  내 이력에는 내 결제만 나오고 다른 회원의 결제는 나오지 않는다(토큰의 회원으로만 조회한다)

#71-S16 전체 흐름 [직접]
- Given 일반 회원 토큰, 운영자가 등록한 플랜(`planId`)
- Then  Postman으로 확인한다
  1. 지갑 없는 회원이 `CASH`로 결제: 201, `GET .../status`가 `active=true`
  2. 5초 안에 다시 결제: 409 `DUPLICATE_PAYMENT`
  3. 5초 뒤 다시 결제: 201, 시작이 앞 기간의 끝
  4. 이벤트·적립 크레딧을 SQL로 넣고 `CREDIT` 결제: 이벤트 먼저, 크레딧 내역에 두 줄(`GET /api/v1/my/credits/ledger`)
  5. 크레딧 모자란 상태로 `CREDIT` 결제: 409 `INSUFFICIENT_CREDIT`
  6. 운영자 토큰: 결제 403
  7. `GET .../payments`: 최신순

#71-S17 크레딧 가격이 0이면 차감 없이 결제된다 [테스트]
- Given 크레딧 가격이 0인 플랜, 이벤트 크레딧이 있는 회원
- When  `method=CREDIT`
- Then  201, `amount=0`이다. 지갑은 그대로이고 크레딧 내역 행은 만들지 않는다(`spendForSubscription`은 1 이상만 받는다)

---

## 범위 밖
- 환불과 취소(`Payment`의 `REFUNDED`, 구독 `CANCELLED`로 바꾸는 일). 환불은 결제 하나에서 이벤트와 적립을 각각 얼마씩 뺐는지 장부만으로 알 수 없어서 그때 정한다([entities.md](entities.md))
- 실제 PG 결제와 영수증
- 프론트 목업 제거·API 연동(`/my/subscription/checkout`, 결제 뒤 `?notice=paid`)
- 결제 이력의 페이지 나누기·기간 조건
- 이용 끝을 한국 날짜의 끝(23:59:59)으로 맞추는 안: 팀과 확인한 뒤 정한다([subscription-checkout.md](subscription-checkout.md))
- 가입할 때 지갑을 만드는 일(인증 담당 코드). 지금은 결제가 필요할 때 만든다

## 작업 순서
1. `CreditWalletRepository.insertIfAbsent`와 결제 이력·최근 결제 조회 메서드, `ErrorCode` 두 개
2. 요청·응답 DTO(`PaymentRequest`, `PaymentResponse`, `PaymentHistoryResponse`)
3. `PaymentService`(결제 실행: 지갑 만들기·잠금·검증·기간 계산·저장·차감·내역)와 이력 조회
4. `PaymentController`(`POST`·`GET`)
5. 시나리오 S1~S15·S17 테스트(동시성 S8·S9는 스레드 테스트)
6. 문서 정리(README 이슈 표 링크, #71 섹션을 이 문서로 연결, 진행 표기 확인)

## 가정
- `CreditWallet.spendForSubscription`·`payable()`, `findByUserIdForUpdate`, `Payment`·`Subscription`·`CreditLedger` 엔티티는 #45·#66에 있다.
- 지갑은 회원마다 하나이고 `credit_wallets.user_id`에 유일 제약이 있다(`ON CONFLICT (user_id)`가 쓰는 제약).
- `SecurityConfig`는 공개 경로(`PUBLIC_PATHS`) 밖의 모든 요청에 로그인을 요구한다(`anyRequest().authenticated()`). 그래서 결제와 이력 API는 따로 설정할 것이 없고, 토큰이 없으면 401이다.
- 시각은 서버 시간대의 `LocalDateTime.now()`다(다른 코드와 같다).
