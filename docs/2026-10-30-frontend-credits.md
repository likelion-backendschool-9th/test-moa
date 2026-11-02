# 프론트엔드 크레딧 내역·출금 (`/my/credits`, `/my/credits/withdrawals`)

## 한눈에
- 끝나면: `/my/credits`에서 잔액 구성과 전체 크레딧 내역(받은·쓴 크레딧 필터)을 보고, `/my/credits/withdrawals`에서 금액·계좌를 입력해 출금을 신청하고 지난 출금 요청의 상태(처리 중·지급 완료·반려)를 본다. 신청하면 그 브라우저의 출금 내역과 "출금 처리 중"에 바로 남는다(시연용 쿠키). 데이터는 목업이다. (고침 10-30)
- 결정 필요: 없음 (목업으로 진행, PAID·COMPLETED는 "지급 완료" 하나로 보여 주기로 확정 10-30)
- 규모: 7단계, 약 4~5시간 + 신청 기록 약 1시간

## 맥락
- 두 페이지는 지금 "준비 중"이다. 마이페이지 메뉴의 "크레딧", "출금"과 대시보드의 "크레딧 내역", "출금 신청", "전체 보기"가 여기로 온다.
- 크레딧 규칙 (spec.md 3장, GLOSSARY):
  - 가입 크레딧은 구독 결제 전용이고 현금화할 수 없다.
  - 테스트로 받은 크레딧은 1크레딧 = 1원으로 현금화할 수 있다.
  - 현금화 흐름: 사용자 요청 → 운영자 확인 → 지급. 요청 금액은 처리 중 잠그고, 지급하면 차감, 반려하면 되돌린다.
- 최소 출금액, 처리 기한은 미정이다. 화면에 약속하지 않는다.
- 백엔드는 지금 고려하지 않는다. 데이터와 제출은 모두 목업이다.

## 1. 접근 제어 (R123)
비로그인 사용자는 두 페이지를 볼 수 없고 로그인으로 이동한다.

S348 크레딧 관리
- Given `demo-role=guest`
- When  `/my/credits`에 접속한다
- Then  URL이 `/login?next=%2Fmy%2Fcredits`이다

S349 출금
- When  `/my/credits/withdrawals`에 접속한다
- Then  URL이 `/login?next=%2Fmy%2Fcredits%2Fwithdrawals`이다

## 2. 잔액 (R124)
`/my/credits` 위쪽에 총 잔액과 구성, 승인 대기 보상을 보여 준다. 값은 마이페이지 크레딧 카드와 같다.

S350 테스터
- Given `demo-role=tester`, `/my/credits`
- Then  h1 "크레딧"과 "12,480 크레딧"이 보인다
- Then  "현금화 가능 9,480 크레딧", "구독 결제 전용 3,000 크레딧", "출금 처리 중 0 크레딧", "승인 대기 1,350 크레딧"이 보인다
- Then  "출금 신청" 링크가 `/my/credits/withdrawals`를 가리킨다

S351 출금할 크레딧 없음
- Given `demo-role=admin`
- Then  "0 크레딧"이 보이고 "출금 신청" 링크는 없다

## 3. 크레딧 내역 (R125)
잔액이 바뀐 기록을 최신순으로 모두 보여 준다. 받은 크레딧은 `+`, 쓴 크레딧은 `-`를 붙인다. 필터는 URL(`type`)에 남는다.

S352 전체
- Given `demo-role=tester`, `/my/credits`
- Then  "크레딧 내역"에 12개 행이 있다
- Then  첫 행은 "레시피핏 테스트 보상", "+1,260 크레딧"이고 마지막 행은 "가입 크레딧", "+3,000 크레딧"이다
- Then  "전체" 필터에 `aria-current="page"`가 있다

S353 받은 크레딧
- When  "받은 크레딧"을 누른다
- Then  URL이 `/my/credits?type=in`이고 행이 11개다

S354 쓴 크레딧
- When  "쓴 크레딧"을 누른다
- Then  URL이 `/my/credits?type=out`이고 행은 "출금 지급", "-3,000 크레딧" 1개다

S355 알 수 없는 필터
- Given `/my/credits?type=foo`
- Then  "전체" 필터가 선택되고 행이 12개다

S356 내역 없음
- Given `demo-role=admin`
- Then  "아직 크레딧 내역이 없어요"가 보인다

S357 구독 결제
- Given `demo-role=developer`, `/my/credits?type=out`
- Then  행은 "구독 결제", "-2,000 크레딧" 1개다

## 4. 출금 내역 (R126)
`/my/credits/withdrawals` 아래쪽에 지난 출금 요청을 최신순으로 보여 준다. 상태는 처리 중·지급 완료·반려 세 가지이고, 반려는 이유를 함께 보여 준다.

S358 테스터
- Given `demo-role=tester`
- Then  "출금 내역"에 2개 행이 있다
- Then  1번은 "3,000원", "지급 완료"이다
- Then  2번은 "2,000원", "반려", "예금주 이름이 회원 정보와 달라요"이다

S359 처리 중
- Given `demo-role=developer`
- Then  1번 행이 "1,000원", "처리 중"이다

S360 없음
- Given `demo-role=admin`
- Then  "아직 출금 요청이 없어요"가 보인다

S370 상태 표시 (고침 10-30: 다크 모드에서 작고 잘 안 보인다는 피드백)
- Given `demo-role=tester`, 라이트·다크 각각
- Then  "지급 완료", "반려"의 글자 크기가 14px 이상이다
- Then  글자와 바탕의 대비가 4.5 이상이다

## 5. 출금 신청 (R127)
현금화 가능한 크레딧 안에서 금액과 계좌를 입력해 신청한다. 입력이 틀리면 칸 옆에 이유를 보여 준다. 제출은 목업이라 성공 메시지만 보여 주고 데이터는 바뀌지 않는다.

S361 안내
- Given `demo-role=tester`, `/my/credits/withdrawals`
- Then  h1 "출금"과 "출금 가능 9,480 크레딧"이 보인다
- Then  "가입 크레딧은 출금할 수 없어요"가 보인다

S362 전액
- When  "전액"을 누른다
- Then  금액 칸이 `9480`이 되고 "받을 금액 9,480원"이 보인다

S363 성공
- When  금액 `5000`, 은행 "토스뱅크", 계좌번호 `100012345678`, 예금주 "한서윤"을 넣고 "출금 신청"을 누른다
- Then  "5,000원 출금을 신청했어요. 운영자가 확인한 뒤 지급해요."가 보인다 (`role="status"`)
- Then  입력 칸이 비워진다

S376 신청 뒤 다시 실패 (고침 10-30: 리뷰 — 성공 뒤 실패하면 칸이 다시 그려져 입력이 비워졌음)
- Given S363처럼 한 번 신청했다
- When  금액 `10000`, 나머지는 S363과 같게 넣고 제출한다
- Then  "출금 가능한 크레딧(4,480)보다 많아요"가 보이고 네 칸에 입력한 값이 그대로 있다 (고침 10-30: R129부터 첫 신청 5,000이 잠겨 출금 가능이 4,480이 됨)

S364 금액 초과
- When  금액 `10000`을 넣고 나머지는 S363과 같게 제출한다
- Then  금액 칸 아래에 "출금 가능한 크레딧(9,480)보다 많아요"가 보이고 금액 칸에 `aria-invalid="true"`가 있다

S365 빈 칸·잘못된 형식
- When  아무것도 넣지 않고 제출한다
- Then  "금액을 입력해 주세요", "은행을 골라 주세요", "계좌번호를 입력해 주세요", "예금주를 입력해 주세요"가 보인다
- When  금액 `0`, 계좌번호 `12-34`를 넣고 제출한다
- Then  "1 크레딧 이상 입력해 주세요", "계좌번호는 숫자 10~14자리예요"가 보인다

S371 칸 비율 (고침 10-30: 출금 신청 카드 안 비율이 안 맞는다는 피드백)
- Given `demo-role=tester`, 너비 1440px
- Then  금액·은행·계좌번호·예금주 칸과 "전액" 버튼의 높이가 모두 같다 (48px)

S372 금액 폼 모서리 (고침 10-30: 금액 입력에는 둥근 알약이 가볍다는 피드백)
- Given `demo-role=tester`, `/my/credits/withdrawals`
- Then  금액·은행·계좌번호·예금주 칸과 "전액", "출금 신청" 버튼의 모서리가 12px이다
- Then  `/my/credits` 잔액 카드의 "출금 신청" 링크는 알약 모양 그대로다

S373 신청 버튼 위치 (고침 10-30: 신청 버튼은 오른쪽이 낫다는 피드백)
- Given 너비 1440px
- Then  "출금 신청" 버튼의 오른쪽 끝이 예금주 칸의 오른쪽 끝과 같고, 예금주 칸보다 아래에 있다
- Then  "받을 금액"이 버튼 바로 왼쪽, 같은 높이에 있다 (금액 칸 아래 안내는 없앤다)

S374 모바일 신청 버튼
- Given 너비 375px
- Then  "출금 신청" 버튼 너비가 입력 칸 너비와 같고, "받을 금액"은 버튼 위에 있다

S375 펼친 은행 목록 (고침 10-30: 펼친 목록이 칸과 안 맞는다는 피드백)
- Given 너비 1440px, 375px 각각
- When  "은행"을 누른다
- Then  목록이 칸 바로 아래(16px 이내)에 칸과 같은 너비(차이 16px 미만)로 열린다
- Then  "은행 선택" 안내는 목록에 없다
- When  "토스뱅크"를 고른다
- Then  칸 값이 "토스뱅크"다

S366 출금할 크레딧 없음
- Given `demo-role=admin`
- Then  "출금할 수 있는 크레딧이 없어요"가 보이고 "출금 신청" 버튼이 비활성이다

## 7. 신청 기록 (R129) (고침 10-30: 프로토타입이라 신청이 화면에 남아야 한다는 요청)
출금을 신청하면 그 브라우저에서 출금 내역과 잔액에 바로 반영된다. 시연용 기록이라 쿠키에만 남고, 다른 브라우저·다른 시연 회원에게는 보이지 않는다.

S377 내역에 추가
- Given `demo-role=tester`, `/my/credits/withdrawals`
- When  S363처럼 5,000 크레딧을 토스뱅크 `100012345678`로 신청한다
- Then  "출금 내역"이 3개 행이 되고, 1번 행은 "5,000원", "처리 중", "토스뱅크 ****5678"이다

S378 잔액에 반영
- Then  출금 신청 카드에 "출금 가능 4,480 크레딧"이 보인다
- Then  `/my/credits`에 "현금화 가능 4,480 크레딧", "출금 처리 중 5,000 크레딧"이 보이고 총 잔액은 "12,480 크레딧" 그대로다
- Then  `/my` 크레딧 카드도 같은 값이다

S379 새로고침
- When  `/my/credits/withdrawals`를 새로고침한다
- Then  S377의 행이 그대로 있다

S380 이어서 신청
- When  금액 `5000`으로 한 번 더 신청한다
- Then  "출금 가능한 크레딧(4,480)보다 많아요"가 보이고 내역은 3개 그대로다

S381 다른 브라우저·다른 회원
- Given S377을 마친 브라우저와 별개인 새 브라우저, `demo-role=tester`
- Then  "출금 내역"은 2개 행이다 (S358 그대로)
- Given S377을 마친 브라우저에서 `demo-role=developer`로 바꾼다
- Then  "출금 내역"은 1개 행이다 (S359 그대로)

## 6. 연결과 구조 (R128)
마이페이지 대시보드와 같은 데이터를 쓰고, 기존 테스트를 깨지 않는다.

S367 대시보드 일치
- Given `demo-role=tester`
- Then  `/my`의 "최근 크레딧 내역" 5개 행은 `/my/credits`의 첫 5개 행과 같다

S368 준비 중 목록
- Then  `/my/credits`, `/my/credits/withdrawals`는 S26 "준비 중" 목록에서 빠진다

S369 구조 (기존 S78)
- When  `grep -rl '"use client"' src`
- Then  기존 목록에 `WithdrawalForm` 1개가 더해진다 (develop 병합 뒤 모두 12개, 홈 문서 S78)
- When  `grep -rln "mock" src --include='*.tsx'`
- Then  결과가 없다

## 범위 밖
- 실제 출금 처리, 계좌 실명 확인, 운영자 승인 화면 (`/admin/withdrawals`). 시연용 신청은 계속 "처리 중"으로 남는다
- 출금 요청 취소, 시연용 기록 초기화 버튼 (쿠키를 지우면 된다)
- 최소 출금액, 처리 기한 (기획 미정)
- 크레딧 내역 페이지 나누기·기간 필터
- 백엔드 API 연동

## 작업 순서
(R129 추가분)
7. 신청 기록 — S377~S381
   - 파일: `src/features/credit/demo-requests.ts` 새로 만듦 (`server-only`. 쿠키 `demo-withdrawals-<role>`를 읽고 쓰는 함수만 둔다. 프로토타입을 걷어낼 때 이 파일과 호출 두 곳만 지운다)
   - 파일: `src/features/credit/api.ts` — `load()`에서 목업에 쿠키 기록을 합침 (내역 맨 앞, `pendingWithdrawal`에 합계). `features/my/api.ts`도 이 합친 값을 쓰도록 `creditDataFor(role, now)`를 내보냄
   - 파일: `src/features/credit/actions.ts` — 검사 통과 뒤 기록 저장, `revalidatePath("/my", "layout")`
   - 파일: `e2e/credits.spec.ts` R129 묶음
   - 확인: `npm run test:e2e && npm run lint && npm run build`

(처음 계획)
1. 크레딧 데이터 계층 — S350 이후 시나리오가 쓰는 데이터(처음 계획의 끝 번호가 오타였다), S367
   - 파일: `src/features/credit/types.ts`, `mock.ts`, `api.ts` (`getCreditOverview()`, `getCreditLedger(type)`, `getWithdrawals()`)
   - 파일: `src/features/my/mock.ts`, `api.ts` — 크레딧 잔액·최근 내역을 `features/credit`에서 가져오게 바꿈
   - 확인: `npx tsc --noEmit`, `npm run test:e2e -- my.spec.ts` (기존 마이페이지 통과)
2. 크레딧 관리 페이지와 잔액 — S348, S350, S351
   - 파일: `src/app/my/(account)/credits/page.tsx`, `src/features/credit/components/BalanceSummary.tsx`
   - 재사용: `features/my/components/card-styles.ts`, `formatCredits`
3. 크레딧 내역과 필터 — S352~S357, S367
   - 파일: `src/features/credit/components/LedgerList.tsx`, `LedgerFilter.tsx` (필터는 링크라 서버 컴포넌트), `query.ts` (`parseLedgerType`)
   - 재사용: `features/my/components/RecentCredits.tsx`의 행 모양을 `LedgerRow`로 빼서 함께 씀
4. 출금 내역 — S349, S358~S360
   - 파일: `src/app/my/(account)/credits/withdrawals/page.tsx`, `src/features/credit/components/WithdrawalHistory.tsx`
5. 출금 신청 폼 — S361~S366
   - 파일: `src/features/credit/actions.ts` (`"use server"`, 입력 검사), `src/features/credit/components/WithdrawalForm.tsx` (`"use client"`, `useActionState`)
   - Next 16 문서 `node_modules/next/dist/docs/`에서 Server Actions·`useActionState`·폼 검사 확인 후 작성
6. 테스트·문서 정리 — S368, S369
   - 파일: `e2e/credits.spec.ts` 새로 만듦, `e2e/links.spec.ts`, `docs/frontend-home.md` S26·S78
   - 확인: `npm run test:e2e && npm run lint && npm run build`, 개발 서버에서 1440px·375px 눈으로 확인

## 브랜치·커밋
- 브랜치: `feature/frontend-credits` (`origin/develop`에서 분기, upstream 해제함)
- 커밋:
  - `Feat: 크레딧 내역과 출금 신청 화면` — 단계 1~5
  - `Test: 크레딧·출금 E2E 시나리오` — 단계 6
  - `Docs: 크레딧·출금 계획 문서, 홈 문서 S26·S78 갱신` — 문서
  - `Feat: 출금 신청을 시연용 내역과 잔액에 남김` — 단계 7
  - `Test: 출금 신청 기록 시나리오(S377~S381)` — 단계 7
  - `Docs: 크레딧 계획에 신청 기록(R129) 추가` — 문서

## 가정
- 제출: 신청은 시연용 쿠키 `demo-withdrawals-<role>`에 남고, 출금 내역과 "출금 처리 중"에 반영된다. 서버에는 저장하지 않는다. 계좌번호는 끝 4자리만 남긴다. 최대 10건까지 남기고 넘으면 오래된 것부터 지운다. 쿠키를 지우면 처음 상태로 돌아간다. (고침 10-30: 처음에는 성공 메시지만 보이고 아무것도 바뀌지 않았음. 프로토타입이라 남아야 한다는 요청)
- 쿠키로 둔 이유: E2E가 브라우저마다 따로 돌아 서로 섞이지 않고, 서버를 다시 켜도 시연 상태가 유지된다. 서버 메모리에 두면 병렬 테스트가 서로의 신청을 보게 된다.
- 계좌: 은행, 계좌번호, 예금주를 받는다. 은행 목록은 국민, 신한, 우리, 하나, 농협, 카카오뱅크, 토스뱅크 7개다. 계좌번호는 숫자 10~14자리다.
- 최소 출금액은 미정이라 1크레딧 이상이면 받는다.
- 출금 상태: 처리 중(요청) → 지급 완료 / 반려. PAID와 COMPLETED는 "지급 완료" 하나로 보여 준다.
- 크레딧 내역에는 잔액이 실제로 바뀐 기록만 남긴다: 테스트 보상, 가입 크레딧, 구독 결제, 출금 지급. 출금 요청과 반려는 잔액을 바꾸지 않으므로(잠금·해제) 출금 내역에만 보인다.
  - 이 규칙에 맞춰 마이페이지 목업의 developer "출금 신청 -1,000" 행을 없앤다.
- 시연용 샘플 수치 (내역 합계 = 총 잔액):
  - tester: 테스트 보상 10건 합 12,480 + 가입 3,000 − 출금 지급 3,000 = 12,480. 출금 내역: 지급 완료 3,000, 반려 2,000.
  - developer: 가입 3,000 − 구독 결제 2,000 + 보상 2건 2,260 = 3,260. 출금 내역: 처리 중 1,000.
  - admin: 모두 0, 내역 없음.
- 필터 이름은 "전체 / 받은 크레딧 / 쓴 크레딧"이고 URL은 `type=in|out`이다. 모르는 값은 전체로 본다.
- 날짜는 접속 시각 기준 상대값이다. 행에는 "10월 29일" 형식으로 보인다.
- 디자인은 마이페이지와 같은 카드(`card-styles.ts`)와 `components/ui`만 쓴다.
- 출금 신청 폼은 `DESIGN.md`의 The Money Field Rule을 따른다: 입력란·선택·버튼 모두 12px 모서리, 높이 48px. 버튼은 `Button`의 `shape="field"` 옵션으로 고르고, 기본값(알약)은 바꾸지 않는다.
- 은행 목록은 CSS `appearance: base-select`로 꾸민다. Chrome·Edge 135 이상에서만 칸에 맞춘 목록이 나오고, Safari·Firefox는 운영체제 기본 목록을 쓴다. 고를 수 있는 값과 동작은 같다.
- 출금 상태 색: 지급 완료는 강조색 면 + 강조 위 글씨, 처리 중은 먹 반전, 반려는 칩 회색 면 + 흐린 먹 테두리. 공용 `Badge`의 연한 톤은 다크에서 대비가 낮아 쓰지 않는다.
- S번호는 S348~S381을 쓴다. 처음에는 S135~S190이었고(리뷰 반영으로 S185, 신청 기록으로 S186~S190을 더했다), 11-02 번호 정리에서 다른 문서와 겹쳐 새 구간으로 옮겼다. 옛 번호와의 대응은 `frontend-admin-reports.md` "번호 사용 현황"에 있다.

## 참고 (2026-10-30 확인)
- 페이지 URL: `docs/page-urls.md` 마이페이지 섹션 (`/my/credits` 크레딧 관리, `/my/credits/withdrawals` 출금 신청·내역)
- 크레딧·현금화 규칙: `project-lion/.scratch/tester-platform-planning/spec.md` 3장, `project-lion/GLOSSARY.md`
- 와이어프레임: 내 지갑 — 크레딧 잔액, 크레딧 획득·사용내역, 현금화 요청·진행 상태
- 마이페이지 데이터: `frontend/src/features/my/` (`docs/2026-10-30-frontend-my.md`)
