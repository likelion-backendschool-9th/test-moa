# 2. 점검 결과

## 기준

- 코드: `origin/develop` `5db2041`(#142 병합 시점)의 `frontend/src`. 파일 229개 가운데 TypeScript 226개(`app` 39개, 그 밖 187개)를 봤다.
- Next 규칙: [1. Next 규칙](01-next-rules.md)의 N1~N15.
- 팀 규칙: `frontend/README.md` "폴더 구조와 규칙"과 "의존 방향".
- 사용처: [`scripts/structure/usage.mjs`](../../frontend/scripts/structure/usage.mjs)로 계산했다. import 경로를 실제 파일로 풀어서 잇고, 그 파일을 직접·간접으로 쓰는 페이지·레이아웃의 URL을 모은다. 파일 이름만 맞춰 보지 않는다.
- import 경계: [`scripts/structure/eslint-boundaries.mjs`](../../frontend/scripts/structure/eslint-boundaries.mjs)(B1~B7)를 ESLint로 실행했다.

다시 확인하려면 [README의 확인 방법](README.md#직접-확인하는-방법)을 따른다.

심각도는 이렇게 나눴다.

| 심각도 | 뜻 |
| --- | --- |
| 높음 | 새 기능을 넣을 때마다 같은 잘못이 늘어난다. 구조 정리의 핵심이다 |
| 중간 | 특정 영역에서 혼란이나 우회 코드를 만든다 |
| 낮음 | 정리하면 좋지만 미뤄도 늘어나지 않는다 |

## 2.1 한눈에

| 영역 | 판정 | 핵심 근거 |
| --- | --- | --- |
| Next 파일 규칙 (라우팅·서버/클라이언트·인증·데이터 접근·proxy) | 문제없음 | N6~N14 모두 맞음. 액션 8개 파일 모두 권한을 다시 확인한다 |
| import 방향 (README 의존 규칙) | 문제없음 | ESLint 경계 규칙 B1~B7 위반 0건 |
| `features/*/components` | **잘못됨 (높음)** | 99개 가운데 88개가 한 구역 안에서만 쓰인다 → F1 |
| `features/home`·`my`·`admin` | **잘못됨 (높음)** | 도메인이 아니라 화면 이름이다 → F2 |
| `src/components/layout` | **잘못됨 (높음)** | 루트 레이아웃 전용 코드가 세션·시연·로그아웃 액션을 안다 → F3 |
| 채팅방 푸터 | 우회 (중간) | 경로 그룹 레이아웃 대신 `HideFooter` → F4 |
| 모집 도메인 | 갈라짐 (중간) | `features/recruitment`와 `features/project`가 나눠 가진다 → F5 |
| `src/lib` | 일부 잘못됨 (중간) | 15개 가운데 8개가 도메인을 안다 → F6 |
| 시연(목업) 코드 | 흩어짐 (중간) | 16개 파일이 10개 폴더에 있다 → F8 |
| `src/components/ui` | 거의 맞음 (낮음) | 12개 가운데 1개만 옮긴다. 다른 기능의 `TextField` 1개를 들여온다 → F11 |
| 권한 확인 함수 | 흩어짐 (낮음) | 4개 파일에 있다 → F7 |
| `error.tsx` | 없음 (낮음) | → F9 |
| e2e 시연 쿠키 | 테스트 3곳이 형식을 직접 만든다 (낮음) | → F10 |

가장 중요한 결론은 이렇다. **코드는 README의 import 규칙을 지키고 있다. 문제는 README에 "파일을 어디에 두는가" 규칙이 없다는 데 있다.** README는 "누가 누구를 import해도 되는가"만 정하고 "한 화면만 쓰는 부품은 어디에 두는가"는 정하지 않았다. 그래서 import 검사(B1~B7)는 통과하는데, 배치 검사(`usage.mjs --check`)는 88건이 나온다.

## 2.2 문제 목록

### F1. 라우트 하나만 쓰는 화면 부품이 `features`에 있다 (높음)

`features/*/components`의 파일 99개를 사용처별로 나누면 이렇다(`usage.mjs`).

| 사용 범위 | 개수 | 예 |
| --- | ---: | --- |
| 라우트 하나 | 74 | `features/my/components/TodoList.tsx` → `/my`만 |
| 한 구역 안의 여러 라우트 | 14 | `features/admin/components/AdminShell.tsx` → `/admin/*` 6곳 |
| 여러 구역 | 11 | `features/recruitment/components/RecruitmentThumb.tsx` → 홈, 참여 테스트 |

| 기능 폴더 | 부품 수 | 한 라우트 | 한 구역 | 여러 구역 |
| --- | ---: | ---: | ---: | ---: |
| `admin` | 16 | 14 | 2 | 0 |
| `auth` | 6 | 3 | 3 | 0 |
| `chat` | 13 | 9 | 0 | 4 |
| `credit` | 6 | 3 | 3 | 0 |
| `home` | 4 | 4 | 0 | 0 |
| `my` | 16 | 14 | 2 | 0 |
| `participation` | 12 | 12 | 0 | 0 |
| `project` | 19 | 10 | 4 | 5 |
| `recruitment` | 7 | 5 | 0 | 2 |

`participation`과 `home`은 부품 전부가, `admin`과 `my`는 16개 중 14개가 한 라우트 전용이다. `features`는 도메인 공유 코드를 두는 곳인데 실제로는 `app` 라우트 트리를 한 번 더 만든 꼴이 됐다. 페이지 하나를 고치려면 `app/…/page.tsx`와 `features/…/components/…`를 오가야 하고, 폴더만 봐서는 어떤 부품이 공유되는지 알 수 없다.

원인은 README의 "app/ 라우트. 데이터를 불러와 도메인 컴포넌트를 조립만 한다"는 규칙이다. `app`에 부품을 둘 수 없으니 한 화면 전용 부품도 `features`로 갈 수밖에 없었다. Next는 라우트 폴더 안에 부품을 둬도 안전하고(N1), 비공개 폴더로 나눌 수 있다(N2)고 한다.

확인: `node frontend/scripts/structure/usage.mjs frontend --check`의 R1 88건. "여러 구역" 11개 가운데 채팅 4개는 채팅함·채팅방이 다른 경로 그룹으로 갈려서 생긴 것이다.

### F2. 기능 폴더 세 개가 도메인이 아니라 화면 이름이다 (높음)

| 폴더 | 안에 섞인 도메인 | 근거 (export) |
| --- | --- | --- |
| `features/home` | 없음. 홈 화면 부품 4개 | 모두 `/`만 쓴다 |
| `features/my` | 회원(프로필·비밀번호), 구독(상품·결제), 마이페이지 홈 요약·할 일 | `api.ts`: `getProfile`, `getSubscriptionOverview`, `getMyPageSummary` / `types.ts`: `Subscription`, `SubscriptionPlan`, `Todo`, `MyPageSummary` |
| `features/admin` | 신고, 출금 처리, 회원 관리, 운영자 권한, 운영자 홈 요약 | `api.ts`: `requireAdmin`, `getReports`, `getWithdrawals`, `getAdminSummary` / `types.ts`: `Report`, `WithdrawalRequest`, `REJECT_REASONS` / `users.ts`: `getUsers`, `maskEmail` |

`my`가 화면 이름이라서 생긴 결과가 양방향 의존이다.

- `features/credit/components/*` → `features/my/components/card-styles.ts` (3곳)
- `features/my/components/RecentCredits.tsx` → `features/credit/components/DayGroups.tsx`, `LedgerRow.tsx`

두 기능이 서로의 부품을 가져다 쓴다. 출금(`WithdrawalRequest`)도 운영자 쪽은 `features/admin/types.ts`, 회원 쪽은 `features/credit/types.ts`에 따로 있다.

### F3. `src/components/layout`은 루트 레이아웃 전용인데 공용 폴더에 있다 (높음)

`components/layout`의 9개 파일 가운데 8개는 `app/layout.tsx` 한 곳만 쓴다. 나머지 1개(`HideFooter`)는 채팅방만 쓴다. 공용 폴더에 있지만 공용이 아니다. 그리고 이 폴더는 도메인과 서버 상태를 안다.

| 파일 | import | 문제 |
| --- | --- | --- |
| `AppFooter.tsx` | `lib/session`, `lib/backend`(`isBackendAuth`), `lib/demo` | 푸터가 세션·백엔드 모드·시연 모드를 직접 읽는다 |
| `UserMenu.tsx` | `features/auth/actions`(`logout`), `lib/session` 타입 | 보유 크레딧과 로그아웃 액션을 안다 |
| `MobileMenu.tsx` | `features/auth/actions`(`logout`), `lib/nav` | 같다 |
| `DemoSwitcher.tsx` | - | 개발 전용 시연 도구가 사이트 틀 부품과 같은 폴더에 있다 |

README는 "다른 기능은 그 기능의 `actions.ts`를 부르지 않는다"고 하는데, `components/layout`은 "기능"이 아니라서 이 규칙에 걸리지 않았다. 규칙은 지켰지만 공용 부품 폴더가 로그인 상태와 시연 모드를 아는 구조다.

이 파일들은 루트 레이아웃의 일부이므로 `app/_components`에 두는 것이 맞다(전략 C, `구조:349`). 그러면 `components/`에는 도메인을 모르는 부품(`ui`)만 남는다.

### F4. 채팅방이 상위 푸터를 CSS로 숨긴다 (중간)

`components/layout/HideFooter.tsx`는 채팅방에 `<style>`을 넣어 `[data-site-footer]`를 숨긴다. Cache Components에서는 숨겨진 이전 화면(Activity)이 문서에 남아서, 처음 구현한 `:has` 방식이 홈 푸터까지 숨긴 일이 있었다(파일 첫 주석). 지금 구현은 Next 문서가 알려 준 방법(N15)이라 동작은 맞다.

하지만 이 우회가 필요해진 원인은 푸터를 루트 레이아웃 하나가 그리기 때문이다. Next는 같은 URL 구조에서도 경로 그룹마다 레이아웃을 다르게 줄 수 있다고 한다(N4, `구조:371`, `구조:383`). 푸터 있는 화면과 없는 화면을 경로 그룹으로 나누면 `HideFooter`가 필요 없다.

### F5. 모집 도메인이 두 기능에 갈렸다 (중간)

| 모집 관련 코드 | 지금 위치 |
| --- | --- |
| 공개 모집 목록·필터·카드, 모집 타입 일부 | `features/recruitment` |
| 모집 상태 계산, 분석, 취소, 지원자 선정, 작성 검사, 공개 모집 상세 조회 | `features/project/service.ts`(486줄) |
| 모집 건 상태 배지 `RecruitmentStatusBadge` | `features/project/components/StatusBadge.tsx` |
| 모집 건·지원·피드백 타입 | `features/project/types.ts` |
| 모집 목업 | `features/recruitment/mock.ts`. `features/project/api.ts`가 직접 import한다(README의 알려진 예외) |

`service.ts` 한 파일에 프로젝트 조회, 모집 처리, 권한 확인(`requireRole`), 폼 검사가 함께 있다. 모집을 고치려면 두 기능을 모두 봐야 한다.

### F6. `lib` 15개 가운데 8개가 도메인을 안다 (중간)

README는 `lib`를 "도메인을 모른다"고 정했다. ESLint B2(`lib`는 `features`를 import하지 않는다)는 통과하지만, 내용은 도메인이다.

| 파일 | 아는 도메인 |
| --- | --- |
| `lib/session.ts` | 역할, 닉네임, 보유 크레딧. 시연 구독 결제 기록으로 크레딧을 깎는다 |
| `lib/validation.ts` | 회원 정보(이름·닉네임·비밀번호) 형식 |
| `lib/project-paths.ts` | 개발자 프로젝트·모집 주소 |
| `lib/participation-paths.ts` | 테스터 참여 목록·상세 주소 (#101 후속에서 생김) |
| `lib/nav.ts` | 헤더 탭 정의, `Session` 타입 |
| `lib/auth.ts` | 로그인 회원 확인(`requireMember`) |
| `lib/demo.ts`, `lib/demo-subscription.ts` | 시연 데이터 상황, 시연 구독 결제 |

도메인을 모르는 것은 `cn.ts`, `format.ts`, `form.ts`, `next-path.ts`, `backend-http.ts`, `auth-tokens.ts`, `backend.ts`다. `backend-http.ts`는 #123에서 쿠키를 모르는 통신으로 분리돼 이미 맞는 모양이다.

### F7. 권한 확인 함수가 4곳에 있다 (낮음)

| 함수 | 위치 |
| --- | --- |
| `requireAdmin`, `assertAdmin` | `features/admin/api.ts` |
| `requireRole` | `features/project/service.ts` |
| `requireMember` | `lib/auth.ts` |
| `getProfile` (로그인 확인 겸함) | `features/my/api.ts` |

동작은 맞다(N7, N8). 다만 "권한 확인은 어디서 하나"를 찾으려면 네 곳을 봐야 한다. 같은 역할을 하는 데이터 접근 파일 이름도 `api.ts`·`service.ts`·`users.ts`·`reviews.ts`로 갈린다(N9는 방식 하나로 맞추라고 한다).

### F8. 시연 코드가 16개 파일, 10개 폴더에 흩어져 있다 (중간)

| 종류 | 파일 |
| --- | --- |
| 목업 데이터 | `features/{admin,chat,credit,member,my,participation,project,recruitment}/mock.ts` (8) |
| 쿠키에 남기는 시연 기록 | `features/credit/demo-requests.ts`, `features/participation/demo-feedback.ts`, `features/project/demo-decisions.ts`, `features/admin/reviews.ts` (4) |
| 시연 상황·결제 | `lib/demo.ts`, `lib/demo-subscription.ts` (2) |
| 시연 도구 화면 | `components/layout/DemoSwitcher.tsx` (1) |
| 세션의 시연 역할 쿠키 | `lib/session.ts`의 `DEMO_ROLE_COOKIE` (1) |

실제 API로 바꿀 때 지울 코드가 어디까지인지 폴더만 봐서는 알 수 없다. `features/project/api.ts → features/recruitment/mock.ts`처럼 기능 사이에 목업을 주고받는 예외도 생겼다.

### F9. `error.tsx`가 없다 (낮음)

`app` 어디에도 `error.tsx`가 없다. 서버 컴포넌트에서 예외가 나면 Next 기본 오류 화면이 뜬다. 백엔드 연결(`AUTH_MODE=backend`)이 늘수록 필요해진다. 만든다면 클라이언트 컴포넌트여야 한다(N12). 그래서 서버 전용 코드를 읽는 지금 푸터(`AppFooter`)를 그대로 쓸 수 없다. 화면 틀은 [3.3](03-target-structure.md#33-레이아웃이-맡는-것)에 정했다.

### F10. e2e 3곳이 시연 기록 쿠키 형식을 직접 만든다 (낮음)

`e2e/helpers.ts`의 `setDemo`가 역할·데이터 쿠키를 맡지만, 아래 3곳은 시연 기록 쿠키를 테스트 안에서 직접 직렬화한다.

- `subscription-checkout.spec.ts:99` `demo-subscription-<역할>`
- `admin-reports.spec.ts:166` `demo-reports`
- `projects.spec.ts:661` `demo-recruitment-cancel-…`

`participations.spec.ts:124`의 `participation-view`는 시연 기록이 아니라 실제 보기 설정 쿠키라서 여기에 넣지 않는다.

시연 기록의 저장 형식을 바꾸면 테스트도 같이 고쳐야 한다. 구조 정리 범위는 아니지만, 시연 코드를 `demo/`로 모을 때 함께 `e2e/helpers.ts`로 모으면 된다.

### F11. `components/ui` (낮음)

12개 가운데 11개는 도메인·라우트·세션을 모르는 부품이다. ESLint B1 위반이 0건이다. 옮길 것은 이렇다.

- `ProofMarks.tsx`: 히어로의 네 모서리 재단선. DESIGN.md:364 "The Proof Mark Rule"이 히어로에만 둔다고 정했다. 범용 부품이 아니라 홈 전용 장식이라 홈으로 옮긴다.
- 반대로 `features/project/components/TextField.tsx`는 도메인을 모르는 입력 칸인데 `project`에 있어서, `participation`의 `FeedbackField`가 `project`에서 가져다 쓴다. `components/ui`로 옮긴다.
- `FormField.tsx`의 첫 주석이 "회원 정보 폼의 칸"이라고 적혀 있다. 코드는 아이콘만 import해서 도메인을 모른다. 주석만 일반화하면 된다.
- `Carousel`·`Pagination`은 한 곳에서만 쓰지만 도메인을 모르는 범용 부품이라 그대로 둔다. `components/ui`의 기준은 사용 횟수가 아니라 "도메인·URL을 모르는가"다.

`FormField`(알약 모양)와 `TextField`(입력 칸 모양) 두 입력 칸을 하나로 합칠지는 디자인 결정이라 이 문서 범위 밖이다.

## 2.3 문제없는 것

근거와 함께 적는다. 구조를 정리할 때 건드리지 않는다.

| 항목 | 근거 |
| --- | --- |
| 서버 액션의 권한 재확인 | 액션 8개 파일. 직접(`requireMember`, `getSession`) 또는 데이터 함수(`assertAdmin`, `roomMember`, `getProfile`, `getMyRecruitment→requireRole`)를 거쳐 확인한다. 로그인·가입은 확인할 세션이 없다 |
| 레이아웃에서 인증 검사 안 함 | `app/my/(account)/layout.tsx`는 메뉴만 그린다(N7) |
| 서버 전용 표시 | 쿠키를 읽는 데이터 파일은 모두 `server-only` 또는 `"use server"`다 |
| 클라이언트 경계 | 클라이언트 파일이 서버 전용 모듈을 부르는 곳은 `import type`뿐이다(N11) |
| Route Handler 없음 | 서버 컴포넌트가 Spring을 바로 부른다(N13) |
| `proxy.ts` 위치와 `backend-http.ts` 분리 | N14. 통신은 쿠키를 모르고 토큰을 인자로 받는다 |
| 운영자 탭의 현재 위치 | 페이지가 `path`를 넘긴다. 레이아웃이 `pathname`을 못 받는다는 규칙(N6)에 맞다 |
| `my/(account)` 경로 그룹 | 일부 라우트에만 레이아웃을 주는 문서 용법 그대로다(N3) |
| `src` 폴더 | 선택 사항이라(`구조:307`) 지금 모양도 규칙에 맞다. 다만 `create-next-app` 추천 기본값을 따라 쓰지 않기로 정했다(0단계) |
| 파일 이름 표기 | 부품은 PascalCase, 그 밖은 소문자로 일관된다. Next 요구사항이 아니므로 바꾸지 않는다 |

## 2.4 현재 상태를 숫자로

| 검사 | 현재 결과 | 목표 |
| --- | --- | --- |
| `usage.mjs --check` R1 (`features` 부품이 한 구역 안에서만 쓰인다) | 88 | 0 |
| `usage.mjs --check` R0 (경로를 알 수 없는 동적 import) | 0 (동적 import가 없다) | 0 |
| `usage.mjs --check` R2 (`_components`를 부모 경로 밖에서 import) | 0 (`_components`가 아직 없다) | 0 |
| `usage.mjs --check` R3 (`components/ui`가 도메인·세션을 import) | 0 | 0 |
| ESLint 경계 B1~B7 | 0 | 0 |
| 화면 이름 기능 폴더(`home`, `my`, `admin`) | 3 | 0 |
| 도메인을 아는 `lib` 파일 | 8 (`demo` 2개 포함) | 0 |
| 시연 코드가 있는 폴더 | 10 | 1 (`demo/`) |
