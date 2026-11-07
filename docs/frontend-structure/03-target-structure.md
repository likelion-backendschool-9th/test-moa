# 3. 목표 구조와 규칙

[2. 점검 결과](02-audit.md)의 F1~F11을 없애는 구조다. Next가 예로 든 전략 C를 쓴다. 전역 공유 코드는 위에 두고, 특정 라우트용 코드는 그 라우트 폴더로 나눈다(`구조:349`). 배치와 의존 규칙은 `frontend/README.md`에도 기록한다.

## 3.1 전체 모양

`src` 폴더는 쓰지 않는다(2026-11-06). 앱 코드는 `frontend/` 바로 아래에 두고, 설정 파일(`package.json`, `next.config.ts`, `tsconfig.json`)·`public/`·`e2e/`·`scripts/`와 같은 높이가 된다. Next에서 `src`는 선택 사항이고(`구조:307`), `create-next-app`의 추천 기본값도 `src`를 쓰지 않는다(`설치:89`). `@/` 별칭은 `tsconfig.json`의 `"@/*": ["./*"]`로 바꾸므로 import 문은 그대로다. `src` 위치를 기준으로 쓴 문자열 경로 2곳(로컬 글꼴, OG 이미지 글꼴)만 고친다([이전 범위](04-migration.md#이전-범위) #144).

```text
frontend/
├── proxy.ts                         # 토큰 갱신. app과 같은 높이 (N14)
├── app/                             # 라우트와 라우트 전용 코드
│   ├── layout.tsx                   # html·body·글꼴·본문 건너뛰기·헤더
│   ├── not-found.tsx                # 앱 전체 404. SiteFrame으로 본문과 푸터를 직접 그린다
│   ├── globals.css, icon.svg, opengraph-image.tsx, _og/
│   ├── auth/callback/[provider]/route.ts  # 소셜 로그인 콜백. 라우트 핸들러라 경로 그룹 밖 그대로
│   ├── _components/                 # 앱 전체가 쓰는 라우트 의존 부품
│   │   ├── AppHeader.tsx, MainNav.tsx, NavList.tsx, MobileMenu.tsx, UserMenu.tsx, MyPageLink.tsx
│   │   ├── NotFoundContent.tsx      # 루트·일반 화면 404의 공통 내용
│   │   ├── Main.tsx                 # <main id="main" tabIndex={-1}>. 서버 전용 코드 없음
│   │   ├── SiteFooter.tsx           # 푸터 마크업(소개·약관 링크). 서버 전용 코드 없음
│   │   ├── AppFooter.tsx            # SiteFooter + 개발용 시연 전환기(세션·시연 상황을 읽는다). 서버 전용
│   │   ├── SiteFrame.tsx            # Main + AppFooter. (site) 레이아웃과 404 두 곳이 쓴다
│   │   ├── ComingSoon.tsx
│   │   └── nav.ts                   # 헤더 탭 정의 (lib/nav.ts에서)
│   │
│   ├── (site)/                      # 푸터 있는 화면
│   │   ├── layout.tsx               # <SiteFrame>{children}</SiteFrame>
│   │   ├── not-found.tsx            # 그룹 안의 404 내용만 그림. 본문·푸터는 레이아웃이 담당
│   │   ├── (home)/                  # /
│   │   │   ├── page.tsx
│   │   │   └── _components/         # HeroBanner, ProofMarks, RecruitmentGrid, …
│   │   ├── (auth)/                  # /login, /signup, /signup/social
│   │   │   ├── _components/         # AuthCard, SocialButtons
│   │   │   ├── login/  (page.tsx, _components/LoginForm.tsx)
│   │   │   └── signup/ (page.tsx, _components/SignupForm.tsx·Agreements.tsx)
│   │   │       └── social/ (page.tsx, _components/SocialSignupForm.tsx)
│   │   ├── recruitments/            # 공개 모집
│   │   ├── testers/recruitments/    # 참여 테스트
│   │   ├── developer/               # 내 프로젝트·모집 관리
│   │   │   ├── _components/         # ProjectDetail, ProjectForm, FormSection (projects·recruitments가 함께 씀)
│   │   │   ├── projects/
│   │   │   └── recruitments/
│   │   ├── my/
│   │   │   ├── (account)/           # 계정 메뉴가 있는 마이페이지
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── _components/     # AccountNav, card-styles, CreditSummaryCard, LedgerRow, DayGroups, …
│   │   │   │   ├── profile/edit/, credits/, credits/withdrawals/, subscription/, subscription/checkout/
│   │   │   └── chats/               # 채팅함 (푸터 있음)
│   │   ├── admin/
│   │   │   ├── _components/         # AdminShell, LinkTabs, AccessDenied, 운영자 홈 패널
│   │   │   ├── _lib/                # 운영자 홈 요약, 홈의 요청 링크
│   │   │   ├── users/, reports/, withdrawals/
│   │   └── events/, notices/, terms/, privacy/
│   │
│   └── (conversation)/              # 푸터 없는 화면. 레이아웃을 두지 않는다
│       └── my/chats/[roomKey]/      # 채팅방
│           ├── page.tsx             # <Main className="flex flex-col">을 직접 그린다
│           ├── not-found.tsx        # SiteFrame으로 본문과 푸터를 그린다 (지금처럼 푸터가 보인다)
│           └── _components/         # ChatRoomView, ChatComposer, ChatMessageList, bubble.ts, …
│
├── features/                        # 도메인. 여러 구역이 쓰는 데이터·규칙·부품
│   ├── session/                     # 세션 읽기(session.ts), 권한 확인(guard.ts). 맨 아래 층
│   ├── auth/                        # 로그인·가입·로그아웃 액션, 소셜 로그인(oauth.ts), types. 화면만 쓴다
│   ├── member/                      # 회원 조회·변경, 마이페이지 요약, 회원 관리(admin.ts), 형식 검사(validation.ts)
│   ├── subscription/                # 구독·상품·결제 (features/my에서)
│   ├── credit/                      # 잔액·원장·출금 신청·출금 처리, 출금 목록 주소(paths.ts)
│   ├── project/                     # 프로젝트 조회·등록·수정, 주소(paths.ts), 이미지 검사(media.ts)
│   ├── recruitment/                 # 모집 조회·작성·취소·지원자 선정·분석, 모집 부품
│   ├── participation/               # 참여·피드백 제출, 주소(paths.ts)
│   ├── chat/                        # 대화방·메시지, 채팅함·채팅방이 함께 쓰는 부품
│   └── report/                      # 신고 조회·처리, 신고 목록 주소(paths.ts) (features/admin에서)
│
├── components/ui/                   # 도메인·URL을 모르는 부품 (TextField 합류, ProofMarks 나감)
├── lib/                             # 도메인을 모르는 기반: cn, format, form, next-path, backend, backend-http, auth-tokens
└── demo/                            # 시연 코드 전부. 실제 API를 붙이면 지운다
    ├── mode.ts, DemoSwitcher.tsx
    └── <도메인>.ts                  # 목업 데이터와 쿠키에 남기는 시연 기록
```

이전 범위와 검증 기준은 [4. 이전 범위](04-migration.md)에 있다. 위 트리는 폴더 구성과 대표 파일만 보인다.

없어지는 폴더: `features/home`, `features/my`, `features/admin`, `components/layout`, `components/` 바로 아래 파일. `HideFooter.tsx`는 지운다.

## 3.2 배치 규칙

파일을 만들거나 옮길 때 위에서부터 차례로 본다. 처음 맞는 규칙을 따른다.

| 규칙 | 이런 파일이면 | 여기에 둔다 | 근거 |
| --- | --- | --- | --- |
| P1 | 시연(목업 데이터, 쿠키에 남기는 시연 기록, 시연 도구) | `demo/` | 실제 API를 붙일 때 지울 범위를 폴더 하나로 만든다(F8) |
| P2 | 도메인 데이터 접근·서버 액션·타입·검사 규칙 | `features/<도메인>/` | 쓰는 화면이 하나여도 도메인에 둔다. 데이터 접근 계층(N9) |
| P3 | 도메인·URL을 모르는 기반 함수 | `lib/` | README의 기존 기준 |
| P4 | 화면 부품을 라우트 **하나**만 쓴다 | 그 라우트 폴더의 `_components/` | N1, N2 |
| P5 | 화면 부품을 **한 구역 안의** 여러 라우트가 쓴다 | 그 라우트들의 공통 조상 폴더의 `_components/` | 같다 |
| P6 | 화면 부품을 **여러 구역**이 쓴다 | 도메인을 알면 `features/<도메인>/components/`, 모르면 `components/ui/`. 라우트를 알면(홈 링크 등) `app/_components/` | 전략 C(`구조:349`) |
| P7 | 라우트 전용인데 화면 부품이 아닌 코드(여러 도메인을 묶은 요약, 그 화면만 쓰는 주소) | 그 라우트 폴더의 `_lib/` | 도메인 폴더가 화면 조립을 맡지 않게 한다(F2) |

**구역**은 기본적으로 `app/(site)`의 첫 구간(`(home)`, `(auth)`, `recruitments`, `testers`, `developer`, `admin` …)을 기준으로 나눈다. `my/(account)`와 `my/chats`는 같은 `my` 아래여도 서로 다른 구역이며, `app/(conversation)`도 별도 구역이다. 부품 배치는 먼저 사용처의 구역이 같은지 확인한다. 구역이 다르면 공통 조상이 `app/(site)/my`처럼 깊어도 P6의 공유 부품으로 인정하고, 같은 구역 안에서만 P4·P5의 공통 조상을 계산한다.

**`components/ui`의 기준은 사용 횟수가 아니다.** "도메인·URL·세션을 모르는가"다. `Carousel`은 홈만 쓰지만 범용이라 여기에 둔다. `ProofMarks`는 DESIGN.md가 히어로 전용으로 정했으니 홈으로 간다.

P4~P6은 [`scripts/structure/usage.mjs`](../../frontend/scripts/structure/usage.mjs)가 기계적으로 계산한다(TSV의 마지막 열). URL을 표시할 때만 경로 그룹을 빼고, 배치를 계산할 때는 실제 라우트 파일과 그룹 경로를 유지한다. URL이 `/`로 같아도 루트 layout과 홈 그룹 layout은 서로 다른 사용처다(`구조:288~303`). 사람이 판단하는 것은 P6에서 도메인을 아는지 모르는지뿐이다.

## 3.3 레이아웃이 맡는 것

| 파일 | 그리는 것 | 바뀌는 점 |
| --- | --- | --- |
| `app/layout.tsx` | `<html>`, `<body>`, 글꼴, "본문으로 건너뛰기", `AppHeader` | `<main>`과 `AppFooter`를 내린다 |
| `app/_components/Main.tsx` | `<main id="main" tabIndex={-1}>` | 새로 만든다. 지금 루트 레이아웃의 `<main>`(id, `tabIndex`, `flex-1`, 포커스 표시 끔)을 그대로 옮긴다. 서버 전용 코드를 import하지 않으므로 클라이언트 컴포넌트에서도 쓸 수 있다 |
| `app/_components/SiteFooter.tsx` | 푸터 마크업(`[data-site-footer]`, 소개, 약관 링크)과 `children` 자리 | `AppFooter`에서 나눠 만든다. 서버 전용 코드를 import하지 않는다 |
| `app/_components/AppFooter.tsx` | `<SiteFooter>`에 개발 환경 시연 전환기를 끼운다 | 전환기가 `getSession`·`getDemoDataMode`(서버 전용)를 부르므로 서버 컴포넌트로 남는다 |
| `app/_components/SiteFrame.tsx` | `<Main>{children}</Main>` 다음에 `AppFooter` | 새로 만든다 |
| `app/(site)/layout.tsx` | `<SiteFrame>{children}</SiteFrame>` | 새로 만든다 |
| `app/(conversation)/` | (레이아웃 없음) | 그룹 폴더만 둔다. 푸터를 그리는 레이아웃이 없으니 푸터가 없다. `HideFooter`가 하던 푸터 숨기기가 필요 없어진다 |
| `app/(conversation)/my/chats/[roomKey]/page.tsx` | `<Main className="flex flex-col">` | `HideFooter`가 하던 본문 세로 채우기를 페이지가 직접 한다 |
| `app/(conversation)/my/chats/[roomKey]/not-found.tsx` | `<SiteFrame>` + 대화방 404 내용 | 지금은 푸터가 보인다(S157이 확인). 그대로 두려고 직접 그린다 |
| `app/not-found.tsx` | `<SiteFrame>` + 404 내용 | 루트 레이아웃이 `<main>`과 푸터를 더는 그리지 않으므로 직접 그린다 |
| `app/(site)/my/(account)/layout.tsx` | 계정 메뉴 | 위치만 바뀐다 |

- 푸터는 `<main>` 밖에 둔다. 지금도 그렇다. 푸터를 그룹 레이아웃의 `children` 안에 넣으면 `<footer>`가 `<main>` 안으로 들어가 `contentinfo` 랜드마크가 사라진다. 그래서 `<main>`과 푸터를 한 부품(`SiteFrame`)이 함께 그린다.
- 404 화면 두 개는 그룹 레이아웃에 기대지 않고 `SiteFrame`을 직접 쓴다. Next는 구간마다 `layout` → … → `not-found` → `page` 순서로 감싸고, 아래 구간은 위 구간 안에 들어간다(`구조:194`~`:201`, `구조:211`). 그래서 두 404는 이렇게 그려진다.
  - `app/not-found.tsx`는 없는 주소를 처리하며 `SiteFrame`을 직접 쓴다. `(site)` 안에서 페이지가 `notFound()`를 부를 때는 해당 그룹의 레이아웃이 남는다. 그래서 `app/(site)/not-found.tsx`를 별도로 두고 공통 `NotFoundContent`만 그린다. 레이아웃이 이미 그린 `<main>`과 푸터를 다시 넣지 않는다(`not-found.md:13`, `:45`, `구조:194~201`; #146-S4에서 본문·푸터 중복을 재현해 확인).
  - 채팅방 404는 `(conversation)` 안에서 그려진다. 그래서 `(conversation)`에 `<main>`을 그리는 레이아웃이 있으면, 404 화면이 푸터를 `<main>` 밖에 둘 수 없다. `(conversation)`에 레이아웃을 두지 않는 이유다.
- 앞으로 `error.tsx`를 만들 때도 본문과 푸터를 직접 그린다. 루트의 `error.tsx`는 루트 레이아웃 바로 안에서 그려지기 때문이다. 다만 `error.tsx`는 클라이언트 컴포넌트라서(N12) `SiteFrame`을 쓸 수 없다. `SiteFrame`이 담은 `AppFooter`는 세션·시연 상황을 읽는 서버 전용 코드를 import하므로, 그대로 쓰면 빌드가 실패한다. 그래서 `error.tsx`는 `<Main>` 다음에 `<SiteFooter />`를 그린다. 오류 화면에는 개발용 시연 전환기가 나오지 않는다(F9).
- `Main.tsx`·`SiteFooter.tsx`에는 서버 전용 코드(`server-only`를 표시한 파일, `next/headers`)를 넣지 않는다. 넣으면 `error.tsx`가 import하는 순간 빌드가 실패하므로, `npm run build`가 이 조건을 확인한다.
- 루트 레이아웃은 하나만 둔다. 그룹마다 루트 레이아웃을 두면 그룹 사이를 이동할 때 페이지 전체를 다시 불러온다(`그룹:30`).
- URL은 하나도 바뀌지 않는다. `(site)/my/chats/page.tsx`는 `/my/chats`, `(conversation)/my/chats/[roomKey]/page.tsx`는 `/my/chats/:roomKey`로 풀려서 겹치지 않는다(N5).
- 레이아웃에서 인증 검사를 하지 않는 지금 방식은 그대로 둔다(N7).
- 운영자 탭(`AdminShell`)은 지금처럼 페이지가 `path`를 넘긴다. `admin/layout.tsx`로 올리려면 탭을 `usePathname`을 쓰는 클라이언트 부품으로 바꿔야 해서(N6) 이번 범위에서 뺀다.

## 3.4 도메인 폴더 안

지금 모양을 그대로 쓴다. 이번 정리는 "어디에 두는가"만 바꾸고 파일 안 모양은 바꾸지 않는다.

```text
features/<도메인>/
├── api.ts          # 데이터 접근. import "server-only". 권한 확인 포함 (N9, N10)
├── actions.ts      # "use server". 얇게: 입력 검사 → api 호출 → 이동 (보안:399)
├── paths.ts        # 이 도메인 화면의 주소 함수 (선택)
├── types.ts        # 타입과 순수 규칙(라벨, 상태 계산)
├── query.ts 등     # 화면·서버가 함께 쓰는 순수 함수 (선택)
└── components/     # 여러 구역이 쓰는 이 도메인의 부품만 (P6)
```

- 데이터 접근은 도메인마다 `api.ts` 한 파일이 맡는다(2026-11-06 정함). 근거는 Next 문서다.
  - 이 프로젝트는 백엔드(Spring)가 따로 있어서, 서버 컴포넌트와 서버 액션이 그 HTTP API를 부르는 방식이다(`보안:28`~`:54`).
  - Next는 데이터 접근을 서버 전용 모듈 한 곳에 모으고(데이터 접근 계층, `보안:58`~`:66`), 방식은 하나로 정해 섞지 말라고 한다(`보안:27`). `api.ts`가 그 모듈이다. Spring API를 부르고, 권한을 확인하고, 화면에 줄 값만 돌려준다.
  - 그래서 `service.ts`를 두지 않는다. 기존 `features/project/service.ts`의 조회·저장·검사를 도메인별로 나눈다. 데이터를 읽고 묶는 함수는 각 도메인의 `api.ts`로, 상태 계산·입력 검사 같은 순수 함수는 `types.ts`(또는 같은 도메인의 순수 함수 파일)로 보낸다. `users.ts`·`reviews.ts` 같은 다른 이름도 새로 만들지 않는다(F7).
  - `api.ts`가 커지면 그 도메인 안에서 `api/` 폴더로 나눈다.
  - `app/api/` 폴더는 만들지 않는다. Next에서 `app/api/…`는 Route Handler(외부가 부르는 HTTP 주소) 자리이고, 서버 컴포넌트는 자기 Route Handler를 거치지 않는다(N13).
- 권한 확인 함수(`requireMember`, `requireRole`, `requireAdmin`, `assertAdmin`)는 `features/session/guard.ts`에 모은다(F7). 데이터 함수는 이 함수를 불러 확인한다. 화면이나 레이아웃의 확인만 믿지 않는다(N7, N8).
- 다른 도메인은 `api.ts`, `types.ts`, `components/`, 순수 함수 파일만 쓴다. `actions.ts`는 화면(`app`)에서만 부른다.
- 액션의 저장도 `api.ts`를 거친다. 액션이 `demo/`의 저장 함수를 직접 부르지 않는다(B4). 지금 시연 저장소를 직접 부르는 액션은 다섯 곳이다. 옮길 때 각 도메인 `api.ts`에 저장 함수를 만들고, 시연 모드면 그 함수가 `demo/`에 저장한다. 백엔드를 붙일 때는 이 함수 안만 바꾸면 된다.

  | 지금 액션 | 직접 부르는 시연 저장 | 옮긴 뒤 부를 곳 |
  | --- | --- | --- |
  | `credit/actions.ts` `requestWithdrawal` | `addDemoWithdrawal` | `credit/api.ts` |
  | `admin/actions.ts` `processWithdrawal` | `saveWithdrawalReview` | `credit/api.ts` |
  | `admin/actions.ts` `processReport` | `saveReview` | `report/api.ts` |
  | `my/subscription-actions.ts` `payForSubscription` | `getDemoSubscriptionPayments`·`addDemoSubscriptionPayment`·`MAX_DEMO_PAYMENTS` | `subscription/api.ts` |
  | `participation/actions.ts` `submitFeedback` | `saveDemoFeedback` | `participation/api.ts` |

- 액션이나 `api.ts`가 리다이렉트·링크에 쓰는 주소 함수는 그 도메인의 `paths.ts`에 둔다. `app/**/_lib`에 두면 `features → app` 의존이 생긴다(B3). `app/**/_lib`에는 `app`만 쓰는 주소만 둔다. 예: 신고 목록·상세 주소(`reportsHref`·`reportDetailHref`)는 `report/paths.ts`, 출금 목록 주소(`withdrawalsHref`)는 `credit/paths.ts`, 운영자 홈의 요청 링크(`adminRequestHref`)는 `app/(site)/admin/_lib/paths.ts`.

도메인별로 맡는 것:

| 도메인 | 맡는 것 | 들어오는 코드 |
| --- | --- | --- |
| `session` | 현재 세션(역할·닉네임·크레딧), 권한 확인 | `lib/session.ts`, `lib/auth.ts`, `admin/api.ts`의 `requireAdmin`·`assertAdmin`, `project/service.ts`의 `requireRole` |
| `auth` | 로그인·가입·로그아웃 액션, 폼 타입 | 그대로 (`features/auth/actions.ts`, `types.ts`) |
| `member` | 프로필, 닉네임 중복, 비밀번호, 마이페이지 요약, 회원 관리 조회, 이름·이메일 가리기 | `my/actions.ts`, `my/api.ts`의 `getProfile`·`getMyPageSummary`, `my/types.ts`의 요약 타입, `admin/users.ts`(조회는 `api.ts`, 타입·가리기는 `admin.ts`) |
| `subscription` | 구독 상태, 상품, 결제 | `my/subscription-actions.ts`, `my/api.ts`의 `getSubscriptionOverview`, `my/types.ts`의 구독 타입 |
| `credit` | 잔액, 원장, 출금 신청, 운영자 출금 처리 | `admin`의 출금 조회·처리·타입·목록 주소(`paths.ts`) |
| `project` | 프로젝트 자체(이름·설명·이미지)의 조회·등록·수정, 개발자 주소 | `lib/project-paths.ts` |
| `recruitment` | 공개 모집, 모집 작성·취소·선정·분석, 모집 건을 붙인 개발자 프로젝트 목록, 모집 상태 배지·이미지 | `project/service.ts`·`api.ts`·`actions.ts`·`types.ts`의 모집 부분 |
| `participation` | 참여 목록·상세, 피드백 제출, 참여 주소 | `lib/participation-paths.ts` |
| `chat` | 대화방·메시지 | 그대로 |
| `report` | 신고 조회·처리 | `admin`의 신고 조회·처리·타입·목록 주소(`paths.ts`) |

세션·권한 확인과 로그인 액션을 다른 폴더로 나눈 이유는 의존 방향을 한 줄로 만들기 위해서다. 둘을 `auth` 한 폴더에 두면, 가입 액션은 닉네임 중복 확인 때문에 `member`를 쓰고, `member`는 권한 확인 때문에 `auth`를 써서 두 폴더가 서로를 가져다 쓰게 된다.

```text
app ──▶ auth (로그인·가입·로그아웃 액션)
          │
          ▼
        member, credit, project, … (도메인)
          │
          ▼
        session (세션 읽기·권한 확인)   ← 어떤 도메인도 import하지 않는다
```

- `session`은 다른 도메인을 import하지 않는다(B6). 지금 `lib/session.ts`도 `lib/backend.ts`와 시연 결제 기록만 쓴다. 시연 결제 기록은 `demo/subscription.ts`로 가고, `session/session.ts`는 이것을 직접 읽는다(B4가 허용한다). `subscription/api.ts`를 거치게 하면 `session → subscription`이 되어 B6를 어긴다.
- `auth`를 import하는 것은 `app`뿐이다(B7). `auth`는 `member` 같은 도메인을 import해도 된다. 다른 도메인이 로그인 상태가 필요하면 `auth`가 아니라 `session`에서 가져온다.
- 나머지 도메인끼리도 한쪽 방향만 쓴다. 다만 이것은 ESLint로 검사하지 않는다. 도메인 쌍마다 방향을 정해 규칙으로 적어야 해서, 지금 단계에서는 리뷰로 확인한다. 지금 서로를 가져다 쓰는 `my ↔ credit`은 `my`가 없어지면서 사라진다(F2).
- 모집을 `project`에서 `recruitment`로 옮기면 새 양방향이 생길 수 있다. 모집 쪽은 프로젝트 주소·이미지 검사·타입을 쓰고, `Project` 타입은 `recruitments` 필드로 모집을 안다. 방향은 `recruitment → project`로 정한다. 모집 건은 프로젝트에 속하기 때문이다. 그래서 다음 셋을 옮긴다.
  - `Project`의 `recruitments` 필드는 `recruitment/types.ts`에 모집 건을 붙인 프로젝트 타입으로 따로 둔다.
  - 모집 건을 붙여 읽는 조회(`findProjects`, `getMyProjects`·`getMyDashboard`·`getMyProject`)는 `recruitment`로 간다.
  - `saveProject`의 소유 확인은 모집 건까지 읽는 `getMyProject` 대신, `project/api.ts`에 새로 두는 프로젝트만의 소유 확인을 쓴다.
- 도메인 사이 의존 방향은 다음과 같다. 실제 import를 기준으로 순환이 없는지 확인한다. 파일을 나눌 때는 실제로 쓰는 함수와 타입의 도메인을 기준으로 정한다.

  ```text
  auth → member, session
  member → credit, report, subscription, session
  subscription → credit, session
  participation → recruitment, session
  recruitment → project, session
  chat, credit, project, report → session
  ```

## 3.5 `demo/`

```text
demo/
├── mode.ts             # 시연 데이터 상황 (lib/demo.ts)
├── DemoSwitcher.tsx    # 개발 환경 전용 전환기 (components/layout에서)
└── <도메인>.ts         # 목업 데이터 + 쿠키에 남기는 시연 기록
```

- `features` 안에서 `demo/`를 import할 수 있는 파일은 `features/*/api.ts`(데이터 접근)와 `features/session/session.ts`뿐이다. 확장자와 중첩 깊이에 관계없이 나머지는 차단한다. `features`의 화면 부품은 `demo/`를 import하지 않는다(B4).
- `app` 쪽에서는 `AppFooter`만 전환기를 보여 주려고 `demo/`를 import한다. 이것은 ESLint로 검사하지 않는다. `app` 전체를 막으면 `AppFooter`도 막히고, 파일 하나를 예외로 두면 규칙이 복잡해지기 때문이다.
  - 이 조건을 지키려면 옮길 때 두 곳을 함께 고친다. 운영자 출금 처리 폼(`WithdrawalForm`)은 오류 문구에 시연 쿠키 이름을 넣으려고 `admin/reviews.ts`를 import한다. 이 이름은 `credit/api.ts`가 내보내고 폼은 거기서 읽는다. 운영자 홈 요약(`app/(site)/admin/_lib/summary.ts`)은 `report/api.ts`·`credit/api.ts`의 조회 함수만 부른다.
  - 마이페이지 요약(`getMyPageSummary`)은 목업을 읽으므로 `app/**/_lib`가 아니라 `member/api.ts`에 둔다.
- 채팅의 쿠키 읽기·쓰기·직렬화·목업 상태 반영은 `demo/chat.ts`, 세션 표시용 샘플은 `demo/session.ts`가 맡는다. 채팅 API에는 세션·대화방 권한 확인과 데이터 접근 흐름만 남긴다.
- `demo/`가 `features`의 무엇을 import하는지(목업에 타입을 붙이려고 `types.ts`를 쓴다)는 제한하지 않는다.
- 시연 기록 하나를 여러 데이터 접근 파일이 읽어도 된다. `demo/`는 도메인이 아니라서, 이렇게 읽어도 도메인 사이 의존이 생기지 않는다. 지금 그런 것은 시연 결제 기록(`demo/subscription.ts`) 하나다.

  | 읽는 파일 | 하는 일 | 다른 도메인 `api.ts`를 거치지 않는 이유 |
  | --- | --- | --- |
  | `subscription/api.ts` | 결제 기록 조회·개수 확인·저장, 구독 만료일 | 주인 |
  | `credit/api.ts` | 크레딧 내역에 구독 결제(쓴 크레딧)를 넣는다 | `subscription/api.ts`를 거치면 `credit → subscription`이 생겨, 이미 있는 `subscription → credit`과 순환한다 |
  | `session/session.ts` | 헤더의 보유 크레딧에서 결제한 만큼 뺀다 | `subscription`을 거치면 B6 위반 |

  실제 백엔드에서는 잔액과 내역을 서버가 계산해 주므로, 연결이 끝나면 `credit`·`session`의 이 읽기는 `api.ts`의 목업 분기와 함께 지운다.
- 시연 쿠키를 읽고 쓰는 코드는 `server-only`로 표시한다(N10). 지금 목업 7개에 없는 표시도 이때 붙인다.
- 백엔드 연결이 끝난 도메인은 `demo/<도메인>.ts`와 `api.ts`의 목업 분기를 함께 지운다.
- 별도 목업 서버(앱 코드가 목업을 아예 import하지 않는 방식)는 지금 도입하지 않는다. 목업 서버를 따로 띄우고 e2e 설정을 바꿔야 해서 구조 정리와 섞으면 범위가 커진다.

## 3.6 import 경계

### ESLint로 검사하는 것 (B1~B7)

[`scripts/structure/eslint-boundaries.mjs`](../../frontend/scripts/structure/eslint-boundaries.mjs)를 `frontend/eslint.config.mjs`에 넣는다. `eslint-config-next`가 `eslint-plugin-import`와 TypeScript 경로 해석기를 이미 등록하므로 새로 설치할 패키지는 없다.

| 번호 | 규칙 |
| --- | --- |
| B1 | `components/ui`는 `app`, `features`, `demo`, `lib/backend.ts`를 import하지 않는다 |
| B2 | `lib`는 `app`, `features`, `components`, `demo`를 import하지 않는다 |
| B3 | `features`는 `app`을 import하지 않는다 |
| B4 | `features` 전체에서 `demo/`를 import할 수 있는 파일은 `features/*/api.ts`·`features/session/session.ts`뿐이다. `features/*/components`는 `demo/`를 import하지 않는다. (`demo/` 쪽이 무엇을 import하는지는 검사하지 않는다) |
| B5 | 다른 도메인의 `actions.ts`를 import하지 않는다 |
| B6 | `features/session`은 다른 도메인을 import하지 않는다 |
| B7 | 다른 도메인은 `features/auth`를 import하지 않는다. `auth`를 import하는 것은 `app`뿐이다 |

문자열과 치환 없는 백틱의 동적 `import()`·`require()`에 같은 경계 규칙을 적용한다. 기존 `eslint-plugin-import`가 건너뛰는 백틱 구문은 보조 규칙이 같은 경로 해석과 제한 설정으로 검사한다. 치환식처럼 경로를 계산할 수 없는 경우는 배치 검사의 R0이 차단한다.

이 규칙은 이전 전 develop(`5db2041`)과 이전 후 코드에서 모두 위반 0건이다. 일부러 어긴 import를 넣었을 때 lint가 차단하는 것도 확인한다. 실행 방법은 [README](README.md#직접-확인하는-방법)에 있다.

### 스크립트로 검사하는 것 (R0~R3)

배치 규칙은 ESLint로 표현하기 어렵다. [`scripts/structure/usage.mjs`](../../frontend/scripts/structure/usage.mjs) `--check`가 검사한다. 위반이 있으면 종료 코드 1로 끝나므로 CI에 그대로 넣을 수 있다. import는 TypeScript 구문 트리에서 모은다. 정적 import뿐 아니라 동적 import(`await import("…")`, `next/dynamic`)와 `typeof import("…")`도 센다.

| 번호 | 규칙 | 결과 |
| --- | --- | ---: |
| R0 | 동적 import의 경로는 문자열로 쓴다. 경로를 알 수 없으면 사용처를 계산할 수 없으므로 위반으로 본다 | 0 |
| R1 | `features/*/components` 파일은 여러 구역이 쓴다 | 0 |
| R2 | `_components`·`_lib` 파일은 그 폴더의 부모 경로 안에서만 import한다 | 0 |
| R3 | `components/ui`는 도메인·세션·시연 코드를 import하지 않는다 | 0 |

R0~R3은 모두 0건을 유지한다. 배치 검사는 CI의 프론트 작업에도 연결한다(#151).

## 3.7 서버와 클라이언트

지금 코드가 이미 지키는 규칙이다. 옮기는 동안 깨지 않도록 적어 둔다.

- 데이터는 서버 컴포넌트에서 `features/*/api.ts`로 가져온다. 자기 Route Handler를 거치지 않는다(N13).
- 페이지의 인증 검사는 그 안의 서버 액션까지 보호하지 않는다. 액션은 데이터 함수를 거쳐 다시 확인한다(N8).
- `"use client"`는 상호작용이 필요한 부품에만 붙인다. 클라이언트 부품이 서버 전용 모듈에서 가져올 것은 `import type`뿐이다(N11).
- 세션이나 쿠키를 읽는 부품은 `<Suspense>` 안에 둔다(README 기존 규칙, Cache Components).
- `error.tsx`를 추가할 때는 클라이언트 컴포넌트로 만들고, 화면 틀은 `Main`·`SiteFooter`로 그린다([3.3](#33-레이아웃이-맡는-것), N12). 신규 오류 화면은 이번 이전 범위 밖이다.

## 3.8 테스트

- URL이 바뀌지 않으므로 `e2e/pages.spec.ts`의 `PAGES`는 그대로다.
- 시연 기록 쿠키를 만드는 코드는 `e2e/helpers.ts`로 모은다. 테스트가 쿠키 직렬화 형식을 직접 만들지 않는다(F10).
- 레이아웃은 일반 화면뿐 아니라 채팅방·404의 본문 하나, 본문 밖의 푸터, 본문 건너뛰기까지 확인한다. 일반 화면은 `a11y.spec.ts` S35, 푸터 진입·이탈은 `chat-room.spec.ts` S157·S321이 확인한다. 나머지는 아래 시나리오를 사용한다.

### #146 레이아웃 이전 시나리오

요구사항 #146-R1: 경로 그룹으로 옮겨도 각 화면의 본문·푸터·본문 건너뛰기 동작은 같다.

| 번호 | 확인할 화면과 동작 | 방법 |
| --- | --- | --- |
| #146-S1 | 테스터의 `/my/chats/booklog-yunseul`에 `main#main`이 하나 있고, 푸터는 숨으며, 첫 Tab → Enter로 본문에 포커스가 간다 | [테스트] |
| #146-S2 | 테스터의 `/my/chats/nope`에 `main#main`이 하나 있고, 푸터가 본문 밖에 보이며, 첫 Tab → Enter로 본문에 포커스가 간다 | [테스트] |
| #146-S3 | `/nope`에 `main#main`이 하나 있고, 푸터가 본문 밖에 보이며, 첫 Tab → Enter로 본문에 포커스가 간다 | [테스트] |
| #146-S4 | 운영자의 `/admin/reports/nope`에 `main#main`이 하나 있고, 푸터가 본문 밖에 보이며, 첫 Tab → Enter로 본문에 포커스가 간다 | [테스트] |
| #146-S5 | 일반 화면의 본문 건너뛰기와 채팅방 진입·이탈 시 푸터 동작이 유지된다 | [테스트: a11y.spec.ts S35, chat-room.spec.ts S157·S321] |

`layout-structure.spec.ts`에서 #146-S1~#146-S4를 확인한다. 같은 테스트를 경로 그룹 이전 전에 먼저 통과시킨다.

## 3.9 바꾸지 않는 것

- 파일 이름 표기. 부품은 PascalCase, 그 밖은 소문자다. kebab-case로 바꾸지 않는다.
- 도메인 폴더 안 파일 모양(`api.ts`·`actions.ts`·`types.ts`·`components/`). `model.ts`·`policy.ts`·`server/queries.ts`로 나누지 않는다. 파일이 커져 변경 이유가 갈릴 때 그 도메인만 나눈다.
- 디자인 토큰, Tailwind 규칙, `"use client"` 기준.
- URL.
