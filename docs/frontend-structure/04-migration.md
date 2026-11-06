# 4. 옮기는 순서와 파일별 이동표

[3. 목표 구조](03-target-structure.md)로 옮기는 순서다. 단계마다 URL과 화면 동작은 바뀌지 않는다. 그래서 단계마다 기존 e2e가 그대로 통과해야 한다.

## 4.1 단계

| 단계 | 이슈 | 하는 일 | 대상 | 없어지는 문제 |
| --- | --- | --- | --- | --- |
| 0 | #144 | `src` 없애기 | `frontend/src/*`를 `frontend/`로 옮김, `tsconfig.json`의 `@/*`를 `./*`로, 문자열 경로 2곳(`app/layout.tsx`의 로컬 글꼴 `../../node_modules/…` → `../node_modules/…`, `app/opengraph-image.tsx`의 `src/app/_og/…` → `app/_og/…`), `frontend/README.md`·`AGENTS.md`·`DESIGN.md`·`PRODUCT.md`의 경로 | - |
| 1 | #146 | 경로 그룹과 레이아웃 | `app`의 TS 39개 가운데 35개 이동, `SiteFrame`과 `(site)` 레이아웃 생성(`(conversation)`은 레이아웃 없음), `HideFooter` 삭제, 404 두 곳이 `SiteFrame`으로 본문·푸터를 그림([3.3](03-target-structure.md#33-레이아웃이-맡는-것)) | F4 |
| 2 | #147 | 사이트 틀을 `app`으로 | `components/layout` 9개, `components/*.tsx` 2개, `lib/nav.ts`와 그것을 쓰는 `features/my/components/AccountNav.tsx` | F3 |
| 3 | #148 | 라우트 전용 화면 부품을 `_components`로 | `usage.mjs --check` R1 88개. 구역별로 나눠 한다 | F1 |
| 4 | #149 | 시연 코드를 `demo/`로 | 16개 파일. 시연 쿠키를 만드는 e2e 코드를 `helpers.ts`로. 함께 하는 일: 액션 5곳의 시연 저장 호출을 같은 폴더의 `api.ts` 저장 함수로 돌리기, `lib/session.ts`·`lib/auth.ts`를 `features/session/`으로, `admin/users.ts`를 `member/admin.ts`·`member/api.ts`·`demo/member.ts`로 나누기, 출금 처리 폼의 시연 쿠키 이름을 `admin/api.ts`에서 읽기 | F7, F8, F10 |
| 5 | #150 | 도메인 정리 | `my`·`admin` 해체, 모집을 `project`에서 `recruitment`로, `lib`의 나머지 도메인 파일, 남은 권한 확인(`requireAdmin`·`assertAdmin`·`requireRole`)을 `session/guard.ts`로, `TextField`를 `ui`로, `service.ts` 없애기. 함께 하는 일: 4단계에서 `admin/api.ts`에 모은 저장 함수를 `report/api.ts`·`credit/api.ts`로 나누기, 운영자 목록 주소를 `report/paths.ts`·`credit/paths.ts`로, 모집 건을 붙인 프로젝트 조회를 `recruitment`로([3.4](03-target-structure.md#34-도메인-폴더-안)) | F2, F5, F6, F7, F11 |
| 6 | #145, #151 | 경계 검사 켜기와 문서 | ESLint B1~B7(0단계 바로 뒤에 먼저 켠다), `--check`의 CI 포함 여부, `frontend/README.md` 개정 | 재발 방지 |
| 7 | - | (선택) 오류 화면 | `error.tsx` 위치와 문구. 클라이언트 컴포넌트라 화면 틀은 `SiteFrame`이 아니라 `Main`·`SiteFooter`로 그린다 | F9 |

순서를 이렇게 둔 이유:

- 0단계를 맨 앞에 두는 이유는, 뒤 단계의 이동 위치가 모두 앱 코드 최상위 기준이기 때문이다. 나중에 하면 옮긴 파일을 한 번 더 옮긴다. 0단계는 폴더만 한 칸 올리고 `@/` 별칭을 맞추므로 import 문과 동작은 바뀌지 않는다. 다만 import가 아닌 문자열 경로는 `tsc`가 확인하지 않는다. 그래서 `grep -rn "node_modules\|src/\|process.cwd" app components features lib`로 앱 코드 밖을 가리키는 경로를 찾아 고치고, 로컬 글꼴과 OG 이미지는 `npm run build`와 화면(`/opengraph-image`)으로 확인한다. 2026-11-06 기준으로 이런 경로는 위의 2곳뿐이다. 계획 문서(`docs/frontend/…`)에 적힌 옛 `src` 경로는 고치지 않는다(#139와 같은 방식).
- 1단계가 먼저인 이유는 3단계의 이동 위치(`(site)/…/_components`)가 1단계의 폴더 위에 서기 때문이다.
- 2·3단계는 파일을 옮기고 import 경로만 고친다. 코드 내용은 바뀌지 않는다.
- 5단계만 파일을 나누고 합친다. 액션이 시연 저장소 대신 부를 `api.ts` 저장 함수와, `saveProject`가 쓸 프로젝트만의 소유 확인도 이 단계에서 새로 만든다. 동작이 바뀔 위험은 여기에 있으므로 도메인 하나씩 따로 한다. 단계를 마칠 때마다 경계 규칙 B1~B7을 돌린다. 나눈 결과가 경계를 넘으면 여기서 걸린다.
- 몇 가지 일은 원래 자리보다 앞 단계에서 한다. 6단계 전에 ESLint B1~B7을 켜 두므로, 단계를 하나 마칠 때마다 경계 규칙이 지켜져야 하기 때문이다. 단계마다 그 단계까지 옮긴 상태를 만들어 B1~B7을 계산했고, 아래처럼 당기면 1~5단계 모두 0건이다.
  - `AccountNav`(2단계): `lib/nav.ts`가 `app`으로 가면, `features`에 남은 `AccountNav`가 `app`을 import하게 된다(B3).
  - 액션 5곳의 저장 호출(4단계): 시연 저장 파일이 `demo/`로 가면 액션이 `demo/`를 직접 import하게 된다(B4). 우선 같은 폴더의 `api.ts`에 저장 함수를 두고, 5단계에서 도메인별 `api.ts`로 나눈다.
  - `lib/session.ts`·`lib/auth.ts`(4단계): `lib/session.ts`가 쓰는 시연 결제 기록이 `demo/`로 가면 `lib → demo`가 된다(B2). `lib/auth.ts`는 `lib/session.ts`를 쓰므로 함께 옮긴다.
  - `admin/users.ts`(4단계): 시연 데이터를 읽는 조회가 `api.ts`가 아닌 파일에 남는다(B4).
  - 출금 처리 폼(4단계): 시연 쿠키 이름 때문에 `app`이 `demo/`를 import하게 된다(3.5). 4단계에서는 `admin/api.ts`가 이 이름을 내보내고, 5단계에서 `credit/api.ts`로 옮긴다.
- 6단계의 ESLint B1~B7은 지금도 위반 0건이라 0단계 바로 뒤에 먼저 켠다. 옮기는 동안 경계가 깨지면 바로 걸린다. `--check`(R1)는 3단계가 끝나야 0건이 되므로 그 뒤에 정한다.

### 다른 작업과의 충돌

파일 이동은 다른 작업과 충돌할 수 있다. 단계마다 develop을 받은 뒤 시작하고, 3단계는 구역(`admin`, `my`, `testers`, `developer`, `(home)`, `(auth)`, 채팅)별로 짧게 끊어 병합한다.

### 단계마다 확인할 것

`frontend` 폴더에서 실행한다.

```bash
npx next typegen                    # 새 worktree에서도 Next 라우트 타입을 먼저 생성
npx tsc --noEmit                    # import 경로
npm run lint                        # 기존 규칙 + (#145 뒤) 경계 규칙 B1~B7
npm run build                       # Cache Components의 Suspense 규칙, 라우트 충돌(N5)
npm run test:e2e                    # URL·화면이 그대로인지
node scripts/structure/usage.mjs . --check     # R0~R3. 위반이 있으면 종료 코드 1. src가 남아 있으면 알아서 src를 본다
```

`PageProps`·`LayoutProps`·`RouteContext`는 Next가 생성하는 전역 타입이다. 새 worktree에서는 `next typegen`으로 먼저 생성해야 `tsc`가 이 타입을 찾는다(Next 문서 `01-app/03-api-reference/03-file-conventions/page.md:139~140`, `layout.md:109~110`, `route.md:120~121`).

3단계를 끝낼 때 `--check`의 R1이 0건이어야 한다. 1단계를 끝낼 때 `chat-room.spec.ts`의 푸터 테스트와 `a11y.spec.ts`의 본문 건너뛰기 테스트가 통과해야 한다.

### 정해야 할 것

- 이 구조로 옮긴다(2026-11-06). 옮기는 동안 `frontend/README.md`의 "폴더 구조와 규칙"을 [3. 목표 구조](03-target-structure.md)로 바꾼다(6단계).

- 데이터 접근은 도메인마다 `api.ts` 하나로 맞추고 `service.ts`는 없앤다(2026-11-06, [3.4](03-target-structure.md#34-도메인-폴더-안)).

아직 정하지 않은 것은 하나다. 나머지는 이 문서대로 하면 된다.

1. `usage.mjs --check`를 CI에 넣을지. 넣는다면 R1이 0건이 되는 3단계 뒤에 넣는다. 그 전에 넣으면 지금 있는 88건 때문에 모든 PR이 실패한다.

## 4.2 `app` 파일 이동표 (1단계)

URL은 그대로다. 경로 그룹 `(site)`·`(conversation)`·`(home)`·`(auth)`는 URL에 들어가지 않는다.

| 지금 | 옮길 곳 | 이유 |
| --- | --- | --- |
| `app/_og/WantedSans-Bold-og.ttf` | 그대로 | OG 이미지 글꼴 |
| `app/admin/page.tsx` | `app/(site)/admin/page.tsx` | 푸터 있는 일반 화면 |
| `app/admin/reports/[reportKey]/page.tsx` | `app/(site)/admin/reports/[reportKey]/page.tsx` | 푸터 있는 일반 화면 |
| `app/admin/reports/page.tsx` | `app/(site)/admin/reports/page.tsx` | 푸터 있는 일반 화면 |
| `app/admin/users/[userKey]/page.tsx` | `app/(site)/admin/users/[userKey]/page.tsx` | 푸터 있는 일반 화면 |
| `app/admin/users/page.tsx` | `app/(site)/admin/users/page.tsx` | 푸터 있는 일반 화면 |
| `app/admin/withdrawals/page.tsx` | `app/(site)/admin/withdrawals/page.tsx` | 푸터 있는 일반 화면 |
| `app/auth/callback/[provider]/route.ts` | 그대로 | 라우트 핸들러. 레이아웃을 쓰지 않으므로 경로 그룹에 넣지 않는다 |
| `app/developer/projects/[projectKey]/edit/page.tsx` | `app/(site)/developer/projects/[projectKey]/edit/page.tsx` | 푸터 있는 일반 화면 |
| `app/developer/projects/[projectKey]/page.tsx` | `app/(site)/developer/projects/[projectKey]/page.tsx` | 푸터 있는 일반 화면 |
| `app/developer/projects/new/page.tsx` | `app/(site)/developer/projects/new/page.tsx` | 푸터 있는 일반 화면 |
| `app/developer/projects/page.tsx` | `app/(site)/developer/projects/page.tsx` | 푸터 있는 일반 화면 |
| `app/developer/recruitments/[recruitmentKey]/page.tsx` | `app/(site)/developer/recruitments/[recruitmentKey]/page.tsx` | 푸터 있는 일반 화면 |
| `app/developer/recruitments/new/page.tsx` | `app/(site)/developer/recruitments/new/page.tsx` | 푸터 있는 일반 화면 |
| `app/events/page.tsx` | `app/(site)/events/page.tsx` | 푸터 있는 일반 화면 |
| `app/globals.css` | 그대로 | 루트 파일 |
| `app/icon.svg` | 그대로 | 루트 파일 |
| `app/layout.tsx` | 그대로 | 루트 파일 |
| `app/login/page.tsx` | `app/(site)/(auth)/login/page.tsx` | 로그인·가입이 AuthCard·SocialButtons를 함께 쓴다 |
| `app/my/(account)/credits/page.tsx` | `app/(site)/my/(account)/credits/page.tsx` | 푸터 있는 일반 화면 |
| `app/my/(account)/credits/withdrawals/page.tsx` | `app/(site)/my/(account)/credits/withdrawals/page.tsx` | 푸터 있는 일반 화면 |
| `app/my/(account)/layout.tsx` | `app/(site)/my/(account)/layout.tsx` | 푸터 있는 일반 화면 |
| `app/my/(account)/page.tsx` | `app/(site)/my/(account)/page.tsx` | 푸터 있는 일반 화면 |
| `app/my/(account)/profile/edit/page.tsx` | `app/(site)/my/(account)/profile/edit/page.tsx` | 푸터 있는 일반 화면 |
| `app/my/(account)/subscription/checkout/page.tsx` | `app/(site)/my/(account)/subscription/checkout/page.tsx` | 푸터 있는 일반 화면 |
| `app/my/(account)/subscription/page.tsx` | `app/(site)/my/(account)/subscription/page.tsx` | 푸터 있는 일반 화면 |
| `app/my/chats/[roomKey]/not-found.tsx` | `app/(conversation)/my/chats/[roomKey]/not-found.tsx` | 채팅방 404. 지금처럼 푸터가 보이게 SiteFrame으로 본문·푸터를 직접 그린다(S157) |
| `app/my/chats/[roomKey]/page.tsx` | `app/(conversation)/my/chats/[roomKey]/page.tsx` | 푸터 없는 채팅방. <main>을 페이지가 직접 그린다 |
| `app/my/chats/page.tsx` | `app/(site)/my/chats/page.tsx` | 푸터 있는 일반 화면 |
| `app/not-found.tsx` | 그대로 | 앱 전체 404. (site) 레이아웃 밖에서 그려지므로 SiteFrame으로 본문·푸터를 직접 그린다 |
| `app/notices/page.tsx` | `app/(site)/notices/page.tsx` | 푸터 있는 일반 화면 |
| `app/opengraph-image.tsx` | 그대로 | 루트 파일 |
| `app/page.tsx` | `app/(site)/(home)/page.tsx` | 홈 전용 부품을 (home)/_components에 둔다 |
| `app/privacy/page.tsx` | `app/(site)/privacy/page.tsx` | 푸터 있는 일반 화면 |
| `app/recruitments/[slug]/apply/page.tsx` | `app/(site)/recruitments/[slug]/apply/page.tsx` | 푸터 있는 일반 화면 |
| `app/recruitments/[slug]/page.tsx` | `app/(site)/recruitments/[slug]/page.tsx` | 푸터 있는 일반 화면 |
| `app/recruitments/page.tsx` | `app/(site)/recruitments/page.tsx` | 푸터 있는 일반 화면 |
| `app/signup/page.tsx` | `app/(site)/(auth)/signup/page.tsx` | 로그인·가입이 AuthCard·SocialButtons를 함께 쓴다 |
| `app/signup/social/page.tsx` | `app/(site)/(auth)/signup/social/page.tsx` | 로그인·가입이 AuthCard·SocialButtons를 함께 쓴다 |
| `app/terms/page.tsx` | `app/(site)/terms/page.tsx` | 푸터 있는 일반 화면 |
| `app/testers/recruitments/[participationKey]/page.tsx` | `app/(site)/testers/recruitments/[participationKey]/page.tsx` | 푸터 있는 일반 화면 |
| `app/testers/recruitments/page.tsx` | `app/(site)/testers/recruitments/page.tsx` | 푸터 있는 일반 화면 |

새로 만드는 파일: `app/_components/Main.tsx`, `app/_components/SiteFooter.tsx`(`AppFooter`에서 나눔), `app/_components/SiteFrame.tsx`, `app/(site)/layout.tsx`. `app/(conversation)/`에는 레이아웃을 만들지 않는다([3.3](03-target-structure.md#33-레이아웃이-맡는-것)).

## 4.3 그 밖의 파일 이동표 (2~5단계)

`app` 밖의 187개 파일 전부다. 4.2와 이 표의 경로는 모두 앱 코드 최상위 기준이다. 0단계 전에는 `frontend/src/`, 뒤에는 `frontend/` 아래다. [`scripts/structure/usage.mjs`](../../frontend/scripts/structure/usage.mjs) 결과로 만들었다.

- **쓰는 라우트**: 이 파일을 직접·간접으로 쓰는 라우트 파일(페이지·레이아웃·404·라우트 핸들러 등)의 URL. "(루트 레이아웃)"은 `app/layout.tsx`를 거쳐 모든 화면이 쓴다는 뜻이고, "(루트 not-found)"는 앱 전체 404, "… not-found"는 그 구간의 404다.
- **다른 폴더에서 import**: 같은 기능 폴더와 `app`을 뺀, 이 파일을 import하는 폴더.
- **옮길 곳**: 화면 부품은 배치 규칙 P4~P6을 계산한 값이다. 근거가 "P4"·"P5"인 행이 그렇다. 나머지는 도메인 기준으로 정했고 근거 열에 이유를 적었다. `A + B`는 파일을 나눈다는 뜻이다.
- 단계: `components/*`는 2단계, `features/*/components/*`는 3단계(도메인을 바꾸는 행은 5단계), `demo/`로 가는 행은 4단계, 나머지는 5단계다. 예외로 `AccountNav`는 2단계, `lib/session.ts`·`lib/auth.ts`·`admin/users.ts`는 4단계에 옮긴다(4.1).

### `components`

| 파일 | 줄 | 쓰는 라우트 | 다른 폴더에서 import | 옮길 곳 | 근거 |
| --- | ---: | --- | --- | --- | --- |
| `AccessDenied.tsx` | 17 | /admin, /admin/reports 외 4곳 | - | `app/(site)/admin/_components/AccessDenied.tsx` | 한 구역 안의 라우트들만 쓴다(P5) |
| `ComingSoon.tsx` | 27 | /events, /notices 외 4곳 | - | `app/_components/ComingSoon.tsx` | 여러 구역의 준비 중 화면. 홈 링크를 가진 앱 공통 화면이라 app 최상위 |

### `components/layout`

| 파일 | 줄 | 쓰는 라우트 | 다른 폴더에서 import | 옮길 곳 | 근거 |
| --- | ---: | --- | --- | --- | --- |
| `AppFooter.tsx` | 43 | (루트 레이아웃) | - | `app/_components/AppFooter.tsx` + `app/_components/SiteFooter.tsx` | SiteFrame을 거쳐 (site) 레이아웃, 앱 전체 404, 채팅방 404가 그린다. 공통 조상이 app이다. 푸터 마크업은 SiteFooter로 나눠 서버 전용 코드 없이 둔다. 클라이언트 컴포넌트인 error.tsx가 쓰게 하려고 |
| `AppHeader.tsx` | 52 | (루트 레이아웃) | - | `app/_components/AppHeader.tsx` | 이 라우트 하나만 쓴다(P4) |
| `DemoSwitcher.tsx` | 71 | (루트 레이아웃) | - | `demo/DemoSwitcher.tsx` | 개발 환경 전용 시연 도구. 시연 코드는 demo/에 모은다 |
| `HideFooter.tsx` | 23 | /my/chats/[roomKey] | - | 삭제 | 푸터를 (site) 레이아웃(SiteFrame)만 그리고 (conversation)에는 레이아웃이 없으므로 숨길 푸터가 없다. 본문 세로 채우기는 채팅방 페이지의 <main>이 한다 |
| `MainNav.tsx` | 11 | (루트 레이아웃) | - | `app/_components/MainNav.tsx` | 이 라우트 하나만 쓴다(P4) |
| `MobileMenu.tsx` | 116 | (루트 레이아웃) | - | `app/_components/MobileMenu.tsx` | 이 라우트 하나만 쓴다(P4) |
| `MyPageLink.tsx` | 23 | (루트 레이아웃) | - | `app/_components/MyPageLink.tsx` | 이 라우트 하나만 쓴다(P4) |
| `NavList.tsx` | 36 | (루트 레이아웃) | - | `app/_components/NavList.tsx` | 이 라우트 하나만 쓴다(P4) |
| `UserMenu.tsx` | 52 | (루트 레이아웃) | - | `app/_components/UserMenu.tsx` | 이 라우트 하나만 쓴다(P4) |

### `components/ui`

| 파일 | 줄 | 쓰는 라우트 | 다른 폴더에서 import | 옮길 곳 | 근거 |
| --- | ---: | --- | --- | --- | --- |
| `Badge.tsx` | 23 | /, /admin 외 17곳 | `features/admin` `features/chat` `features/my` `features/participation` `features/project` `features/recruitment` | 유지 | 여러 구역이 함께 쓴다 |
| `Button.tsx` | 13 | (루트 레이아웃), / 외 19곳 | `components/layout` `features/admin` `features/auth` `features/chat` `features/credit` `features/my` `features/participation` `features/project` | 유지 | 여러 구역이 함께 쓴다 |
| `Card.tsx` | 7 | /developer/projects, /developer/projects/[projectKey]/edit 외 5곳 | `features/participation` `features/project` | 유지 | 여러 구역이 함께 쓴다 |
| `Carousel.tsx` | 123 | / | `features/home` | 유지 | 도메인을 모르는 범용 부품. 한 곳에서만 써도 components/ui 기준(도메인·URL을 모른다)에 맞다 |
| `Container.tsx` | 7 | (루트 not-found), (루트 레이아웃) 외 29곳 | `components` `components/layout` `features/admin` `features/auth` | 유지 | 여러 구역이 함께 쓴다 |
| `EmptyState.tsx` | 20 | /, /admin/reports 외 12곳 | `features/admin` `features/chat` `features/participation` `features/project` `features/recruitment` | 유지 | 여러 구역이 함께 쓴다 |
| `FormField.tsx` | 66 | /login, /my/profile/edit 외 2곳 | `features/auth` `features/my` | 유지 | 코드는 도메인을 모른다(아이콘만 import). 첫 주석의 '회원 정보 폼' 표현만 일반화 |
| `LinkButton.tsx` | 13 | (루트 not-found), (루트 레이아웃) 외 28곳 | `components` `components/layout` `features/admin` `features/chat` `features/home` `features/my` `features/participation` `features/project` `features/recruitment` | 유지 | 여러 구역이 함께 쓴다 |
| `Pagination.tsx` | 55 | / | `features/recruitment` | 유지 | 도메인을 모르는 범용 부품 |
| `ProofMarks.tsx` | 13 | / | `features/home` | `app/(site)/(home)/_components/ProofMarks.tsx` | DESIGN.md:364 The Proof Mark Rule: 히어로에만 둔다 |
| `Skeleton.tsx` | 7 | (루트 레이아웃), / 외 26곳 | `components/layout` `features/admin` `features/auth` `features/chat` `features/participation` `features/project` `features/recruitment` | 유지 | 여러 구역이 함께 쓴다 |
| `button-styles.ts` | 39 | (루트 not-found), (루트 레이아웃) 외 34곳 | `features/participation` | 유지 | - |

### `features/admin`

| 파일 | 줄 | 쓰는 라우트 | 다른 폴더에서 import | 옮길 곳 | 근거 |
| --- | ---: | --- | --- | --- | --- |
| `actions.ts` | 77 | /admin/reports/[reportKey], /admin/withdrawals | - | `features/report/actions.ts` + `features/credit/actions.ts` | processReport는 신고, processWithdrawal은 출금 처리. 처리 기록 저장(saveReview·saveWithdrawalReview)은 각 도메인 api.ts의 저장 함수로 부른다(B4). 리다이렉트 주소는 각 도메인 paths.ts에서 가져온다(B3) |
| `api.ts` | 157 | /admin, /admin/reports 외 4곳 | - | `features/session/guard.ts` + `features/report/api.ts` + `features/credit/api.ts` + `app/(site)/admin/_lib/summary.ts` | 권한 확인·신고 조회·출금 조회·운영자 홈 요약이 한 파일에 있다. loadAll은 신고(report/api.ts)와 출금(credit/api.ts)으로 나눈다. 홈 요약은 두 api.ts의 조회 함수만 부르고 demo/를 직접 읽지 않는다 |
| `components/AdminShell.tsx` | 66 | /admin, /admin/reports 외 4곳 | - | `app/(site)/admin/_components/AdminShell.tsx` | 한 구역 안의 라우트들만 쓴다(P5) |
| `components/CopyAccountButton.tsx` | 31 | /admin/withdrawals | - | `app/(site)/admin/withdrawals/_components/CopyAccountButton.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/LinkTabs.tsx` | 41 | /admin/reports, /admin/users, /admin/withdrawals | - | `app/(site)/admin/_components/LinkTabs.tsx` | 한 구역 안의 라우트들만 쓴다(P5) |
| `components/OldestPendingPanel.tsx` | 50 | /admin | - | `app/(site)/admin/_components/OldestPendingPanel.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/PendingSummary.tsx` | 85 | /admin | - | `app/(site)/admin/_components/PendingSummary.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/RecentRequests.tsx` | 122 | /admin | - | `app/(site)/admin/_components/RecentRequests.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/ReportDetail.tsx` | 184 | /admin/reports/[reportKey] | - | `app/(site)/admin/reports/[reportKey]/_components/ReportDetail.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/ReportList.tsx` | 128 | /admin/reports | - | `app/(site)/admin/reports/_components/ReportList.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/RequestReviewForm.tsx` | 130 | /admin/withdrawals | - | `app/(site)/admin/withdrawals/_components/RequestReviewForm.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/UserDetail.tsx` | 171 | /admin/users/[userKey] | - | `app/(site)/admin/users/[userKey]/_components/UserDetail.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/UserList.tsx` | 107 | /admin/users | - | `app/(site)/admin/users/_components/UserList.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/WithdrawalDetail.tsx` | 89 | /admin/withdrawals | - | `app/(site)/admin/withdrawals/_components/WithdrawalDetail.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/WithdrawalForm.tsx` | 32 | /admin/withdrawals | - | `app/(site)/admin/withdrawals/_components/WithdrawalForm.tsx` | 출금 처리 화면만 쓴다(P4). 오류 문구에 넣는 시연 쿠키 이름(DEMO_ADMIN_WITHDRAWALS_COOKIE)은 reviews.ts 대신 credit/api.ts가 내보내는 상수에서 읽는다. app에서 demo/를 import하는 곳은 AppFooter 하나로 둔다(3.5) |
| `components/WithdrawalList.tsx` | 133 | /admin/withdrawals | - | `app/(site)/admin/withdrawals/_components/WithdrawalList.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/WithdrawalModal.tsx` | 126 | /admin/withdrawals | - | `app/(site)/admin/withdrawals/_components/WithdrawalModal.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/WithdrawalModalContent.tsx` | 34 | /admin/withdrawals | - | `app/(site)/admin/withdrawals/_components/WithdrawalModalContent.tsx` | 이 라우트 하나만 쓴다(P4) |
| `mock.ts` | 157 | /admin, /admin/reports 외 4곳 | - | `demo/report.ts` + `demo/credit.ts` | 목업 |
| `reviews.ts` | 77 | /admin, /admin/reports 외 4곳 | - | `demo/report.ts` + `demo/credit.ts` | 쿠키에 남기는 처리 기록(시연). report/api.ts·credit/api.ts만 부른다 |
| `types.ts` | 219 | /admin, /admin/reports 외 4곳 | - | `features/report/types.ts` + `features/credit/types.ts` + `features/report/paths.ts` + `features/credit/paths.ts` + `app/(site)/admin/_lib/paths.ts` | 신고 타입, 출금 요청 타입. 신고 목록·상세 주소와 필터(reportsHref·reportDetailHref·parseReportTargetFilter)는 report/paths.ts, 출금 목록 주소(withdrawalsHref)는 credit/paths.ts. 액션과 api.ts가 쓰므로 app에 둘 수 없다(B3). 목록 탭(ListTab·parseListTab)은 두 paths.ts에 하나씩 둔다. 운영자 홈의 요청 링크와 요약 타입(ADMIN_REQUEST_PATH·adminRequestHref·AdminSummary·PendingItem)만 app/(site)/admin/_lib/paths.ts |
| `users.ts` | 175 | /admin/users, /admin/users/[userKey] | - | `features/member/admin.ts` + `features/member/api.ts` + `demo/member.ts` | 4단계에 나눈다. 회원 관리 타입·필터·이름 가리기는 admin.ts, 조회(getUsers·getUser·isUserKey)는 api.ts, 샘플 회원(SEEDS·buildUsers)은 demo/member.ts. 시연 데이터를 읽는 조회는 api.ts에 있어야 한다(B4) |

### `features/auth`

| 파일 | 줄 | 쓰는 라우트 | 다른 폴더에서 import | 옮길 곳 | 근거 |
| --- | ---: | --- | --- | --- | --- |
| `actions.ts` | 170 | (루트 레이아웃), /login 외 2곳 | `components/layout` | 유지 | - |
| `components/Agreements.tsx` | 47 | /signup, /signup/social | - | `app/(site)/(auth)/signup/_components/Agreements.tsx` | 한 구역 안의 라우트들만 쓴다(P5) |
| `components/AuthCard.tsx` | 57 | /login, /signup, /signup/social | - | `app/(site)/(auth)/_components/AuthCard.tsx` | 한 구역 안의 라우트들만 쓴다(P5) |
| `components/LoginForm.tsx` | 46 | /login | - | `app/(site)/(auth)/login/_components/LoginForm.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/SignupForm.tsx` | 61 | /signup | - | `app/(site)/(auth)/signup/_components/SignupForm.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/SocialButtons.tsx` | 40 | /login, /signup | - | `app/(site)/(auth)/_components/SocialButtons.tsx` | 한 구역 안의 라우트들만 쓴다(P5) |
| `components/SocialSignupForm.tsx` | 54 | /signup/social | - | `app/(site)/(auth)/signup/social/_components/SocialSignupForm.tsx` | 이 라우트 하나만 쓴다(P4) |
| `oauth.ts` | 90 | (루트 레이아웃), /auth/callback/[provider] 외 3곳 | - | 유지 | - |
| `types.ts` | 24 | (루트 레이아웃), /auth/callback/[provider] 외 3곳 | - | 유지 | - |

### `features/chat`

| 파일 | 줄 | 쓰는 라우트 | 다른 폴더에서 import | 옮길 곳 | 근거 |
| --- | ---: | --- | --- | --- | --- |
| `actions.ts` | 28 | /my/chats, /my/chats/[roomKey] | - | 유지 | - |
| `api.ts` | 240 | /my/chats, /my/chats/[roomKey] | - | 유지 | 목업 분기만 demo/chat.ts로 |
| `components/ChatCard.tsx` | 63 | /my/chats | - | `app/(site)/my/chats/_components/ChatCard.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/ChatCardMenu.tsx` | 214 | /my/chats, /my/chats/[roomKey] | - | 유지 | 채팅함·채팅방이 다른 경로 그룹이라 공통 조상이 app뿐 |
| `components/ChatComposer.tsx` | 182 | /my/chats/[roomKey] | - | `app/(conversation)/my/chats/[roomKey]/_components/ChatComposer.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/ChatFilters.tsx` | 157 | /my/chats | - | `app/(site)/my/chats/_components/ChatFilters.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/ChatInbox.tsx` | 98 | /my/chats | - | `app/(site)/my/chats/_components/ChatInbox.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/ChatMessageList.tsx` | 48 | /my/chats/[roomKey] | - | `app/(conversation)/my/chats/[roomKey]/_components/ChatMessageList.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/ChatRoleBadge.tsx` | 15 | /my/chats, /my/chats/[roomKey] | - | 유지 | 같은 이유 |
| `components/ChatRoomDialog.tsx` | 45 | /my/chats, /my/chats/[roomKey] | - | 유지 | 같은 이유 |
| `components/ChatRoomHeader.tsx` | 40 | /my/chats/[roomKey] | - | `app/(conversation)/my/chats/[roomKey]/_components/ChatRoomHeader.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/ChatRoomView.tsx` | 50 | /my/chats/[roomKey] | - | `app/(conversation)/my/chats/[roomKey]/_components/ChatRoomView.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/ChatThumb.tsx` | 63 | /my/chats, /my/chats/[roomKey] | - | 유지 | 같은 이유 |
| `components/ChatsBackLink.tsx` | 19 | /my/chats/[roomKey] | - | `app/(conversation)/my/chats/[roomKey]/_components/ChatsBackLink.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/bubble.ts` | 31 | /my/chats/[roomKey] | - | `app/(conversation)/my/chats/[roomKey]/_components/bubble.ts` | 채팅방만 쓴다 |
| `inbox-href.ts` | 31 | /my/chats, /my/chats/[roomKey] | - | 유지 | 채팅함과 채팅방(다른 경로 그룹)이 함께 쓴다 |
| `mock.ts` | 226 | /my/chats, /my/chats/[roomKey] | - | `demo/chat.ts` | 목업 |
| `query.ts` | 47 | /my/chats, /my/chats/[roomKey], /my/chats/[roomKey] not-found | - | 유지 | - |
| `thread.ts` | 50 | /my/chats/[roomKey] | - | 유지 | 메시지 묶기 규칙(도메인 로직) |
| `types.ts` | 63 | /my/chats, /my/chats/[roomKey], /my/chats/[roomKey] not-found | - | 유지 | - |

### `features/credit`

| 파일 | 줄 | 쓰는 라우트 | 다른 폴더에서 import | 옮길 곳 | 근거 |
| --- | ---: | --- | --- | --- | --- |
| `actions.ts` | 58 | /my/credits/withdrawals | - | 유지 | 운영자 출금 처리 액션이 합류. addDemoWithdrawal 직접 호출을 credit/api.ts의 저장 함수 호출로 바꾼다(B4) |
| `api.ts` | 72 | /my, /my/credits 외 4곳 | `features/my` | 유지 | 운영자 출금 조회가 합류. 출금 신청·처리 기록 저장 함수와, 출금 처리 폼의 오류 문구가 쓰는 시연 저장 쿠키 이름을 내보낸다(시연 모드면 demo/credit.ts에 저장) |
| `components/DayGroups.tsx` | 51 | /my, /my/credits, /my/credits/withdrawals | `features/my` | `app/(site)/my/(account)/_components/DayGroups.tsx` | 한 구역 안의 라우트들만 쓴다(P5) |
| `components/FlowIcon.tsx` | 17 | /my, /my/credits, /my/credits/withdrawals | - | `app/(site)/my/(account)/_components/FlowIcon.tsx` | 한 구역 안의 라우트들만 쓴다(P5) |
| `components/LedgerList.tsx` | 52 | /my/credits | - | `app/(site)/my/(account)/credits/_components/LedgerList.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/LedgerRow.tsx` | 23 | /my, /my/credits | `features/my` | `app/(site)/my/(account)/_components/LedgerRow.tsx` | 한 구역 안의 라우트들만 쓴다(P5) |
| `components/WithdrawalForm.tsx` | 188 | /my/credits/withdrawals | - | `app/(site)/my/(account)/credits/withdrawals/_components/WithdrawalForm.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/WithdrawalHistory.tsx` | 53 | /my/credits/withdrawals | - | `app/(site)/my/(account)/credits/withdrawals/_components/WithdrawalHistory.tsx` | 이 라우트 하나만 쓴다(P4) |
| `demo-requests.ts` | 73 | /my, /my/credits 외 4곳 | - | `demo/credit.ts` | 쿠키에 남기는 시연 기록. credit/api.ts만 부른다 |
| `mock.ts` | 87 | /my, /my/credits 외 4곳 | - | `demo/credit.ts` | 목업 |
| `query.ts` | 7 | /my/credits | - | 유지 | - |
| `types.ts` | 73 | /my, /my/credits 외 4곳 | `features/my` | 유지 | 출금 요청 타입이 합류 |

### `features/home`

| 파일 | 줄 | 쓰는 라우트 | 다른 폴더에서 import | 옮길 곳 | 근거 |
| --- | ---: | --- | --- | --- | --- |
| `components/HeroBanner.tsx` | 48 | / | - | `app/(site)/(home)/_components/HeroBanner.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/HowItWorksSlide.tsx` | 55 | / | - | `app/(site)/(home)/_components/HowItWorksSlide.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/MatGrid.tsx` | 23 | / | - | `app/(site)/(home)/_components/MatGrid.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/ServiceIntroSlide.tsx` | 63 | / | - | `app/(site)/(home)/_components/ServiceIntroSlide.tsx` | 이 라우트 하나만 쓴다(P4) |

### `features/member`

| 파일 | 줄 | 쓰는 라우트 | 다른 폴더에서 import | 옮길 곳 | 근거 |
| --- | ---: | --- | --- | --- | --- |
| `api.ts` | 48 | (루트 레이아웃), /login 외 6곳 | `features/auth` `features/my` | 유지 | - |
| `mock.ts` | 18 | (루트 레이아웃), /login 외 6곳 | - | `demo/member.ts` | 목업 |
| `types.ts` | 7 | (루트 레이아웃), /login 외 6곳 | `features/my` | 유지 | - |

### `features/my`

| 파일 | 줄 | 쓰는 라우트 | 다른 폴더에서 import | 옮길 곳 | 근거 |
| --- | ---: | --- | --- | --- | --- |
| `actions.ts` | 55 | /my/profile/edit | - | `features/member/actions.ts` | 개인정보·비밀번호 변경 |
| `api.ts` | 100 | /my, /my/profile/edit 외 2곳 | - | `features/member/api.ts` + `features/subscription/api.ts` | getProfile·getMyPageSummary는 회원, getSubscriptionOverview·subscriptionFor는 구독. 마이페이지 요약은 목업(demo/)을 읽으므로 app이 아니라 api.ts에 둔다(3.5) |
| `components/AccountNav.tsx` | 44 | /my 레이아웃 | - | `app/(site)/my/(account)/_components/AccountNav.tsx` | 계정 메뉴(/my 레이아웃)만 쓴다(P5). lib/nav.ts를 import하므로 2단계에 nav.ts와 함께 옮긴다(B3) |
| `components/ActivityGroup.tsx` | 26 | /my | - | `app/(site)/my/(account)/_components/ActivityGroup.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/ActivitySummary.tsx` | 68 | /my | - | `app/(site)/my/(account)/_components/ActivitySummary.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/CheckoutForm.tsx` | 157 | /my/subscription/checkout | - | `app/(site)/my/(account)/subscription/checkout/_components/CheckoutForm.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/CreditSummaryCard.tsx` | 60 | /my, /my/credits | - | `app/(site)/my/(account)/_components/CreditSummaryCard.tsx` | 한 구역 안의 라우트들만 쓴다(P5) |
| `components/PasswordForm.tsx` | 82 | /my/profile/edit | - | `app/(site)/my/(account)/profile/edit/_components/PasswordForm.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/PlanComparison.tsx` | 72 | /my/subscription | - | `app/(site)/my/(account)/subscription/_components/PlanComparison.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/ProfileForm.tsx` | 63 | /my/profile/edit | - | `app/(site)/my/(account)/profile/edit/_components/ProfileForm.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/ProfileHeader.tsx` | 30 | /my | - | `app/(site)/my/(account)/_components/ProfileHeader.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/RecentCredits.tsx` | 29 | /my | - | `app/(site)/my/(account)/_components/RecentCredits.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/SubscriptionCard.tsx` | 35 | /my | - | `app/(site)/my/(account)/_components/SubscriptionCard.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/SubscriptionExpiry.tsx` | 33 | /my/subscription | - | `app/(site)/my/(account)/subscription/_components/SubscriptionExpiry.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/SubscriptionPayment.tsx` | 59 | /my/subscription | - | `app/(site)/my/(account)/subscription/_components/SubscriptionPayment.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/SubscriptionStatus.tsx` | 97 | /my/subscription | - | `app/(site)/my/(account)/subscription/_components/SubscriptionStatus.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/TodoList.tsx` | 70 | /my | - | `app/(site)/my/(account)/_components/TodoList.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/card-styles.ts` | 19 | /my, /my/credits 외 4곳 | `features/credit` | `app/(site)/my/(account)/_components/card-styles.ts` | 마이페이지 계정 화면 6곳만 쓴다. credit 부품도 이 아래로 옮겨져 같은 조상을 쓴다 |
| `mock.ts` | 109 | /my, /my/profile/edit 외 2곳 | - | `demo/subscription.ts` + `demo/member.ts` | 목업 |
| `subscription-actions.ts` | 45 | /my/subscription/checkout | - | `features/subscription/actions.ts` | 결제 기록 개수 확인·저장(getDemoSubscriptionPayments·addDemoSubscriptionPayment) 직접 호출을 subscription/api.ts의 함수 호출로 바꾼다(B4) |
| `types.ts` | 111 | /my, /my/profile/edit 외 2곳 | - | `features/subscription/types.ts` + `features/member/types.ts` | 구독·요금제 타입은 구독, 마이페이지 요약·할 일 타입은 회원(member/api.ts가 돌려주는 타입이라 app에 둘 수 없다, B3) |

### `features/participation`

| 파일 | 줄 | 쓰는 라우트 | 다른 폴더에서 import | 옮길 곳 | 근거 |
| --- | ---: | --- | --- | --- | --- |
| `actions.ts` | 54 | /testers/recruitments, /testers/recruitments/[participationKey] | - | 유지 | saveDemoFeedback 직접 호출을 participation/api.ts의 저장 함수 호출로 바꾼다(B4) |
| `api.ts` | 85 | /testers/recruitments, /testers/recruitments/[participationKey] | - | 유지 | 피드백 저장 함수를 더한다(시연 모드면 demo/participation.ts에 저장) |
| `components/DeadlineCalendar.tsx` | 110 | /testers/recruitments | - | `app/(site)/testers/recruitments/_components/DeadlineCalendar.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/DeadlinePanel.tsx` | 68 | /testers/recruitments | - | `app/(site)/testers/recruitments/_components/DeadlinePanel.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/FeedbackField.tsx` | 170 | /testers/recruitments/[participationKey] | - | `app/(site)/testers/recruitments/[participationKey]/_components/FeedbackField.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/FeedbackForm.tsx` | 67 | /testers/recruitments/[participationKey] | - | `app/(site)/testers/recruitments/[participationKey]/_components/FeedbackForm.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/FeedbackMarker.tsx` | 11 | /testers/recruitments/[participationKey] | - | `app/(site)/testers/recruitments/[participationKey]/_components/FeedbackMarker.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/ParticipationDetail.tsx` | 237 | /testers/recruitments/[participationKey] | - | `app/(site)/testers/recruitments/[participationKey]/_components/ParticipationDetail.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/ParticipationList.tsx` | 78 | /testers/recruitments | - | `app/(site)/testers/recruitments/_components/ParticipationList.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/ParticipationRow.tsx` | 98 | /testers/recruitments | - | `app/(site)/testers/recruitments/_components/ParticipationRow.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/ParticipationSkeleton.tsx` | 29 | /testers/recruitments | - | `app/(site)/testers/recruitments/_components/ParticipationSkeleton.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/ParticipationTabs.tsx` | 46 | /testers/recruitments | - | `app/(site)/testers/recruitments/_components/ParticipationTabs.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/ParticipationViewToggle.tsx` | 37 | /testers/recruitments | - | `app/(site)/testers/recruitments/_components/ParticipationViewToggle.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/view-styles.ts` | 8 | /testers/recruitments | - | `app/(site)/testers/recruitments/_components/view-styles.ts` | 참여 목록 화면만 쓴다 |
| `demo-feedback.ts` | 63 | /testers/recruitments, /testers/recruitments/[participationKey] | - | `demo/participation.ts` | 쿠키에 남기는 시연 기록. participation/api.ts만 부른다 |
| `feedback-fields.ts` | 40 | /testers/recruitments, /testers/recruitments/[participationKey] | - | 유지 | - |
| `feedback-images.ts` | 39 | /testers/recruitments, /testers/recruitments/[participationKey] | - | 유지 | - |
| `mock.ts` | 169 | /testers/recruitments, /testers/recruitments/[participationKey] | - | `demo/participation.ts` | 목업 |
| `types.ts` | 148 | /testers/recruitments, /testers/recruitments/[participationKey] | - | 유지 | - |
| `view-preference.ts` | 19 | /testers/recruitments, /testers/recruitments/[participationKey] | - | 유지 | - |

### `features/project`

| 파일 | 줄 | 쓰는 라우트 | 다른 폴더에서 import | 옮길 곳 | 근거 |
| --- | ---: | --- | --- | --- | --- |
| `actions.ts` | 65 | /developer/projects/[projectKey]/edit, /developer/projects/new 외 2곳 | - | `features/project/actions.ts` + `features/recruitment/actions.ts` | saveProject는 프로젝트, 나머지 4개(모집 작성, 지원자 선정, 모집 취소, AI 후속 질문 getFollowupQuestions)는 모집. saveProject의 소유 확인은 getMyProject(모집 건까지 읽는다) 대신 project/api.ts에 새로 두는 프로젝트만의 소유 확인으로 바꾼다(project → recruitment를 만들지 않으려고, 3.4) |
| `api.ts` | 195 | /developer/projects, /developer/projects/[projectKey] 외 5곳 | - | `features/project/api.ts` + `features/recruitment/api.ts` | project에는 프로젝트 자체의 조회·저장만 남긴다. 모집 건을 붙인 프로젝트 목록(findProjects), find*Recruitment*, 지원자·피드백·취소 조회, 피드백 AI 후속 질문 요청(requestFollowupQuestions)은 모집(3.4) |
| `components/AiAnalysisPanel.tsx` | 115 | /developer/recruitments/[recruitmentKey] | - | `app/(site)/developer/recruitments/[recruitmentKey]/_components/AiAnalysisPanel.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/ApplicantList.tsx` | 252 | /developer/recruitments/[recruitmentKey] | - | `app/(site)/developer/recruitments/[recruitmentKey]/_components/ApplicantList.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/CancelRecruitmentButton.tsx` | 79 | /developer/recruitments/[recruitmentKey] | - | `app/(site)/developer/recruitments/[recruitmentKey]/_components/CancelRecruitmentButton.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/FeedbackList.tsx` | 281 | /developer/recruitments/[recruitmentKey] | - | `app/(site)/developer/recruitments/[recruitmentKey]/_components/FeedbackList.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/FollowupQuestionsDialog.tsx` | 144 | /developer/recruitments/[recruitmentKey] | - | `app/(site)/developer/recruitments/[recruitmentKey]/_components/FollowupQuestionsDialog.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/FormSection.tsx` | 13 | /developer/projects/[projectKey]/edit, /developer/projects/new, /developer/recruitments/new | - | `app/(site)/developer/_components/FormSection.tsx` | 한 구역 안의 라우트들만 쓴다(P5) |
| `components/ProjectDashboard.tsx` | 59 | /developer/projects | - | `app/(site)/developer/projects/_components/ProjectDashboard.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/ProjectDescription.tsx` | 80 | /developer/projects/[projectKey], /developer/projects/[projectKey]/edit 외 4곳 | - | 유지 | 개발자 화면과 공개 모집 상세가 함께 쓴다 |
| `components/ProjectDetail.tsx` | 150 | /developer/projects/[projectKey], /developer/projects/[projectKey]/edit 외 3곳 | - | `app/(site)/developer/_components/ProjectDetail.tsx` | 한 구역 안의 라우트들만 쓴다(P5) |
| `components/ProjectForm.tsx` | 241 | /developer/projects/[projectKey]/edit, /developer/projects/new, /developer/recruitments/new | - | `app/(site)/developer/_components/ProjectForm.tsx` | 한 구역 안의 라우트들만 쓴다(P5) |
| `components/ProjectList.tsx` | 53 | /developer/projects | - | `app/(site)/developer/projects/_components/ProjectList.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/PublicRecruitment.tsx` | 180 | /recruitments/[slug] | - | `app/(site)/recruitments/[slug]/_components/PublicRecruitment.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/RecruitmentForm.tsx` | 366 | /developer/recruitments/new | - | `app/(site)/developer/recruitments/new/_components/RecruitmentForm.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/RecruitmentGallery.tsx` | 99 | /developer/recruitments/[recruitmentKey], /recruitments/[slug] | - | `features/recruitment/components/RecruitmentGallery.tsx` | 모집 글 이미지. 개발자 화면과 공개 모집 상세가 함께 쓴다 |
| `components/RecruitmentManage.tsx` | 204 | /developer/recruitments/[recruitmentKey] | - | `app/(site)/developer/recruitments/[recruitmentKey]/_components/RecruitmentManage.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/SavedNotice.tsx` | 12 | /developer/projects, /developer/projects/[projectKey] | - | `app/(site)/developer/projects/_components/SavedNotice.tsx` | 한 구역 안의 라우트들만 쓴다(P5) |
| `components/StatusBadge.tsx` | 17 | /developer/projects/[projectKey], /developer/projects/[projectKey]/edit 외 4곳 | - | `features/recruitment/components/RecruitmentStatusBadge.tsx` | 내보내는 이름이 RecruitmentStatusBadge인 모집 건 상태 배지 |
| `components/TestItemImages.tsx` | 113 | /developer/recruitments/[recruitmentKey], /recruitments/[slug] | - | `features/recruitment/components/TestItemImages.tsx` | 모집 건의 테스트 항목 이미지 |
| `components/TextField.tsx` | 50 | /developer/projects/[projectKey]/edit, /developer/projects/new 외 3곳 | `features/participation` | `components/ui/TextField.tsx` | 도메인을 모르는 입력 칸. participation도 쓴다 |
| `demo-decisions.ts` | 88 | /developer/projects, /developer/projects/[projectKey] 외 5곳 | - | `demo/recruitment.ts` | 쿠키에 남기는 시연 기록 |
| `media.ts` | 50 | /developer/projects, /developer/projects/[projectKey] 외 5곳 | - | 유지 | 화면·서버가 함께 쓰는 이미지 검사 |
| `mock.ts` | 309 | /developer/projects, /developer/projects/[projectKey] 외 5곳 | - | `demo/project.ts` | 목업 |
| `service.ts` | 486 | /developer/projects, /developer/projects/[projectKey] 외 5곳 | - | `features/project/types.ts` + `features/recruitment/api.ts` + `features/recruitment/types.ts` + `features/session/guard.ts` | 486줄. service.ts는 두지 않는다(3.4). 프로젝트 입력 검사(validateProjectForm)는 project/types.ts. 모집 건을 붙인 프로젝트 조회(getMyProjects·getMyDashboard·getMyProject)와 모집 조회·취소·선정·분석·AI 후속 질문(recommendFollowupQuestions)은 recruitment/api.ts, 모집 상태 계산·작성 검사 같은 순수 함수는 recruitment/types.ts. requireRole은 권한 확인 |
| `types.ts` | 182 | /developer/projects, /developer/projects/[projectKey] 외 7곳 | `features/participation` | `features/project/types.ts` + `features/recruitment/types.ts` | 모집 건·지원·피드백 타입(AI 후속 질문 결과 FollowupResult 포함)은 모집. Project의 recruitments 필드는 recruitment/types.ts에 모집 건을 붙인 프로젝트 타입으로 따로 둔다(project가 recruitment를 import하지 않게) |

### `features/recruitment`

| 파일 | 줄 | 쓰는 라우트 | 다른 폴더에서 import | 옮길 곳 | 근거 |
| --- | ---: | --- | --- | --- | --- |
| `api.ts` | 77 | /, /testers/recruitments, /testers/recruitments/[participationKey] | `features/participation` | 유지 | - |
| `components/AllRecruitments.tsx` | 49 | / | - | `app/(site)/(home)/_components/AllRecruitments.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/ProofStamp.tsx` | 29 | /, /testers/recruitments, /testers/recruitments/[participationKey] | `features/home` | 유지 | 홈과 참여 테스트가 함께 쓴다 |
| `components/RecruitmentCard.tsx` | 54 | / | - | `app/(site)/(home)/_components/RecruitmentCard.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/RecruitmentFilters.tsx` | 115 | / | - | `app/(site)/(home)/_components/RecruitmentFilters.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/RecruitmentGrid.tsx` | 44 | / | - | `app/(site)/(home)/_components/RecruitmentGrid.tsx` | 이 라우트 하나만 쓴다(P4) |
| `components/RecruitmentThumb.tsx` | 60 | /, /testers/recruitments, /testers/recruitments/[participationKey] | `features/home` `features/participation` | 유지 | 홈과 참여 테스트가 함께 쓴다 |
| `components/SubscriptionSection.tsx` | 40 | / | - | `app/(site)/(home)/_components/SubscriptionSection.tsx` | 이 라우트 하나만 쓴다(P4) |
| `mock.ts` | 269 | /, /developer/projects 외 8곳 | `features/project` | `demo/recruitment.ts` | 목업. project/api.ts가 직접 import하는 예외도 없어진다 |
| `query.ts` | 58 | /, /testers/recruitments, /testers/recruitments/[participationKey] | - | 유지 | - |
| `types.ts` | 45 | /, /developer/projects 외 8곳 | `features/home` `features/participation` `features/project` | 유지 | project에서 모집 타입이 합류 |

### `lib`

| 파일 | 줄 | 쓰는 라우트 | 다른 폴더에서 import | 옮길 곳 | 근거 |
| --- | ---: | --- | --- | --- | --- |
| `auth-tokens.ts` | 43 | (루트 레이아웃), /admin 외 27곳 | `proxy.ts` | 유지 | proxy.ts와 함께 쓰는 쿠키 정책. 도메인 데이터가 없다 |
| `auth.ts` | 11 | /my, /my/credits 외 6곳 | `features/credit` `features/my` `features/participation` | `features/session/guard.ts` | requireMember. 권한 확인을 한 파일로 모은다. lib/session.ts와 함께 4단계에 옮긴다 |
| `backend-http.ts` | 62 | (루트 레이아웃), /admin 외 27곳 | `proxy.ts` | 유지 | 쿠키·Next를 모르는 HTTP 통신(이미 분리됨) |
| `backend.ts` | 46 | (루트 레이아웃), /admin 외 27곳 | `components/layout` `features/auth` `features/project` | 유지 | 현재 요청의 토큰 쿠키를 붙이는 BFF 호출 |
| `cn.ts` | 4 | (루트 not-found), (루트 레이아웃) 외 35곳 | `components` `components/layout` `components/ui` `features/admin` `features/chat` `features/credit` `features/my` `features/participation` `features/project` `features/recruitment` | 유지 | - |
| `demo-subscription.ts` | 83 | (루트 레이아웃), /admin 외 26곳 | `features/credit` `features/my` | `demo/subscription.ts` | 시연 결제 기록. subscription/api.ts(조회·저장), credit/api.ts(내역의 구독 결제), session/session.ts(헤더 크레딧)가 직접 읽는다(3.5). subscription을 거치면 B6 위반과 credit↔subscription 순환이 생긴다 |
| `demo.ts` | 25 | (루트 레이아웃), / 외 23곳 | `components/layout` `features/admin` `features/chat` `features/credit` `features/my` `features/participation` `features/project` `features/recruitment` | `demo/mode.ts` | 시연 데이터 상황 전환 |
| `form.ts` | 10 | (루트 레이아웃), /login 외 3곳 | `features/auth` `features/my` | 유지 | - |
| `format.ts` | 147 | (루트 레이아웃), / 외 22곳 | `components/layout` `features/admin` `features/chat` `features/credit` `features/my` `features/participation` `features/project` `features/recruitment` | 유지 | - |
| `nav.ts` | 59 | (루트 레이아웃), /my 레이아웃 | `components/layout` `features/my` | `app/_components/nav.ts` | 헤더(루트 레이아웃)와 계정 메뉴(/my 레이아웃)가 쓴다. 둘 다 app 아래 |
| `next-path.ts` | 32 | (루트 레이아웃), /login 외 2곳 | `features/auth` | 유지 | 도메인을 모르는 같은 사이트 경로 검사 |
| `participation-paths.ts` | 12 | (루트 레이아웃), /my 외 6곳 | `features/my` `features/participation` | `features/participation/paths.ts` | 테스터 참여 목록·상세 주소. 도메인을 안다. project-paths.ts와 같은 이유 |
| `project-paths.ts` | 22 | (루트 레이아웃), /developer/projects 외 11곳 | `features/my` `features/project` | `features/project/paths.ts` | 개발자 프로젝트·모집 주소. 도메인을 안다 |
| `session.ts` | 66 | (루트 레이아웃), /admin 외 26곳 | `components/layout` `features/admin` `features/auth` `features/chat` `features/credit` `features/member` `features/my` `features/participation` `features/project` | `features/session/session.ts` | 역할·닉네임·크레딧을 아는 세션. 다른 도메인을 import하지 않는 맨 아래 층(B6). 시연 결제 기록이 demo/로 가는 4단계에 함께 옮긴다(B2) |
| `validation.ts` | 40 | (루트 레이아웃), /login 외 3곳 | `features/auth` `features/my` | `features/member/validation.ts` | 회원 정보 형식 검사만 있다 |

### `최상위`

| 파일 | 줄 | 쓰는 라우트 | 다른 폴더에서 import | 옮길 곳 | 근거 |
| --- | ---: | --- | --- | --- | --- |
| `proxy.ts` | 65 | - | - | 유지 | Next 규칙: app과 같은 높이(proxy.md:23). 0단계 뒤 frontend/proxy.ts |
