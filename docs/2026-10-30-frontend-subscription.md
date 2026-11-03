# 프론트엔드 구독 관리 (`/my/subscription`)

## 한눈에
- 끝나면: `/my/subscription`에서 내 구독 상태(구독 중이면 만료일과 남은 날, 아니면 미구독)와 무료·구독 혜택 비교, 구독 상품의 목업 가격(30일 10,000원 / 9,000 크레딧), 구독 결제에 쓸 수 있는 크레딧을 본다. 구독 중이면 만료 뒤 바뀌는 점도 본다. (고침 10-31: 가격 미정 안내 → 목업 가격)
- 11-02 추가: 결제 안내의 주 버튼 "구독하기"(구독 중이면 "구독 연장하기")로 `/my/subscription/checkout`에 가서 상품과 결제 수단(크레딧·현금)을 고르고 시연용으로 결제한다 (R196~R199, S533~S543)
- 결정 필요: 목업 가격 값 (아래 가정의 기본값으로 갈지)
- 규모: 5단계, 약 2~3시간

## 맥락
- 지금 `/my/subscription`은 "준비 중"이다. 마이페이지 메뉴 "구독", 대시보드 구독 카드의 "구독 알아보기"·"구독 관리", 홈 구독 모집 영역과 프로젝트 분석 탭의 "구독 알아보기"가 여기로 온다.
- 구독은 계정 단위다. 개발자와 테스터는 한 계정이라 화면을 역할로 나누지 않는다. 구독 혜택은 모집 글을 올리는 쪽(개발자 활동)에 붙는다.
- 구독 가격·주기·크레딧 우대율은 기획에서 미정이다 (spec.md 3장). 화면은 목업 가격으로 만들고, 정해지면 목업 값만 바꾼다 (10-31 사용자 결정).
- 구독 상품은 지금 하나다. 나중에 늘어날 수 있어서 상품은 목록 데이터로 두고, 화면은 목록을 그린다.
- 백엔드는 고려하지 않는다. 데이터는 목업이다.

## 1. 접근 제어 (R148)
비로그인 사용자는 구독 관리를 볼 수 없고 로그인으로 이동한다.

S382 비로그인
- Given `demo-role=guest`
- When  `/my/subscription`에 접속한다
- Then  URL이 `/login?next=%2Fmy%2Fsubscription`이다

S383 로그인
- Given `demo-role=tester`
- Then  h1 "구독"이 있다
- Then  "마이페이지 메뉴"의 "구독"에 `aria-current="page"`가 있다

## 2. 내 구독 상태 (R149)
구독 중이면 만료일과 남은 날을, 아니면 미구독임을 보여 준다. 값은 대시보드 구독 카드와 같다.

S384 미구독
- Given `demo-role=tester`
- Then  "내 구독" 카드에 "구독하지 않았어요"가 보인다
- Then  "구독 중" 표시와 만료일은 없다

S385 구독 중
- Given `demo-role=developer`
- Then  "내 구독" 카드 제목 줄에 "구독 중"이 보인다
- Then  같은 크기의 값 세 개가 보인다: 이용 중인 상품 "구독", 남은 기간 "D-30", 만료일(접속일 +30일 "N월 N일") (고침 10-31: 값 크기를 맞추고 이용 중인 상품 추가 — 사용자 피드백)

S386 운영자
- Given `demo-role=admin`
- Then  "운영자 계정은 구독 대상이 아니에요"와 "마이페이지"(`/my`) 링크가 보인다
- Then  혜택 비교와 결제 안내는 없다

S399 이번 달 모집 인원 (구독 중) (고침 10-31: 남은 혜택 표시 추가 — 사용자 요청)
- Given `demo-role=developer`
- Then  "내 구독" 카드에 "이번 달 모집 인원"과 "18명 남음"이 보인다
- Then  사용량 막대(`role="meter"`)의 값이 12, 최대가 30이고 "12 / 30명"이 보인다
- Then  다음 달 1일의 "N월 1일에 다시 채워져요"가 보인다

S400 이번 달 모집 인원 (무료)
- Given `demo-role=tester`
- Then  "10명 남음", "0 / 10명"이 보인다
- Then  "구독하면 월 30명까지 모집할 수 있어요"가 보인다

## 3. 혜택 비교 (R150)
무료와 구독 상품의 차이를 표로 보여 주고, 지금 내 상태의 열을 표시한다. 열 머리에는 상품 이름과 가격을 쓴다. 월간 모집 인원은 목업 한도를 숫자로 쓴다. (고침 10-31: 한도 목업 값 사용)

S387 비교표
- Given `demo-role=tester`
- Then  "혜택 비교" 표에 열 "무료", "구독"이 있다
- Then  행 5개가 순서대로 있다: 참여 확정 방식("선착순 자동 확정" / "지원자 중 직접 선정"), 월간 모집 인원("월 10명" / "월 30명"), 테스터 보상("기본 보상" / "기본 + 추가 보상"), 1대1 채팅("없음" / "선정한 테스터와 가능"), 모집 목록 노출("일반 목록" / "상단 구독 영역")
- Then  "무료" 열 머리에 "지금 이용 중"이 있다
- Then  "무료" 열 머리에 "0원", "구독" 열 머리에 "30일 10,000원"이 있다

S388 구독 중 표시
- Given `demo-role=developer`
- Then  "구독" 열 머리에 "지금 이용 중"이 있고 "무료" 열에는 없다

S389 (지움 10-31: 월간 모집 인원에 목업 한도 숫자를 쓰기로 함)

## 4. 결제 안내 (R151)
구독 상품의 가격(현금·크레딧)과 기간, 구독 결제에 쓸 수 있는 크레딧을 보여 준다. 가격은 시연용 목업이다. 구독 결제로 가는 주 버튼을 둔다. (고침 10-31: 가격 미정 안내 → 목업 가격. 고침 11-02: 구독 버튼 없음 → 구독 결제로 가는 주 버튼)

S390 가격과 쓸 수 있는 크레딧
- Given `demo-role=tester`
- Then  "결제 안내" 카드에 상품 "구독"과 "30일"이 보인다
- Then  "현금 10,000원", "크레딧 9,000 크레딧"이 보인다
- Then  "구독 결제에 쓸 수 있는 크레딧 12,480 크레딧"이 보인다
- Then  "가입 크레딧도 구독 결제에 쓸 수 있어요"와 "크레딧으로 결제하면 현금보다 우대 가격이 적용돼요"가 보인다
- Then  "구독하기" 링크가 `/my/subscription/checkout`을 가리킨다 (고침 11-02: 버튼·링크 없음 → 구독 결제로 가는 링크)

S391 출금 처리 중 제외
- Given `demo-role=developer`
- Then  "구독 결제에 쓸 수 있는 크레딧 2,260 크레딧"이 보인다 (출금 처리 중 1,000 제외)
- Then  "크레딧 내역"(`/my/credits`) 링크가 있다

S398 상품 목록 (R150·R151)
- Given 구독 상품 목록에 상품이 1개다
- Then  "결제 안내"에 상품이 1개, "혜택 비교" 열 머리가 "혜택", "무료", "구독" 3개다
- Then  화면 코드는 상품 수를 가정하지 않는다 (상품을 목록에 더하면 결제 안내 항목과 비교표 열이 함께 늘어난다)

## 5. 만료 뒤 바뀌는 점 (R152)
구독 중인 회원에게 만료되면 무엇이 멈추고 무엇이 남는지 알려 준다.

S392 구독 중
- Given `demo-role=developer`
- Then  "만료되면" 카드에 남는 것 3개가 있다: "받은 피드백과 채팅 기록 보기", "이미 참여가 확정된 테스터의 보상", "모집 글 등록과 지원 현황 확인"
- Then  멈추는 것 4개가 있다: "새 테스터 직접 선정", "채팅 메시지 보내기", "상단 구독 영역 노출", "분석"

S393 미구독
- Given `demo-role=tester`
- Then  "만료되면" 카드가 없다

## 6. 로딩과 화면 (R153)
제목과 메뉴는 바로 보이고, 데이터를 받는 동안 스켈레톤을 보여 준다.

S394 지연
- Given `demo-data=slow`
- Then  h1 "구독"과 스켈레톤(`aria-busy="true"`)이 먼저 보이고, 응답 뒤 "내 구독"이 보인다

S395 모바일 표
- Given 너비 375px, `demo-role=tester`
- Then  페이지에 가로 스크롤이 없다 (`scrollWidth`가 `clientWidth` 이하)
- Then  "혜택 비교"의 행 5개가 모두 보인다

## 7. 기존 테스트와 구조 (R154)

S396 준비 중 목록
- Then  `/my/subscription`은 S26 "준비 중" 목록과 `e2e/links.spec.ts`에서 빠지고, 대시보드·홈·프로젝트의 "구독 알아보기" 링크 테스트는 그대로 통과한다

S397 구조 (기존 S78)
- When  `grep -rl '"use client"' src`
- Then  새로 늘지 않는다 (모두 서버 컴포넌트)
- When  `grep -rln "mock" src --include='*.tsx'`
- Then  결과가 없다

## 8. 구독 결제 (R196~R199, 11-02 추가)
`/my/subscription/checkout`에서 상품과 결제 수단을 골라 구독을 시작하거나 연장한다. 실제 결제는 없고, 결제 기록은 브라우저 쿠키 `demo-subscription-<역할>`에만 남는다. 처음 구독과 연장은 같은 화면이고 제목은 "구독 결제"다. 시나리오는 `frontend/e2e/subscription-checkout.spec.ts`에 있다.

S533 비로그인
- Given `demo-role=guest`
- When  `/my/subscription/checkout`에 접속한다
- Then  URL이 `/login?next=%2Fmy%2Fsubscription%2Fcheckout`이다

S534 진입
- Given `demo-role=tester`
- When  구독 화면 "결제 안내"의 "구독하기"를 누른다
- Then  URL이 `/my/subscription/checkout`이고 h1 "구독 결제"가 있다
- Then  마이페이지 메뉴의 "구독"이 현재 항목이고, 본문 위에 구독(`/my/subscription`)으로 돌아가는 링크가 있다
- Given `demo-role=developer` (구독 중)
- Then  구독 화면의 버튼 이름이 "구독 연장하기"다

S535 운영자
- Given `demo-role=admin`
- Then  "운영자 계정은 구독 대상이 아니에요"가 보이고 고르는 칸이 없다

S536 크레딧이 넉넉할 때
- Given `demo-role=tester` (쓸 수 있는 크레딧 12,480)
- Then  "구독 시작" 폼에 상품 "구독 · 30일"과 결제 수단 "크레딧 9,000 크레딧"이 골라져 있다
- Then  이용 기간 "오늘 ~ 30일 뒤", "결제 뒤 남는 크레딧 3,480 크레딧"이 보인다
- Then  강조색 바탕 버튼은 "9,000 크레딧 결제하기" 하나다
- When  "현금 10,000원"을 고른다
- Then  버튼이 "10,000원 결제하기"가 되고 남는 크레딧 줄이 사라진다

S537 크레딧이 모자랄 때
- Given `demo-role=developer` (쓸 수 있는 크레딧 2,260, 구독 중 +30일)
- Then  "구독 연장" 폼에 "지금 구독은 N월 N일에 끝나요. 결제하면 그날부터 이어져요."가 보인다
- Then  크레딧 결제는 고를 수 없고 "6,740 크레딧 모자라요"가 보이며, 현금이 골라져 있다
- Then  이용 기간이 "30일 뒤 ~ 60일 뒤"다

S538 크레딧으로 결제
- Given `demo-role=tester`
- When  "9,000 크레딧 결제하기"를 누른다
- Then  URL이 `/my/subscription?notice=paid`이고 "결제했어요. N월 N일까지 구독 혜택을 쓸 수 있어요."가 보인다
- Then  "내 구독"이 "구독 중", "D-30"이고, 쓸 수 있는 크레딧 3,480, 버튼은 "구독 연장하기"다
- Then  헤더 보유 크레딧이 3,480이다
- Then  크레딧 화면 잔액이 3,480이고 가입 크레딧 0, 현금화 가능 3,480이며 내역 맨 위에 "구독 결제 −9,000"이 있다 (가입 크레딧을 먼저 쓴다)

S539 현금으로 연장
- Given `demo-role=developer`
- When  "10,000원 결제하기"를 누른다
- Then  "내 구독"이 "D-60", 만료일이 60일 뒤다
- Then  헤더 보유 크레딧은 3,260 그대로다

S540 안내 문구
- Given `demo-role=tester`, 결제하지 않음
- When  `/my/subscription?notice=paid`에 접속한다
- Then  안내 문구가 없다 (구독 중일 때만 보인다)

S541 모바일
- Given 너비 375px, `demo-role=developer`
- Then  구독 결제 화면에 가로 스크롤이 없다

S542 만료일 고정 (리뷰 반영)
- Given `demo-role=developer`, 7일 전에 낸 연장 기록(만료일 53일 뒤)
- Then  "내 구독"이 "D-53"이다 (목업의 "지금 + 30일"에 다시 더하지 않는다)
- Given 만료일이 지난 연장 기록
- Then  "구독하지 않았어요"가 보인다

S543 기록 보관 기간 (리뷰 반영)
- Given `demo-role=developer`
- When  현금으로 네 번 연장한다
- Then  "D-150"이고, 결제 기록 쿠키는 150일 뒤보다 늦게 만료된다

정한 것 (11-02)
- 주소는 구독 관리 아래 `/my/subscription/checkout`이다 (출금 신청 `/my/credits/withdrawals`와 같은 구조, `page-urls.md`에서는 후보).
- 결제 수단은 크레딧·현금 둘 다. 크레딧이 모자라면 크레딧 칸을 막고 모자란 양을 알리며, 현금은 시연이라 바로 결제된 것으로 본다.
- 구독 중이면 연장이다. 지금 만료일부터 상품 기간만큼 늘어난다. 만료가 지난 뒤 결제하면 결제 시각부터다.
- 만료일은 결제할 때 계산해 결제 기록에 고정한다. 결제 기록이 있으면 마지막 결제의 만료일을 쓰고, 조회 시각 기준인 목업 만료일은 쓰지 않는다. 그래야 시간이 지나며 남은 기간이 줄고 만료된다 (리뷰 반영, S542).
- 결제 기록 쿠키는 가장 늦은 만료일 + 30일까지 남긴다. 여러 번 연장한 기간이나 크레딧 차감 기록이 이용 기간보다 먼저 사라지지 않게 하기 위해서다 (리뷰 반영, S543). 10건을 모두 연장해도 약 1년이라 브라우저의 쿠키 수명 상한(400일) 안이다.
- 크레딧 결제는 가입 크레딧(구독 결제 전용)을 먼저 쓰고, 모자란 만큼 테스트로 받은 크레딧에서 뺀다. 출금 처리 중인 크레딧은 쓰지 않는다.
- 금액을 다루는 폼이라 고르는 칸과 버튼은 12px 모서리다 (DESIGN.md The Money Field Rule). 고른 칸은 바탕이 진해진다 (운영자 처리 폼과 같은 모양).
- 결제 뒤에는 구독 화면으로 돌아가 `?notice=paid`로 알린다 (참여 상세의 `?notice=submitted`와 같은 방식). 안내 문구에만 "시연용이라 실제로 결제되지 않고 이 브라우저에만 남아요"를 붙인다.
- 시연용 결제 기록은 10건까지다. 오래된 기록을 지우면 만료일과 크레딧이 함께 틀어져서, 가득 차면 더 받지 않는다.
- 클라이언트 컴포넌트 `CheckoutForm` 1개를 더한다 (고른 칸에 따라 금액·이용 기간·버튼 이름이 바뀐다). 홈 문서 S78 갱신.
- 구조: `src/lib/demo-subscription.ts`(시연용 결제 기록), `src/features/my/subscription-actions.ts`(`payForSubscription`), `src/features/my/components/CheckoutForm.tsx`, `src/app/my/(account)/subscription/checkout/page.tsx`. 결제 기록은 `features/my/api.ts`(만료일), `features/credit/api.ts`(잔액·내역), `lib/session.ts`(헤더 크레딧)가 읽는다.

## 범위 밖
- 구독 해지, 실제 결제(현금 결제 수단 입력·결제 대행), 결제 영수증 (고침 11-02: 구독 시작·연장과 결제 수단 선택은 R196~R199로 옮김)
- 개발자 프로젝트의 구독 여부(`features/project/api.ts` `findIsSubscribed`)는 시연 개발자 역할만 본다. 구독 결제로 바뀌지 않는다
- 상품이 여럿일 때의 화면 다듬기 (상품 선택, 상품별 혜택 차이). 지금은 목록 구조만 둔다
- 구독 결제 내역 (크레딧 내역의 "구독 결제" 행은 PR #9 `/my/credits`에 있음)
- 한도를 넘는 모집 글 등록 막기 (모집 글 등록 화면 몫)
- 자동 갱신, 만료 알림
- 비회원도 보는 공개 구독 안내 페이지 (`/pricing` 등). 나중에 만들고, 그때 혜택 비교표와 가격을 옮긴다 (10-31 결정)

## 작업 순서
0. (10-31 추가) 목업 가격 반영 — S387, S390, S398
   - 이미 만든 커밋(`a730f8e`, `b692728`, `b867133`) 위에 고친다 (되돌리기 여부는 사용자 결정에 따름)
   - 파일: `src/features/my/mock.ts`에 `SUBSCRIPTION_PLANS` (`{ id, name, periodDays, cashPrice, creditPrice }[]`, 지금 1개), `api.ts`의 `getSubscriptionOverview()`가 `plans`도 돌려줌, `types.ts`에 `SubscriptionPlan` 타입, 혜택 문구는 상품별 값으로
   - 파일: `PlanComparison.tsx`(열 = 무료 + 상품 목록, 머리에 가격), `SubscriptionPayment.tsx`(상품별 가격 줄)
   - 파일: `lib/format.ts`에 `formatWon` ("10,000원")
   - 확인: `npm run test:e2e && npm run lint`
1. 데이터 계층 — S384~S386, S390, S389의 데이터
   - 파일: `src/features/my/api.ts`에 `getSubscriptionOverview()` 추가 (`getMyPageSummary`와 같은 세션 확인·시연 지연, `buildMyPageSummary`의 `subscription`·`credits` 재사용). 반환: `{ subscription, payableCredits }`, 운영자는 `subscription: null`
   - 파일: `src/features/my/types.ts`에 `payableCredits` 계산 함수 (`earned - pendingWithdrawal + signup`)
   - 확인: `npx tsc --noEmit`
2. 페이지와 상태 — S382, S383, S384, S385, S386, S394
   - 파일: `src/app/my/(account)/subscription/page.tsx` (h1 + `Suspense` + 스켈레톤), `src/features/my/components/SubscriptionStatus.tsx`
   - 재사용: `card-styles.ts`, `Badge`, `formatDate`, `formatDday`, `Skeleton`
3. 혜택 비교 — S387, S388, S395
   - 파일: `src/features/my/components/PlanComparison.tsx` (표 `<table>`, 모바일은 열 2개라 줄바꿈만으로 맞춤), 혜택 문구 상수는 `types.ts`
4. 결제 안내와 만료 안내 — S390, S391, S392, S393
   - 파일: `src/features/my/components/SubscriptionPayment.tsx`, `SubscriptionExpiry.tsx` (재사용: `formatCredits`, `LinkButton`)
5. 테스트·문서 — S396, S397
   - 파일: `e2e/subscription.spec.ts` 새로 만듦 (테스트 이름은 S번호로 시작), `e2e/links.spec.ts`, `docs/frontend-home.md` S26, `docs/2026-10-30-frontend-my.md` 범위 밖에서 "구독 관리" 제거
   - 확인: `cd frontend && npm run test:e2e && npm run lint && npm run build`, 개발 서버에서 1440px·375px·다크 모드 눈으로 확인

6. (10-31 추가) 이번 달 모집 인원 — S399, S400, S387
   - 파일: `types.ts`(`PlanTerms`, `RecruitQuota`, 월간 모집 인원은 숫자 필드로), `mock.ts`(`FREE_PLAN`, 상품 `monthlyLimit`, 사용량), `api.ts`(한도·사용량·다시 채워지는 날 계산), `SubscriptionStatus.tsx`(사용량 칸), `PlanComparison.tsx`
   - 확인: `npm run test:e2e && npm run lint`

## 브랜치·커밋
- 브랜치: `feature/frontend-subscription` (`origin/develop`에서 분기, upstream 해제)
- 커밋:
  - `Feat: 구독 관리 화면` — 단계 1~4
  - `Test: 구독 관리 E2E 시나리오` — 단계 5 테스트
  - `Docs: 구독 관리 계획 문서, 홈 문서 S26 갱신` — 문서

## 가정
- 화면 순서: 내 구독 → 혜택 비교 → 결제 안내 → 만료되면(구독 중일 때만). 1024px 이상에서 내 구독과 결제 안내를 나란히 두고 혜택 비교는 아래 전체 너비. (배치는 구현 뒤 스크린샷으로 확인)
- 제목은 메뉴 이름과 같은 "구독"이다. URL 목록의 "구독 관리"는 페이지 종류 이름이다.
- 남은 날은 대시보드의 D-day 형식(`formatDday`)을 쓴다. 만료일은 접속 시각 +30일이다 (마이페이지 목업과 같음).
- 구독 결제에 쓸 수 있는 크레딧 = 테스트 획득 크레딧 − 출금 처리 중 + 가입 크레딧 (GLOSSARY: 가입 크레딧은 구독 결제 전용, 처리 중인 출금은 잠김). 승인 대기 보상은 넣지 않는다.
- 운영자는 구독 대상이 아니다 (마이페이지 가정과 같음).
- 혜택 문구는 spec.md 2장 표와 4장 "구독 만료"를 화면 말투로 옮긴 것이다. 보상액 수치는 쓰지 않는다. (고침 10-31: 한도는 목업 숫자)
- 목업 한도: 월간 모집 인원 무료 10명, 구독 30명. 이번 달 사용량은 developer 12명, tester 0명. 매월 1일(한국 시간)에 다시 채워진다. 취소·미완료 인원 복원은 다루지 않는다 (spec.md 미정).
- 남은 혜택은 월간 모집 인원만 보여 준다. 직접 선정·채팅·분석은 켜고 끄는 기능이고, 상단 노출은 순환이라 남은 양이 없다.
- 사용량 막대는 먹색이다 (강조색 규칙).
- 목업 가격: 30일 현금 10,000원 / 9,000 크레딧. spec.md 3장의 구조 설명용 예시를 그대로 쓴다 (확정 가격 아님). 기간 30일은 지금 만료일 목업(+30일)과 같다.
- 가격에 "시연용" 같은 표시는 붙이지 않는다 (10-31 사용자 결정).
- 상품 이름은 "구독" 하나다. 상품이 늘면 이름을 나눈다.
- 목업 가격은 `mock.ts`에만 둔다 (`.tsx`에 mock 금지, S397).
- `frontend/PRODUCT.md`의 "미정: 구독 가격"은 그대로 둔다. 기획상 미정인 것은 바뀌지 않았고, 화면만 목업 값을 쓴다.
- 혜택 비교 행 "모집 글 등록·지원 현황·받은 피드백 확인"은 무료·구독이 같아서 표에 넣지 않고, 만료 안내의 "남는 것"에 둔다.
- 새 데이터 함수는 `features/my/api.ts` 끝에 더한다. PR #11도 같은 파일 끝에 함수를 더해서, 나중에 머지할 때 두 함수를 모두 남기면 된다.
- `/my/subscription`이 PR #9·#11의 S26 줄과 또 겹친다. 해결은 양쪽에서 뺀 페이지를 모두 빼는 것.
- S번호는 S382~S400을 쓴다. 처음에는 S193~S211이었는데(참여 테스트와 겹쳐 10-31 머지 때 +2로 고침) 출금 요청 관리(S191~S219) 등과 또 겹쳐서, 11-02 번호 정리에서 새 구간으로 옮겼다.

## 참고 (2026-10-30 확인)
- 구독 혜택·만료: `project-lion/.scratch/tester-platform-planning/spec.md` 2장 표(무료/구독 개발자), 3장(크레딧 우대, 임시 가격 미채택), 4장(채팅·노출·구독 만료), "미정으로 유지할 항목"
- 크레딧: `project-lion/GLOSSARY.md` (가입 크레딧은 구독 결제 전용, 크레딧 결제 우대)
- 현재 구독 표시: `frontend/src/features/my/components/SubscriptionCard.tsx`, `types.ts` `Subscription`, `mock.ts` (tester 미구독, developer 구독 중 +30일, admin null)
- 구독 여부 판단: `frontend/src/features/project/api.ts` `findIsSubscribed` (개발자 역할만 구독 중)
- 페이지 URL: `docs/page-urls.md` "구독 관리 `/my/subscription` 확정"
