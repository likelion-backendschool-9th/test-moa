# 프론트엔드 구독 관리 (`/my/subscription`)

## 한눈에
- 끝나면: `/my/subscription`에서 내 구독 상태(구독 중이면 만료일과 남은 날, 아니면 미구독)와 무료·구독 혜택 비교, 구독 상품의 목업 가격(30일 10,000원 / 9,000 크레딧), 구독 결제에 쓸 수 있는 크레딧을 본다. 구독 중이면 만료 뒤 바뀌는 점도 본다. 구독 버튼은 두지 않는다. (고침 10-31: 가격 미정 안내 → 목업 가격)
- 결정 필요: 목업 가격 값 (아래 가정의 기본값으로 갈지)
- 규모: 5단계, 약 2~3시간

## 맥락
- 지금 `/my/subscription`은 "준비 중"이다. 마이페이지 메뉴 "구독", 대시보드 구독 카드의 "구독 알아보기"·"구독 관리", 홈 구독 모집 영역과 프로젝트 분석 탭의 "구독 알아보기"가 여기로 온다.
- 구독은 계정 단위다. 개발자와 테스터는 한 계정이라 화면을 역할로 나누지 않는다. 구독 혜택은 모집 글을 올리는 쪽(개발자 활동)에 붙는다.
- 구독 가격·주기·크레딧 우대율은 기획에서 미정이다 (spec.md 3장). 화면은 목업 가격으로 만들고, 정해지면 목업 값만 바꾼다 (10-31 사용자 결정).
- 구독 상품은 지금 하나다. 나중에 늘어날 수 있어서 상품은 목록 데이터로 두고, 화면은 목록을 그린다.
- 백엔드는 고려하지 않는다. 데이터는 목업이다.

## 1. 접근 제어 (R1)
비로그인 사용자는 구독 관리를 볼 수 없고 로그인으로 이동한다.

S193 비로그인
- Given `demo-role=guest`
- When  `/my/subscription`에 접속한다
- Then  URL이 `/login?next=%2Fmy%2Fsubscription`이다

S194 로그인
- Given `demo-role=tester`
- Then  h1 "구독"이 있다
- Then  "마이페이지 메뉴"의 "구독"에 `aria-current="page"`가 있다

## 2. 내 구독 상태 (R2)
구독 중이면 만료일과 남은 날을, 아니면 미구독임을 보여 준다. 값은 대시보드 구독 카드와 같다.

S195 미구독
- Given `demo-role=tester`
- Then  "내 구독" 카드에 "구독하지 않았어요"가 보인다
- Then  "구독 중" 표시와 만료일은 없다

S196 구독 중
- Given `demo-role=developer`
- Then  "내 구독" 카드 제목 줄에 "구독 중"이 보인다
- Then  같은 크기의 값 세 개가 보인다: 이용 중인 상품 "구독", 남은 기간 "D-30", 만료일(접속일 +30일 "N월 N일") (고침 10-31: 값 크기를 맞추고 이용 중인 상품 추가 — 사용자 피드백)

S197 운영자
- Given `demo-role=admin`
- Then  "운영자 계정은 구독 대상이 아니에요"와 "마이페이지"(`/my`) 링크가 보인다
- Then  혜택 비교와 결제 안내는 없다

S210 이번 달 모집 인원 (구독 중) (고침 10-31: 남은 혜택 표시 추가 — 사용자 요청)
- Given `demo-role=developer`
- Then  "내 구독" 카드에 "이번 달 모집 인원"과 "18명 남음"이 보인다
- Then  사용량 막대(`role="meter"`)의 값이 12, 최대가 30이고 "12 / 30명"이 보인다
- Then  다음 달 1일의 "N월 1일에 다시 채워져요"가 보인다

S211 이번 달 모집 인원 (무료)
- Given `demo-role=tester`
- Then  "10명 남음", "0 / 10명"이 보인다
- Then  "구독하면 월 30명까지 모집할 수 있어요"가 보인다

## 3. 혜택 비교 (R3)
무료와 구독 상품의 차이를 표로 보여 주고, 지금 내 상태의 열을 표시한다. 열 머리에는 상품 이름과 가격을 쓴다. 월간 모집 인원은 목업 한도를 숫자로 쓴다. (고침 10-31: 한도 목업 값 사용)

S198 비교표
- Given `demo-role=tester`
- Then  "혜택 비교" 표에 열 "무료", "구독"이 있다
- Then  행 5개가 순서대로 있다: 참여 확정 방식("선착순 자동 확정" / "지원자 중 직접 선정"), 월간 모집 인원("월 10명" / "월 30명"), 테스터 보상("기본 보상" / "기본 + 추가 보상"), 1대1 채팅("없음" / "선정한 테스터와 가능"), 모집 목록 노출("일반 목록" / "상단 구독 영역")
- Then  "무료" 열 머리에 "지금 이용 중"이 있다
- Then  "무료" 열 머리에 "0원", "구독" 열 머리에 "30일 10,000원"이 있다

S199 구독 중 표시
- Given `demo-role=developer`
- Then  "구독" 열 머리에 "지금 이용 중"이 있고 "무료" 열에는 없다

S200 (지움 10-31: 월간 모집 인원에 목업 한도 숫자를 쓰기로 함)

## 4. 결제 안내 (R4)
구독 상품의 가격(현금·크레딧)과 기간, 구독 결제에 쓸 수 있는 크레딧을 보여 준다. 가격은 시연용 목업이다. 구독 버튼은 두지 않는다. (고침 10-31: 가격 미정 안내 → 목업 가격)

S201 가격과 쓸 수 있는 크레딧
- Given `demo-role=tester`
- Then  "결제 안내" 카드에 상품 "구독"과 "30일"이 보인다
- Then  "현금 10,000원", "크레딧 9,000 크레딧"이 보인다
- Then  "구독 결제에 쓸 수 있는 크레딧 12,480 크레딧"이 보인다
- Then  "이벤트 크레딧도 구독 결제에 쓸 수 있어요"와 "크레딧으로 결제하면 현금보다 우대 가격이 적용돼요"가 보인다 (고침 11-02: 크레딧 구분 이름 변경, `2026-11-02-frontend-credit-labels.md`)
- Then  "구독하기" 버튼·링크가 없다

S202 출금 처리 중 제외
- Given `demo-role=developer`
- Then  "구독 결제에 쓸 수 있는 크레딧 2,260 크레딧"이 보인다 (출금 처리 중 1,000 제외)
- Then  "크레딧 내역"(`/my/credits`) 링크가 있다

S209 상품 목록 (R3·R4)
- Given 구독 상품 목록에 상품이 1개다
- Then  "결제 안내"에 상품이 1개, "혜택 비교" 열 머리가 "혜택", "무료", "구독" 3개다
- Then  화면 코드는 상품 수를 가정하지 않는다 (상품을 목록에 더하면 결제 안내 항목과 비교표 열이 함께 늘어난다)

## 5. 만료 뒤 바뀌는 점 (R5)
구독 중인 회원에게 만료되면 무엇이 멈추고 무엇이 남는지 알려 준다.

S203 구독 중
- Given `demo-role=developer`
- Then  "만료되면" 카드에 남는 것 3개가 있다: "받은 피드백과 채팅 기록 보기", "이미 참여가 확정된 테스터의 보상", "모집 글 등록과 지원 현황 확인"
- Then  멈추는 것 4개가 있다: "새 테스터 직접 선정", "채팅 메시지 보내기", "상단 구독 영역 노출", "분석"

S204 미구독
- Given `demo-role=tester`
- Then  "만료되면" 카드가 없다

## 6. 로딩과 화면 (R6)
제목과 메뉴는 바로 보이고, 데이터를 받는 동안 스켈레톤을 보여 준다.

S205 지연
- Given `demo-data=slow`
- Then  h1 "구독"과 스켈레톤(`aria-busy="true"`)이 먼저 보이고, 응답 뒤 "내 구독"이 보인다

S206 모바일 표
- Given 너비 375px, `demo-role=tester`
- Then  페이지에 가로 스크롤이 없다 (`scrollWidth`가 `clientWidth` 이하)
- Then  "혜택 비교"의 행 5개가 모두 보인다

## 7. 기존 테스트와 구조 (R7)

S207 준비 중 목록
- Then  `/my/subscription`은 S26 "준비 중" 목록과 `e2e/links.spec.ts`에서 빠지고, 대시보드·홈·프로젝트의 "구독 알아보기" 링크 테스트는 그대로 통과한다

S208 구조 (기존 S78)
- When  `grep -rl '"use client"' src`
- Then  새로 늘지 않는다 (모두 서버 컴포넌트)
- When  `grep -rln "mock" src --include='*.tsx'`
- Then  결과가 없다

## 범위 밖
- 구독 시작·연장·해지, 결제 수단 선택, 실제 결제
- 상품이 여럿일 때의 화면 다듬기 (상품 선택, 상품별 혜택 차이). 지금은 목록 구조만 둔다
- 구독 결제 내역 (크레딧 내역의 "구독 결제" 행은 PR #9 `/my/credits`에 있음)
- 한도를 넘는 모집 글 등록 막기 (모집 글 등록 화면 몫)
- 자동 갱신, 만료 알림
- 비회원도 보는 공개 구독 안내 페이지 (`/pricing` 등). 나중에 만들고, 그때 혜택 비교표와 가격을 옮긴다 (10-31 결정)

## 작업 순서
0. (10-31 추가) 목업 가격 반영 — S198, S201, S209
   - 이미 만든 커밋(`a730f8e`, `b692728`, `b867133`) 위에 고친다 (되돌리기 여부는 사용자 결정에 따름)
   - 파일: `src/features/my/mock.ts`에 `SUBSCRIPTION_PLANS` (`{ id, name, periodDays, cashPrice, creditPrice }[]`, 지금 1개), `api.ts`의 `getSubscriptionOverview()`가 `plans`도 돌려줌, `types.ts`에 `SubscriptionPlan` 타입, 혜택 문구는 상품별 값으로
   - 파일: `PlanComparison.tsx`(열 = 무료 + 상품 목록, 머리에 가격), `SubscriptionPayment.tsx`(상품별 가격 줄)
   - 파일: `lib/format.ts`에 `formatWon` ("10,000원")
   - 확인: `npm run test:e2e && npm run lint`
1. 데이터 계층 — S195~S197, S201, S200의 데이터
   - 파일: `src/features/my/api.ts`에 `getSubscriptionOverview()` 추가 (`getMyPageSummary`와 같은 세션 확인·시연 지연, `buildMyPageSummary`의 `subscription`·`credits` 재사용). 반환: `{ subscription, payableCredits }`, 운영자는 `subscription: null`
   - 파일: `src/features/my/types.ts`에 `payableCredits` 계산 함수 (`earned - pendingWithdrawal + signup`)
   - 확인: `npx tsc --noEmit`
2. 페이지와 상태 — S193, S194, S195, S196, S197, S205
   - 파일: `src/app/my/(account)/subscription/page.tsx` (h1 + `Suspense` + 스켈레톤), `src/features/my/components/SubscriptionStatus.tsx`
   - 재사용: `card-styles.ts`, `Badge`, `formatDate`, `formatDday`, `Skeleton`
3. 혜택 비교 — S198, S199, S206
   - 파일: `src/features/my/components/PlanComparison.tsx` (표 `<table>`, 모바일은 열 2개라 줄바꿈만으로 맞춤), 혜택 문구 상수는 `types.ts`
4. 결제 안내와 만료 안내 — S201, S202, S203, S204
   - 파일: `src/features/my/components/SubscriptionPayment.tsx`, `SubscriptionExpiry.tsx` (재사용: `formatCredits`, `LinkButton`)
5. 테스트·문서 — S207, S208
   - 파일: `e2e/subscription.spec.ts` 새로 만듦 (테스트 이름은 S번호로 시작), `e2e/links.spec.ts`, `docs/frontend-home.md` S26, `docs/2026-10-30-frontend-my.md` 범위 밖에서 "구독 관리" 제거
   - 확인: `cd frontend && npm run test:e2e && npm run lint && npm run build`, 개발 서버에서 1440px·375px·다크 모드 눈으로 확인

6. (10-31 추가) 이번 달 모집 인원 — S210, S211, S198
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
- 목업 가격은 `mock.ts`에만 둔다 (`.tsx`에 mock 금지, S208).
- `frontend/PRODUCT.md`의 "미정: 구독 가격"은 그대로 둔다. 기획상 미정인 것은 바뀌지 않았고, 화면만 목업 값을 쓴다.
- 혜택 비교 행 "모집 글 등록·지원 현황·받은 피드백 확인"은 무료·구독이 같아서 표에 넣지 않고, 만료 안내의 "남는 것"에 둔다.
- 새 데이터 함수는 `features/my/api.ts` 끝에 더한다. PR #11도 같은 파일 끝에 함수를 더해서, 나중에 머지할 때 두 함수를 모두 남기면 된다.
- `/my/subscription`이 PR #9·#11의 S26 줄과 또 겹친다. 해결은 양쪽에서 뺀 페이지를 모두 빼는 것.
- S번호는 S193~S211을 쓴다 (develop의 참여 테스트가 S191·S192를 써서 S193부터, 10-31 머지 때 +2로 고침).

## 참고 (2026-10-30 확인)
- 구독 혜택·만료: `project-lion/.scratch/tester-platform-planning/spec.md` 2장 표(무료/구독 개발자), 3장(크레딧 우대, 임시 가격 미채택), 4장(채팅·노출·구독 만료), "미정으로 유지할 항목"
- 크레딧: `project-lion/GLOSSARY.md` (가입 크레딧은 구독 결제 전용, 크레딧 결제 우대)
- 현재 구독 표시: `frontend/src/features/my/components/SubscriptionCard.tsx`, `types.ts` `Subscription`, `mock.ts` (tester 미구독, developer 구독 중 +30일, admin null)
- 구독 여부 판단: `frontend/src/features/project/api.ts` `findIsSubscribed` (개발자 역할만 구독 중)
- 페이지 URL: `docs/page-urls.md` "구독 관리 `/my/subscription` 확정"
