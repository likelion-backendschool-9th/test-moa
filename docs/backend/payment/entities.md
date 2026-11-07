# 결제·구독·크레딧 엔티티 (#45)

지갑·장부·출금 요청·플랜·구독·결제 엔티티의 규칙과 시나리오. 결제·구독·크레딧 전체에서 정한 것과 데이터 구조 요약은 [README.md](README.md)에 있다.

시나리오 제목 끝의 태그가 확인 방법이다. `[테스트]`만 이 문서 시나리오와 백엔드 테스트가 1:1이고, `[테스트: 파일 번호]`는 **다른** 테스트가 대신 확인할 때 쓴다(예: `credits.spec.ts S352`). `[명령]`은 명령 한 번, `[직접]`은 사람이 API·화면·코드로 확인한다.

## 이슈 #45 확인

이슈 본문의 번호 목록은 이슈를 닫는 조건이고, `#45-S…` 번호는 이 문서에서만 매긴다. 서비스가 하는 일은 해당 API 이슈로 넘긴다([README.md](README.md#api-이슈)).

| 이슈 #45 | 확인 |
| --- | --- |
| 1 신청은 요청 상태 | #45-S13 |
| 2 지급 완료, "완료" 상태 없음 | #45-S14, #45-S23 |
| 3 반려 사유 선택, 반려 상태·처리 일시 | #45-S16, #45-S19 |
| 4 기타는 메모 필수, 다른 사유 메모는 선택(메모는 모두 회원에게 보임) | #45-S17, #45-S18 |
| 5 이미 처리한 요청은 다시 처리 불가 | #45-S15, #45-S20 |
| 6 신청은 적립 → 잠김, 반려는 잠김 → 적립, 장부 없음 | #45-S3, #45-S4, #45-S7, #45-S8 (장부를 남기지 않는 것은 #67-S2, #68-S2) |
| 7 지급하면 잠김에서 빠지고 장부 한 줄 | #45-S5, #45-S6 (장부 행은 #68-S1) |
| 8 출금 가능·결제 가능·총잔액 계산 | #45-S1, #45-S2 |
| 9 장부는 종류·변동량만, 구독 결제는 두 줄 | #45-S9~S11, #45-S22 (장부 행은 #71-S1) |
| 10 승인 대기 보상은 지갑에 저장하지 않음 | #45-S21 |
| 11 결제 1건 = 구독 1건 | #45-S27 |
| 12 구독 중 결제는 이어지는 새 구독 | #71-S1 |
| 13 상태는 ACTIVE로 시작, 환불만 CANCELLED. 구독 중은 날짜로 판단 | #45-S25, #45-S26 (날짜 판단은 #69-S3) |
| 14 플랜 조건이 바뀌면 새 행·버전 | #45-S24 (새 행을 만드는 기능은 플랜 관리가 생길 때) |
| 15 무료는 플랜으로 저장하지 않음 | #69-S1 |

## 1. 잔액 (#45-R1)

지갑은 사용자마다 하나이고 가입할 때 만든다. 적립 잔액에 잠긴 금액을 넣지 않는다. 읽기·변경은 엔티티 메서드로 두고 setter는 쓰지 않는다.

### `credit_wallets`

| 필드 | 컬럼 | 타입 | null | 설명 |
| --- | --- | --- | --- | --- |
| `id` | `id` | Long | 불가 | PK |
| `user` | `user_id` | FK → users | 불가 | 지갑 주인 (`@OneToOne`) |
| `eventCredit` | `event_credit` | Integer | 불가 | 이벤트 크레딧. 구독 결제 가능, 출금 불가. 0으로 시작 |
| `earnedBalance` | `earned_balance` | Integer | 불가 | 적립 잔액. 잠긴 금액 미포함. 출금 가능액과 같음 |
| `lockedBalance` | `locked_balance` | Integer | 불가 | 출금 처리 중. 0으로 시작 |

| 필드 | 출금 | 구독 결제 |
| --- | --- | --- |
| `earnedBalance` | 가능 | 가능(이벤트 다음) |
| `eventCredit` | 불가 | 가능(먼저) |
| `lockedBalance` | 불가 | 불가 |
| `pendingReward` | 잔액 아님 | 잔액 아님 |

- 출금 가능 = `earnedBalance` (`cashable()`)
- 구독 결제 가능 = `earnedBalance + eventCredit` (`payable()`)
- 총잔액 = `earnedBalance + eventCredit + lockedBalance` (`total()`)
- 1크레딧 = 1원. 금액은 1 이상만. 잔액 부족 검사는 메서드 안. 장부 행은 서비스가 남긴다.

#45-S1 처음 잔액은 0 [테스트]
- Given 새 `CreditWallet`
- Then  `cashable()`·`payable()`·`total()`이 0이다

#45-S2 지급 후 계산 [테스트]
- Given `grantEvent(3000)`, `grantEarned(6000)`
- Then  `cashable()` 6000, `payable()` 9000, `total()` 9000

#45-S12 금액이 1 미만이면 거절 [테스트]
- When  `grantEvent(0)` 또는 `grantEarned(-1)` 또는 `lockForCashout(0)`
- Then  `IllegalArgumentException`

#45-S21 승인 대기 보상은 지갑 컬럼이 아님 [직접]
- `CreditWallet`에 `pendingReward` 필드가 없다. 조회 규칙은 [credit-balance-ledger.md](credit-balance-ledger.md) (#66-S1, #66-S3, #91)

## 2. 크레딧 내역 (#45-R2)

장부에는 **총잔액이 실제로 바뀐 일만** 남긴다. `CreditLedger.Type`은 `EVENT`, `EARNED`만 쓴다(`LOCKED` 제거).

### `credit_ledgers`

| 필드 | 컬럼 | 타입 | null | 설명 |
| --- | --- | --- | --- | --- |
| `id` | `id` | Long | 불가 | PK |
| `creditWallet` | `credit_wallet_id` | FK → credit_wallets | 불가 | 변동 지갑 |
| `delta` | `delta` | Integer | 불가 | 변동량(+/−) |
| `description` | `description` | String | 불가 | 원인 문구 |
| `type` | `type` | enum `CreditLedger.Type` | 불가 | `EVENT` / `EARNED` |

결제 연결(`payment_id`)은 두지 않는다. 구독 결제 시 이벤트·적립을 각각 쓴 만큼 행을 만든다(0인 쪽은 행 없음). 내역 화면에는 두 줄이 그대로 보인다. **나중에 환불을 만들 때, 결제 하나에서 이벤트와 적립을 각각 얼마씩 뺐는지 장부만으로는 알 수 없다.** 환불은 지금 범위 밖이라 그때 정한다.

#45-S22 장부에는 종류와 변동량만 [직접]
- `CreditLedger`에 `payment` 필드가 없고, `CreditLedger.Type`은 `EVENT`, `EARNED` 두 값이다

## 3. 출금 신청·내역 (#45-R3)

회원은 금액·계좌로 출금을 신청한다. 신청 시 적립에서 잠긴으로만 옮기고 장부는 없다.

### `cashouts`

| 필드 | 컬럼 | 타입 | null | 설명 |
| --- | --- | --- | --- | --- |
| `id` | `id` | Long | 불가 | PK |
| `user` | `user_id` | FK → users | 불가 | 요청자 |
| `amount` | `amount` | Integer | 불가 | 현금화 크레딧. 1크레딧=1원 |
| `bank` | `bank` | String | 불가 | 입금 은행 |
| `accountNumber` | `account_number` | String | 불가 | 계좌 숫자 10~14자리. **A 컬럼 암호화**([cashout.md](cashout.md)). length 넉넉히 |
| `accountHolder` | `account_holder` | String | 불가 | 예금주. 계좌와 같이 암호화 |
| `status` | `status` | enum `Cashout.Status` | 불가 | `REQUESTED` / `PAID` / `REJECTED` |
| `rejectReason` | `reject_reason` | enum (DB String) | 가능 | `HOLDER` / `ACCOUNT` / `OTHER` |
| `rejectMemo` | `reject_memo` | String | 가능 | 회원에게 보이는 안내. OTHER면 필수, 그 외 선택 |
| `processedAt` | `processed_at` | datetime | 가능 | 지급·반려 일시 |

상태는 `REQUESTED`에서 `PAID` 또는 `REJECTED`로 한 번만 바뀌고 되돌리지 않는다. 생성 시 상태는 항상 `REQUESTED`. 지급 완료는 `PAID` 하나이고 `COMPLETED`는 없앴다.

| 사건 | 지갑 | 장부 |
| --- | --- | --- |
| 출금 신청 | `lockForCashout(amount)` | 없음 |
| 출금 지급 | `confirmCashout(amount)` | `EARNED` −amount |
| 출금 반려 | `releaseCashout(amount)` | 없음 |

장부 `EARNED` 합 = `earnedBalance + lockedBalance`, `EVENT` 합 = `eventCredit`.

#45-S3 출금 잠금 [테스트]
- Given 적립 9,480
- When  `lockForCashout(5000)`
- Then  적립 4,480, 잠김 5,000, 총잔액 9,480

#45-S4 잠금 잔액 부족 [테스트]
- Given 적립 1,000
- When  `lockForCashout(1001)`
- Then  `IllegalArgumentException`

#45-S13 신청 상태는 REQUESTED [테스트]
- When  출금 요청을 만든다
- Then  `status`가 `REQUESTED`다

#45-S23 출금 상태에 "완료"가 없음 [직접]
- `Cashout.Status`는 `REQUESTED`, `PAID`, `REJECTED` 세 값이다. 지급 완료는 `PAID` 하나다

## 4. 운영자 출금 (#45-R4)

운영자가 지급·반려한다. 대기 건만 계좌 전체, 완료는 끝 4자리(저장은 A 암호화, [cashout.md](cashout.md)).

### 반려 사유 `Cashout.RejectReason`

| 값 | 화면 문구 | 회원에게 보이는 사유 |
| --- | --- | --- |
| `HOLDER` | 예금주 이름이 회원 정보와 달라요 | 이 문구 + `rejectMemo`(있으면) |
| `ACCOUNT` | 계좌번호를 확인할 수 없어요 | 이 문구 + `rejectMemo`(있으면) |
| `OTHER` | 기타 | 이 문구 + `rejectMemo`(필수) |

#45-S5 지급 시 잠긴 잔액만 줄임 [테스트]
- Given 잠긴 5,000
- When  `confirmCashout(5000)`
- Then  잠긴 0, 총잔액 감소

#45-S6 지급 시 잠긴 금액 초과 [테스트]
- Given 잠긴 5,000
- When  `confirmCashout(5001)`
- Then  `IllegalStateException`

#45-S7 반려 시 잠긴 금액을 적립으로 [테스트]
- Given 잠긴 5,000
- When  `releaseCashout(5000)`
- Then  적립 5,000, 잠긴 0

#45-S8 반려 시 잠긴 금액 초과 [테스트]
- Given 잠긴 5,000
- When  `releaseCashout(5001)`
- Then  `IllegalStateException`

#45-S14 지급 상태 전이 [테스트]
- Given REQUESTED
- When  `pay(now)`
- Then  상태 `PAID`, `processedAt` 기록

#45-S15 이미 처리한 요청 지급 거절 [테스트]
- Given 이미 `PAID`
- When  다시 `pay`
- Then  `IllegalStateException`

#45-S16 반려 상태 전이 [테스트]
- Given REQUESTED
- When  `reject(HOLDER, "확인 메모", now)`
- Then  상태 `REJECTED`, 사유·메모·처리 시각

#45-S17 OTHER 반려는 메모 필수 [테스트]
- When  `reject(OTHER, "  ", now)`
- Then  `IllegalArgumentException`

#45-S18 OTHER가 아니면 빈 메모는 저장하지 않음 [테스트]
- When  `reject(ACCOUNT, "   ", now)`
- Then  `rejectMemo`가 null

#45-S19 반려 사유 없으면 거절 [테스트]
- When  `reject(null, "메모", now)`
- Then  `IllegalArgumentException`

#45-S20 이미 처리한 요청 반려 거절 [테스트]
- Given 이미 `REJECTED`
- When  다시 `reject`
- Then  `IllegalStateException`

## 5. 플랜 (#45-R5)

무료는 `plans` 행으로 두지 않는다. 혜택 비교의 무료 열(월 10명 등)은 상수·설정이다. 조건이 바뀌면 기존 행을 고치지 않고 `version`을 올린 새 행을 만든다.

### `plans`

| 필드 | 컬럼 | 타입 | null | 설명 |
| --- | --- | --- | --- | --- |
| `id` | `id` | Long | 불가 | PK |
| `tier` | `tier` | String | 불가 | 등급 |
| `cashPrice` | `cash_price` | Integer | 불가 | 현금 가격 |
| `creditPrice` | `credit_price` | Integer | 불가 | 크레딧 가격 |
| `monthlyRecruitLimit` | `monthly_recruit_limit` | Integer | 불가 | 월간 모집 한도 |
| `version` | `version` | Integer | 불가 | 같은 tier의 몇 번째 조건인지 |
| `description` | `description` | TEXT | 가능 | 설명 |
| `imageUrl` | `image_url` | TEXT | 가능 | 이미지 URL |
| `periodDays` | `period_days` | Integer | 불가 | 이용 기간(일) |

`(tier, version)` DB unique(`uk_plans_tier_version`).

| 규칙 | 내용 |
| --- | --- |
| 지금 파는 플랜 | tier별 max(`version`)만 목록·결제에 노출 |
| 플랜 변경 | 새 행 + version+1. 옛 구독은 옛 `plan_id` 유지 |
| 시드 | 구독, version 1, 10,000원, 9,000크레딧, 30일, 월 30명 |

```java
// PlanRepository: 지금 파는 플랜 (tier별 최신 version)
@Query("select p from plans p where p.version = (select max(q.version) from plans q where q.tier = p.tier)")
List<Plan> findCurrentPlans();
```

#45-S24 같은 tier에 같은 version은 하나 [직접]
- `Plan`에 `uk_plans_tier_version`(`tier`, `version`) unique가 있다. 조건이 바뀌면 version을 올린 새 행이라, 구독이 가리키는 옛 행은 그대로 남는다

## 6. 내 구독 (#45-R6)

구독 중인지는 날짜로 판단한다. `EXPIRED`로 바꾸는 배치는 두지 않는다.

### `subscriptions`

| 필드 | 컬럼 | 타입 | null | 설명 |
| --- | --- | --- | --- | --- |
| `id` | `id` | Long | 불가 | PK |
| `user` | `user_id` | FK → users | 불가 | 구독자 |
| `plan` | `plan_id` | FK → plans | 불가 | 산 당시 플랜 행 |
| `startAt` | `start_at` | datetime | 불가 | 이 기간 시작 |
| `endAt` | `end_at` | datetime | 불가 | 이 기간 끝. 만들 때 정하고 고치지 않음 |
| `status` | `status` | enum | 불가 | 만들 때 `ACTIVE`(빌더 고정), 환불 시 `CANCELLED` |

| 규칙 | 내용 |
| --- | --- |
| 구독 중 | `start_at <= 지금 < end_at`이고 `CANCELLED`가 아님 |
| 화면 만료일 | 지금 기간과 빈틈없이 이어지는 행 중 가장 늦은 `end_at` |
| 미리 결제 기간 | 아직 시작 전 행도 `ACTIVE` |

예: 30일 플랜, 11/1에 구독하고 11/20에 미리 결제

| subscriptions.id | start_at | end_at | status | payments.id |
| --- | --- | --- | --- | --- |
| 1 | 11/1 | 12/1 | ACTIVE | 1 |
| 2 | 12/1 | 12/31 | ACTIVE | 2 |

| 조회 시점 | 지금 기간 | 화면 |
| --- | --- | --- |
| 11/25 | 1번 | 구독 중, 만료일 12/31 |
| 12/10 | 2번 | 구독 중, 만료일 12/31 |
| 1/5 | 없음 | 구독 안 함 |

나중에 2번 결제를 환불하면 2번 결제는 `REFUNDED`, 2번 구독은 `CANCELLED`가 되고 **만료일은 12/1로 돌아간다.**

#45-S25 구독은 ACTIVE로 시작 [테스트]
- When  `Subscription`을 빌더로 만든다
- Then  `status`가 `ACTIVE`다. 빌더는 상태를 받지 않는다

## 7. 구독 결제 (#45-R7)

결제 1건 = 이용 기간 1건. 현금은 PG 없이 완료 기록만, 크레딧은 이벤트 우선 차감 후 장부에 종류별 행을 남긴다.

### `payments`

| 필드 | 컬럼 | 타입 | null | 설명 |
| --- | --- | --- | --- | --- |
| `id` | `id` | Long | 불가 | PK |
| `subscription` | `subscription_id` | FK unique | 불가 | 이 결제로 산 기간 (`@OneToOne`) |
| `method` | `method` | enum | 불가 | `CASH` / `CREDIT` |
| `amount` | `amount` | Integer | 불가 | 결제 금액 |
| `paidAt` | `paid_at` | datetime | 불가 | 결제 일시 |
| `status` | `status` | enum | 불가 | 만들 때 `COMPLETED`(빌더 고정), 환불 시 `REFUNDED` |

구독 결제 차감 예(9,000, 이벤트 3,000·적립 6,000):

| type | delta | description |
| --- | --- | --- |
| `EVENT` | −3,000 | 구독 결제(이벤트 크레딧) |
| `EARNED` | −6,000 | 구독 결제(적립 크레딧) |

#45-S9 이벤트 우선 차감 [테스트]
- Given 이벤트 3,000·적립 6,000
- When  `spendForSubscription(9000)`
- Then  `takeEvent` 3000, `takeEarned` 6000

#45-S10 한쪽만 써도 됨 [테스트]
- Given 이벤트 10,000만
- When  `spendForSubscription(9000)`
- Then  `takeEvent` 9000, `takeEarned` 0

#45-S11 결제 가능액 부족 [테스트]
- Given payable 2,000
- When  `spendForSubscription(3000)`
- Then  `IllegalArgumentException`

#45-S26 결제는 COMPLETED로 시작 [테스트]
- When  `Payment`를 빌더로 만든다
- Then  `status`가 `COMPLETED`다. 빌더는 상태를 받지 않는다

#45-S27 결제 1건 = 구독 1건 [직접]
- `Payment.subscription`이 `@OneToOne`, `@JoinColumn(nullable = false, unique = true)`다. 한 구독에 결제가 둘 붙을 수 없다

## 가정
- enum: `Payment.Method` CASH/CREDIT, `Payment.Status` COMPLETED/REFUNDED(엔티티 안에 둠), `Subscription.Status` ACTIVE/EXPIRED/CANCELLED(`EXPIRED`는 저장 시 미사용, 남길지는 [README.md](README.md#아직-정하지-않은-것)의 2번).
- 단위 테스트 이름은 `@DisplayName("#45-S…")`으로 시나리오와 짝짓는다.
