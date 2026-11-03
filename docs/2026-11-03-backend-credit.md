# 백엔드 크레딧 세부 계획 (유스케이스)

- 상위: `docs/2026-11-03-backend-payment-subscription-credit.md`
- 프론트: `docs/2026-10-30-frontend-credits.md`, `docs/frontend-admin-withdrawals.md`
- 단위: **유스케이스(API·트랜잭션)**
- 인증: 당분간 `userId` 경로

## 한눈에

엔티티는 있다. Repository·Service·API와 잔액 규칙을 UC 순으로 구현한다.

## 잔액 규칙

| 필드 | 의미 | 출금 | 구독 결제 |
| --- | --- | --- | --- |
| `earnedBalance` | 적립(잠금 포함) | 잠금 제외분 | 잠금 제외분 |
| `eventCredit` | 이벤트 | 불가 | 가능(먼저) |
| `lockedBalance` | 출금 처리 중 | 불가 | 불가 |
| `pendingReward` | Feedback SUBMITTED 합 | 잔액 아님 | 잔액 아님 |

- 총잔액 = earned + event  
- 출금 가능 = earned − locked  
- 구독 결제 가능 = earned − locked + event  
- 1크레딧 = 1원. 최소 출금액 미정 → 1 이상만 검사

## UC-C0 스키마 갭 (메서드 아님 · 엔티티/DB)

쓰기 UC보다 먼저. 단독 커밋 또는 C1과 같은 PR.

| 변경 | 내용 | 상태 |
| --- | --- | --- |
| `CashoutRequest` | `bank`, `accountNumber`, `accountHolder`, `rejectReason` 추가 | 반영 |
| `pendingReward` | wallet 컬럼 없음. Feedback 합으로 조회 | 반영(주석) |
| `CashoutStatus` | `COMPLETED` 제거. 지급 완료는 `PAID`만 | 반영 |
| `CreditType` | `LOCKED` 제거. 잠금/해제는 ledger에 안 남김 | 반영 |

### enum 정리 (테이블·이유)

| enum | 영향 컬럼(테이블) | 제거한 값 | 이유 |
| --- | --- | --- | --- |
| `CashoutStatus` | `cashout_requests.status` | `COMPLETED` | 지급 완료 의미가 `PAID`와 겹침. 프론트도 “지급 완료” 하나로 통일. `PAID`만 사용 |
| `CreditType` | `credit_ledgers.type` | `LOCKED` | 출금 잠금/해제는 `lockedBalance`만 바꾸고 ledger 행을 만들지 않음. type에 잠금이 있을 이유가 없음 |

잠금/해제는 ledger에 **안 남긴다**. ledger는 잔액이 바뀐 사건만.  
(`PaymentStatus.COMPLETED`는 결제 상태라 이번 변경과 무관.)

Payment `@ManyToOne`은 결제 P0에서 다룬다(크레딧 C0 범위 밖).

---

## UC-C1 잔액 조회

- API: `GET /api/users/{userId}/credits`
- 응답: earnedBalance, eventCredit, lockedBalance, pendingReward, totalCredits, payableCredits, cashableCredits
- 화면: `/my`, `/my/credits`

## UC-C2 크레딧 내역 조회

- API: `GET /api/users/{userId}/credits/ledgers?type=all|in|out`
- in = delta>0, out = delta<0. 잘못된 type → 400
- 구독 결제: DB에 EVENT/EARNED 행이 나뉘어 있어도, **같은 결제의 "구독 결제" 행은 합쳐 한 줄**로 응답 (프론트·S346과 동일)
- 화면: `/my/credits`, `/my` 최근 내역

## UC-C3 출금 내역 조회

- API: `GET /api/users/{userId}/credits/cashouts`
- 상태: REQUESTED=처리 중, PAID=지급 완료, REJECTED=반려
- 화면: `/my/credits/withdrawals`

## UC-C4 출금 신청 (잠금)

- API: `POST /api/users/{userId}/credits/cashouts`
- body: amount, bank, accountNumber, accountHolder
- 트랜잭션: 가능액 검증 → CashoutRequest(REQUESTED) → lockedBalance += amount (ledger 없음)

## UC-C5 운영자 출금 목록·상세

- API: `GET /api/admin/cashouts?tab=pending|done`, `GET /api/admin/cashouts/{id}`
- 대기 건만 계좌 전체, 완료는 끝 4자리
- 화면: `/admin/withdrawals`

## UC-C6 출금 지급

- API: `POST /api/admin/cashouts/{id}/pay`
- 트랜잭션: earned−=, locked−=, status=PAID, processedAt, ledger "출금 지급" −amount

## UC-C7 출금 반려

- API: `POST /api/admin/cashouts/{id}/reject` + rejectReason
- 트랜잭션: locked−=, REJECTED (earned 유지, ledger 없음)

## UC-C8 지급·차감 포트 (타 도메인용)

HTTP 필수는 아님. 결제가 호출.

| 메서드 | 동작 |
| --- | --- |
| `grantEvent` | eventCredit +=, ledger + (type=EVENT) |
| `grantEarned` | earnedBalance +=, ledger + (type=EARNED) |
| `spendForSubscription` | 아래 장부 규칙 |

### 구독 결제 장부 규칙 (`spendForSubscription`, UC-P2와 동일)

기획: 가입(이벤트) 크레딧을 먼저 쓰고, 모자란 만큼 적립에서 뺀다. 화면 내역은 "구독 결제" 한 줄.

- 차감: `takeEvent = min(eventCredit, need)`, `takeEarned = need - takeEvent` (잠금분 제외)
- **DB 저장**: 종류별로 행을 나눈다. `type`은 `EVENT`/`EARNED`만 쓰고 nullable이 아니다.
  - `takeEvent > 0` → ledger 1행: description `"구독 결제"`, type=`EVENT`, delta=`−takeEvent`
  - `takeEarned > 0` → ledger 1행: description `"구독 결제"`, type=`EARNED`, delta=`−takeEarned`
  - 한쪽만 쓰면 행은 1개
- **조회(UC-C2)**: 같은 구독 결제에 속한 행을 합쳐 `"구독 결제"` −(합) **한 줄**로 응답. (혼합 type enum·type null은 쓰지 않음)

---

## PR 묶음

1. C0 + C1 + C2  
2. C3 + C4  
3. C5 + C6 + C7  
4. C8 (결제 직전)

## 범위 밖

실제 송금, 프론트 목업 제거, 피드백 72시간 자동 지급 스케줄러

## 다음

`docs/2026-11-03-backend-subscription.md`
