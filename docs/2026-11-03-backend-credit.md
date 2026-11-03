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

| 변경 | 내용 |
| --- | --- |
| `CashoutRequest` | `bank`, `accountNumber`, `accountHolder`, `rejectReason` 추가 |
| `pendingReward` | wallet 컬럼 없음. Feedback 합으로 조회 |

잠금/해제는 ledger에 **안 남긴다**. ledger는 잔액이 바뀐 사건만.

---

## UC-C1 잔액 조회

- API: `GET /api/users/{userId}/credits`
- 응답: earnedBalance, eventCredit, lockedBalance, pendingReward, totalCredits, payableCredits, cashableCredits
- 화면: `/my`, `/my/credits`

## UC-C2 크레딧 내역 조회

- API: `GET /api/users/{userId}/credits/ledgers?type=all|in|out`
- in = delta>0, out = delta<0. 잘못된 type → 400
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
| `grantEvent` | eventCredit +=, ledger + |
| `grantEarned` | earnedBalance +=, ledger + |
| `spendForSubscription` | 이벤트 먼저 → 적립−잠금, ledger − |

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
