# 크레딧 구분 이름 변경과 내역 시각 표시

## 한눈에
- 끝나면: 마이페이지 홈, `/my/credits`, `/my/credits/withdrawals`에서 크레딧 구성이 "적립 크레딧 / 이벤트 크레딧 / 출금 처리 중"으로 보이고, 크레딧 내역과 출금 내역의 각 행에 날짜와 시각("11월 2일" + "오후 3:12")이 함께 보인다.
- 결정 필요: 없음
- 규모: 3단계, 약 1시간

## 1. 크레딧 구분 이름 (R200)
잔액 구성의 "현금화 가능"을 "적립 크레딧"으로, "구독 결제 전용"을 "이벤트 크레딧"으로 바꾸고, 출금·구독 안내 문구의 "가입 크레딧"도 "이벤트 크레딧"으로 맞춘다.

S86 마이페이지 홈 (고침 11-02: 크레딧 구분 이름 변경)
- Given `demo-role=tester`, `/my`
- Then  "크레딧" 카드에 "적립 크레딧 9,480 크레딧", "이벤트 크레딧 3,000 크레딧", "출금 처리 중 0 크레딧"이 보인다
- Then  "현금화 가능", "구독 결제 전용"은 보이지 않는다

S350 크레딧 관리 (고침 11-02: 크레딧 구분 이름 변경)
- Given `demo-role=tester`, `/my/credits`
- Then  "잔액" 카드에 "적립 크레딧 9,480 크레딧", "이벤트 크레딧 3,000 크레딧", "출금 처리 중 0 크레딧"이 보인다

S361 출금 안내 (고침 11-02: 크레딧 구분 이름 변경)
- Given `demo-role=tester`, `/my/credits/withdrawals`
- Then  "출금 가능 9,480 크레딧"이 보인다
- Then  "이벤트 크레딧은 출금할 수 없어요"가 보인다

S378 신청 뒤 잔액 (고침 11-02: 크레딧 구분 이름 변경)
- Given `demo-role=tester`가 5,000 크레딧 출금을 신청했다
- Then  `/my/credits`와 `/my`에 "적립 크레딧 4,480 크레딧", "출금 처리 중 5,000 크레딧"이 보이고 총 잔액은 "12,480 크레딧" 그대로다

S390 구독 결제 안내 (고침 11-02: 크레딧 구분 이름 변경)
- Given `demo-role=tester`, `/my/subscription`
- Then  "이벤트 크레딧도 구독 결제에 쓸 수 있어요"가 보인다

## 2. 크레딧 내역 시각 (R201) (고침 11-02: 날짜 칸 아래 시각 → 날짜별 묶음과 받음·나감 원(C안). 시각을 날짜 옆에 붙이면 375px에서 이름이 두세 글자만 남았고, 배치 후보 6개를 비교해 C안을 골랐음)
`/my/credits` 크레딧 내역을 서울 기준 날짜별로 묶는다. 소제목은 오늘·어제, 그 전은 "N월 N일"이다. 각 행은 받음(+ 초록)·나감(− 회색) 원, 이름과 그 아래 시각("오후 3:12"), 금액 순이다.

S544 크레딧 내역 날짜 묶음
- Given `demo-role=tester`, `/my/credits`
- Then  12개 행 모두 이름 아래에 "오전|오후 H:MM"이 보이고, 시각은 `<time dateTime>`(ISO)이다
- Then  묶음마다 "오늘|어제|N월 N일" 소제목(h3)이 있고, 묶음 목록의 이름이 그 소제목이다
- Then  첫 소제목은 "어제"다

S545 마이페이지 홈 최근 내역
- Given `demo-role=tester`, `/my`
- Then  "최근 크레딧 내역" 5개 행도 같은 모양이다 (같은 `DayGroups`, `LedgerRow`를 쓴다)

S548 좁은 화면 (R201·R202)
- Given `demo-role=tester`, 375px, `/my/credits`
- Then  첫 행의 "레시피핏 테스트 보상"이 잘리지 않고 다 보인다

## 3. 출금 내역 시각 (R202) (고침 11-02: R201과 같은 이유로 날짜별 묶음)
`/my/credits/withdrawals` 출금 내역을 신청 날짜별로 묶는다. 각 행은 나감 원, 금액과 그 아래 "시각 · 은행 계좌", 상태 순이다.

S546 출금 내역 날짜 묶음
- Given `demo-role=tester`, `/my/credits/withdrawals`
- Then  2개 행 모두 금액 아래에 "오전|오후 H:MM"이 보이고, 묶음마다 날짜 소제목이 있다

S547 신청 직후 행
- When  5,000 크레딧 출금을 신청한다
- Then  3개 행이 되고, 첫 소제목은 "오늘"이며 새 행에도 시각이 보인다

## 테스트 정리 (고침 11-02: 테스트가 너무 많다는 요청)
- `e2e/credits.spec.ts`는 같은 준비(역할·페이지)를 쓰는 시나리오를 테스트 하나로 묶어 39개에서 15개로 줄였다. 시나리오 번호와 확인하는 내용은 그대로이고, 테스트 이름에 묶은 번호를 모두 적는다.

## 범위 밖
- 코드의 필드·함수 이름(`earned`, `signup`, `cashableCredits`)은 바꾸지 않는다. 화면 문구만 바꾼다.
- 크레딧 내역의 개별 행 이름 "가입 크레딧"은 그대로 둔다. 어떤 이벤트로 받았는지를 나타내는 이름이라 구분 이름과 다르다.
- 운영자 출금 관리 화면(`/admin/withdrawals`)의 시각 표시
- 마이페이지 홈의 "최근 크레딧 내역" 제거 (홈 정리 PR에서 함)

## 작업 순서
1. 크레딧 구분 이름 — S86, S350, S361, S378, S390
   - 파일: `frontend/src/features/my/components/CreditSummaryCard.tsx`, `frontend/src/features/credit/components/WithdrawalForm.tsx`, `frontend/src/features/my/components/SubscriptionPayment.tsx`, `frontend/src/features/credit/types.ts`(주석)
   - 파일: `frontend/e2e/my.spec.ts`, `frontend/e2e/credits.spec.ts`, `frontend/e2e/subscription.spec.ts`
   - 확인: `npm run test:e2e -- my.spec.ts credits.spec.ts subscription.spec.ts`
2. 내역 시각 — S544~S548
   - 파일: `frontend/src/features/credit/mock.ts`(시각 고정, 같은 날 여러 건), `frontend/src/features/credit/components/DayGroups.tsx` 새로 만듦(날짜별 묶음), `LedgerRow.tsx`, `LedgerList.tsx`, `WithdrawalHistory.tsx`, `frontend/src/features/my/components/RecentCredits.tsx` `FlowIcon.tsx` 새로 만듦(받음·나감 원). 기존 `formatDate`, `formatClock`, `seoulDayKey` 재사용. 기준 시각은 페이지에서 `now={new Date()}`로 넘긴다(다른 화면과 같은 방식)
   - 파일: `frontend/e2e/credits.spec.ts`, `frontend/e2e/my.spec.ts`
   - 확인: `npm run test:e2e -- my.spec.ts credits.spec.ts`
3. 전체 확인과 문서
   - 파일: `docs/2026-10-30-frontend-my.md`(S86), `docs/2026-10-30-frontend-credits.md`(S350, S361, S378), `docs/2026-10-30-frontend-subscription.md`(S390)에 고침 반영
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
- 시각은 채팅과 같은 "오후 3:12"(`formatClock`)를 쓴다. 날짜는 묶음 소제목으로만 보여 주고, 오늘·어제는 말로 쓴다. (고침 11-02: 처음에는 행마다 날짜 칸 아래 줄에 시각을 두었고, 시각 열(E안)도 거쳤음)
- 받음·나감 원은 금액 부호와 뜻이 같아 보조 기술에는 숨긴다(`aria-hidden`). 출금 내역은 모두 나감 원이다.
- 목업 데이터는 "며칠 전 + 서울 시각"으로 만든다. tester는 12건이 8개 날짜에, developer는 4건이 3개 날짜에 묶이고, 하루에 여러 건인 날이 있어 구분선과 시각 차이가 보인다. 내역 순서, 금액, 합계는 그대로다. (고침 11-02: 처음에는 일 단위로만 빼서 모든 행의 시각이 같았음)
- S번호는 S544~S548을 쓴다 (크레딧 본문 필터 S352~S356·구독 결제 S533~S543과 겹치지 않게 재배정). R은 R200~R202.

## 참고 (2026-11-02 확인)
- 크레딧 규칙과 기존 시나리오: `docs/2026-10-30-frontend-credits.md`, `docs/2026-10-30-frontend-my.md` R134, `docs/2026-10-30-frontend-subscription.md` S390
- 시각 포맷: `frontend/src/lib/format.ts`의 `formatDate`("11월 6일"), `formatClock`("오후 3:12"), 둘 다 서울 시간 기준
- `LedgerRow`는 `/my/credits`와 마이페이지 홈 "최근 크레딧 내역"이 함께 쓴다
