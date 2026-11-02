# 크레딧 구분 이름 변경과 내역 시각 표시

## 한눈에
- 끝나면: 마이페이지 홈, `/my/credits`, `/my/credits/withdrawals`에서 크레딧 구성이 "적립 크레딧 / 이벤트 크레딧 / 출금 처리 중"으로 보이고, 크레딧 내역과 출금 내역의 각 행에 날짜와 시각("11월 2일" + "오후 3:12")이 함께 보인다.
- 결정 필요: 없음
- 규모: 3단계, 약 1시간

## 1. 크레딧 구분 이름 (R1)
잔액 구성의 "현금화 가능"을 "적립 크레딧"으로, "구독 결제 전용"을 "이벤트 크레딧"으로 바꾸고, 출금·구독 안내 문구의 "가입 크레딧"도 "이벤트 크레딧"으로 맞춘다.

S86 마이페이지 홈 (고침 11-02: 크레딧 구분 이름 변경)
- Given `demo-role=tester`, `/my`
- Then  "크레딧" 카드에 "적립 크레딧 9,480 크레딧", "이벤트 크레딧 3,000 크레딧", "출금 처리 중 0 크레딧"이 보인다
- Then  "현금화 가능", "구독 결제 전용"은 보이지 않는다

S137 크레딧 관리 (고침 11-02: 크레딧 구분 이름 변경)
- Given `demo-role=tester`, `/my/credits`
- Then  "잔액" 카드에 "적립 크레딧 9,480 크레딧", "이벤트 크레딧 3,000 크레딧", "출금 처리 중 0 크레딧"이 보인다

S148 출금 안내 (고침 11-02: 크레딧 구분 이름 변경)
- Given `demo-role=tester`, `/my/credits/withdrawals`
- Then  "출금 가능 9,480 크레딧"이 보인다
- Then  "이벤트 크레딧은 출금할 수 없어요"가 보인다

S187 신청 뒤 잔액 (고침 11-02: 크레딧 구분 이름 변경)
- Given `demo-role=tester`가 5,000 크레딧 출금을 신청했다
- Then  `/my/credits`와 `/my`에 "적립 크레딧 4,480 크레딧", "출금 처리 중 5,000 크레딧"이 보이고 총 잔액은 "12,480 크레딧" 그대로다

S201 구독 결제 안내 (고침 11-02: 크레딧 구분 이름 변경)
- Given `demo-role=tester`, `/my/subscription`
- Then  "이벤트 크레딧도 구독 결제에 쓸 수 있어요"가 보인다

## 2. 크레딧 내역 시각 (R2)
`/my/credits` 크레딧 내역의 각 행에 날짜 아래 시각을 함께 보여 준다.

S341 크레딧 내역 시각
- Given `demo-role=tester`, `/my/credits`
- Then  12개 행 모두 날짜 칸에 "N월 N일"과 "오전|오후 H:MM"이 보인다
- Then  날짜 칸은 `<time>`이고 `dateTime`이 ISO 시각이다

S342 마이페이지 홈 최근 내역
- Given `demo-role=tester`, `/my`
- Then  "최근 크레딧 내역" 행에도 같은 형식의 시각이 보인다 (같은 `LedgerRow`를 쓴다)

## 3. 출금 내역 시각 (R3)
`/my/credits/withdrawals` 출금 내역의 각 행에 신청 날짜 아래 시각을 함께 보여 준다.

S343 출금 내역 시각
- Given `demo-role=tester`, `/my/credits/withdrawals`
- Then  2개 행 모두 날짜 칸에 "N월 N일"과 "오전|오후 H:MM"이 보인다
- Then  날짜 칸은 `<time>`이고 `dateTime`이 ISO 시각이다

S344 신청 직후 행
- When  5,000 크레딧 출금을 신청한다
- Then  새 1번 행에도 날짜와 시각이 보인다

## 범위 밖
- 코드의 필드·함수 이름(`earned`, `signup`, `cashableCredits`)은 바꾸지 않는다. 화면 문구만 바꾼다.
- 크레딧 내역의 개별 행 이름 "가입 크레딧"은 그대로 둔다. 어떤 이벤트로 받았는지를 나타내는 이름이라 구분 이름과 다르다.
- 운영자 출금 관리 화면(`/admin/withdrawals`)의 시각 표시
- 마이페이지 홈의 "최근 크레딧 내역" 제거 (홈 정리 PR에서 함)

## 작업 순서
1. 크레딧 구분 이름 — S86, S137, S148, S187, S201
   - 파일: `frontend/src/features/my/components/CreditSummaryCard.tsx`, `frontend/src/features/credit/components/WithdrawalForm.tsx`, `frontend/src/features/my/components/SubscriptionPayment.tsx`, `frontend/src/features/credit/types.ts`(주석)
   - 파일: `frontend/e2e/my.spec.ts`, `frontend/e2e/credits.spec.ts`, `frontend/e2e/subscription.spec.ts`
   - 확인: `npm run test:e2e -- my.spec.ts credits.spec.ts subscription.spec.ts`
2. 내역 시각 — S341~S344
   - 파일: `frontend/src/features/credit/components/LedgerRow.tsx`, `frontend/src/features/credit/components/WithdrawalHistory.tsx` (기존 `formatDate`, `formatClock` 재사용)
   - 파일: `frontend/e2e/credits.spec.ts`, `frontend/e2e/my.spec.ts`
   - 확인: `npm run test:e2e -- my.spec.ts credits.spec.ts`
3. 전체 확인과 문서
   - 파일: `docs/2026-10-30-frontend-my.md`(S86), `docs/2026-10-30-frontend-credits.md`(S137, S148, S187), `docs/2026-10-30-frontend-subscription.md`(S201)에 고침 반영
   - 확인: `npm run test:e2e && npm run lint && npm run build`, 개발 서버에서 1440px·375px 눈으로 확인

## 브랜치·커밋
- 브랜치: `feature/frontend-credit-labels` (`origin/develop`에서 분기, upstream 해제함)
- 커밋:
  - `Feat: 크레딧 구분을 적립 크레딧, 이벤트 크레딧으로 변경` — 단계 1
  - `Feat: 크레딧 내역과 출금 내역에 시각 표시` — 단계 2
  - `Test: 크레딧 구분 이름과 내역 시각 시나리오` — 단계 1~2의 e2e
  - `Docs: 크레딧 구분 이름 변경과 내역 시각 계획` — 단계 3

## 결정 (2026-11-02)
- 적립 크레딧은 테스트로 적립한 크레딧만 센다. 출금 처리 중인 크레딧과 이벤트 크레딧은 뺀다. 그래서 세 줄(적립, 이벤트, 출금 처리 중)을 더하면 총 잔액이다.
- 구독 페이지 안내도 "이벤트 크레딧"으로 바꾼다.

## 가정
- "이벤트 크레딧"은 지금의 가입 크레딧 자리다. 출금할 수 없고 구독 결제에만 쓴다는 규칙은 그대로다.
- 시각 형식은 채팅과 같은 "오후 3:12"(`formatClock`)를 쓴다. 날짜 칸 안에서 날짜 아래 줄에 둔다. 한 줄로 붙이면 375px에서 내역 이름이 너무 좁아진다.
- 목업 데이터의 시각은 접속 시각에서 일 단위로만 빼서 만들기 때문에, 모든 행의 시각이 같게 보인다. 목업은 바꾸지 않는다.
- S번호는 S341부터 쓴다 (기존 최대 S340).

## 참고 (2026-11-02 확인)
- 크레딧 규칙과 기존 시나리오: `docs/2026-10-30-frontend-credits.md`, `docs/2026-10-30-frontend-my.md` R5, `docs/2026-10-30-frontend-subscription.md` S201
- 시각 포맷: `frontend/src/lib/format.ts`의 `formatDate`("11월 6일"), `formatClock`("오후 3:12"), 둘 다 서울 시간 기준
- `LedgerRow`는 `/my/credits`와 마이페이지 홈 "최근 크레딧 내역"이 함께 쓴다
