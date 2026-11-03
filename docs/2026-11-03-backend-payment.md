# 백엔드 결제 세부 계획 (유스케이스 + checkout 페이지)

- 상위: `docs/2026-11-03-backend-payment-subscription-credit.md`
- 선행: 크레딧 UC-C8, 구독 S1·S2 (페이지 S0)
- 프론트: `docs/2026-10-30-frontend-subscription.md` §8 (`/my/subscription/checkout`)
- 단위: 유스케이스. **checkout 페이지 구성·실행을 포함한다.**

## 한눈에

현금은 PG 없이 완료 기록만. 크레딧은 `spendForSubscription`. 만료일은 **결제 시점에 고정**.

구독 관리 페이지의 "구독하기/연장하기" → 이 문서의 checkout.

## checkout 페이지 구성 (`/my/subscription/checkout`)

| 섹션 | 내용 | UC |
| --- | --- | --- |
| 진입·권한 | 비로그인/운영자 | P1 |
| 상품·수단 | 플랜, CASH/CREDIT, 부족 안내 | P1 |
| 이용 기간 | 시작~만료 예상 | P1 |
| 결제 후 잔액 | CREDIT일 때 remaining | P1 |
| 결제하기 | 실행 | P2 |
| 성공 후 | `/my/subscription?notice=paid` | 프론트 + S0/S2 재조회 |

---

## UC-P0 스키마 갭 (메서드 아님)

| 변경 | 내용 | 상태 |
| --- | --- | --- |
| Payment → Subscription | OneToOne → **ManyToOne** | 반영 |
| (권장) Payment.periodEndAt | 이 결제로 확정한 만료일 | 보류(미추가) |

## UC-P1 checkout 페이지 조회 (구성)

- API: `GET /api/users/{userId}/subscription/checkout?planId=`
- 응답: plan, payableCredits, active, currentEndAt,  
  credit `{ affordable, shortfall, remainingAfter }`,  
  period `{ startAt, endAt }`, eligible
- 규칙: 운영자 불가, 크레딧 부족 시 affordable=false (현금은 가능)
- 화면: checkout 전체 초기 데이터
- 완료: 프론트 S344·S345

## UC-P2 구독 결제 실행

- API: `POST /api/users/{userId}/subscription/checkout`
- body: planId, method (`CASH`|`CREDIT`)
- 트랜잭션:
  1. 검증 (eligible, plan, CREDIT 잔액)
  2. 기간: 미구독·만료 → now부터 / 구독 중 → endAt에 periodDays 가산
  3. Subscription upsert (ACTIVE, endAt)
  4. Payment 행 COMPLETED
  5. CREDIT면 C8 `spendForSubscription` (이벤트 먼저 → 적립, **장부는 종류별 행** — 아래·UC-C8)
  6. 커밋
- 응답: subscription, paymentId, (CREDIT면) 잔액 요약
- 화면: 결제 버튼 → notice=paid
- 완료: S346·S347

## UC-P3 결제 이력

- API: `GET /api/users/{userId}/subscription/payments`
- 최신순. 상한은 설정(프론트 시연 10건과 맞출지 결정)
- 화면: 당장은 선택

## UC-P4 만료 보정 (선택)

조회 시 active=false로 충분. EXPIRED 배치는 여유 시.

---

## 차감·장부 디테일 (P2 ↔ C8)

```
need = plan.creditPrice
takeEvent = min(eventCredit, need)
takeEarned = need - takeEvent
assert (earned - locked) >= takeEarned
```

**장부 확정 (UC-C8과 동일)**

| 계층 | 규칙 |
| --- | --- |
| DB (`credit_ledgers`) | 종류별 행. EVENT −takeEvent, EARNED −takeEarned (0이면 해당 행 없음). description 모두 `"구독 결제"` |
| 조회 API (UC-C2) | 같은 결제의 행을 합쳐 `"구독 결제"` 한 줄로 응답 (프론트·S346) |
| 쓰지 않음 | 혼합용 `CreditType` 추가, `type` null 허용, DB에 총액 한 줄만 저장 |

한 줄로만 남기면 `type`이 EVENT/EARNED 중 하나만 가능해 차감 종류를 잃는다. 종류별 저장 + 조회 시 합치기로 맞춘다.

## PR 묶음

1. P0  
2. P1 (checkout 페이지 구성)  
3. P2 + C8  
4. P3

## 범위 밖

PG·자동 환불, 해지, 목업 쿠키 제거, 영수증

## 완료 후

크레딧·구독 페이지·checkout이 서버 기준이면 프론트 연동은 화면별 PR.
