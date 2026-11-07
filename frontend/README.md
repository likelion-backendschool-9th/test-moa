# Test Moa 프론트엔드

Next.js 16(App Router, Cache Components) + Tailwind CSS v4 + TypeScript. 글꼴은 Wanted Sans, 아이콘은 Phosphor를 쓴다.

## 실행

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # 프로덕션 빌드
npm run lint
npm run test:e2e   # Playwright E2E (처음 한 번: npx playwright install chromium)
```

## 환경 변수

| 이름 | 설명 |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | 배포 주소. OG 이미지 같은 공유 링크의 절대 URL에 쓴다. 없으면 `http://localhost:3000` |

## 공유 이미지 글꼴

`app/opengraph-image.tsx`의 이미지 생성기는 Wanted Sans의 GSUB 규칙을 읽지 못한다. 그래서 이미지 문구의 글자만 담은 부분 글꼴(`app/_og/WantedSans-Bold-og.ttf`)을 쓴다. 문구를 바꾸면 다시 만든다.

```bash
pip install fonttools
pyftsubset node_modules/wanted-sans/fonts/ttf/WantedSans-Bold.ttf \
  --text="이미지에 들어가는 모든 문구" --layout-features='' \
  --output-file=app/_og/WantedSans-Bold-og.ttf
```

## 시연용 상태 전환

`AUTH_MODE=backend`에서는 백엔드 인증을 쓰고, 기본 시연 모드에서는 목업을 쓴다. 개발 서버 푸터의 "시연용" 선택 상자나 쿠키로 상태를 바꾼다.

| 쿠키 | 값 | 설명 |
| --- | --- | --- |
| `demo-role` | `guest` · `tester`(기본) · `developer` · `admin` | 로그인 상태와 역할 |
| `demo-data` | `normal`(기본) · `single` · `empty` · `slow` | 구독 모집 1개, 모집 글 없음, 1.5초 지연 |
| `demo-reports` | 처리한 신고 기록(JSON) | 운영자가 신고를 처리하면 생긴다. 지우면 신고가 처음 상태로 돌아간다 |
| `demo-admin-withdrawals` | 처리한 출금 요청 기록(JSON) | 운영자가 출금 요청을 처리하면 생긴다. 지우면 출금 요청이 처음 상태로 돌아간다 |

## 폴더 구조와 규칙

```text
app/                         라우트와 그 라우트만 쓰는 코드
  _components/               헤더·본문·푸터 등 앱 공통 부품
  (site)/                    본문·푸터가 있는 일반 화면
    (home)/, (auth)/          홈과 로그인·가입
    admin/, my/, developer/, testers/, recruitments/
    .../_components/         해당 라우트 또는 구역 전용 부품
    .../_lib/                해당 구역만 쓰는 순수 함수와 화면 조합
  (conversation)/            푸터 없는 채팅방. 페이지가 본문을 그림
components/ui/               도메인·URL을 모르는 범용 UI
features/<도메인>/
  api.ts                     서버 전용 데이터 접근·권한 확인·저장
  actions.ts                 입력 검사 → 데이터 함수 호출 → 이동
  types.ts                   타입과 순수 규칙
  paths.ts                   도메인의 URL 생성 함수(선택)
  components/                여러 구역이 공유하는 도메인 부품(선택)
demo/                        시연 데이터·쿠키 기록·개발용 전환기
lib/                         도메인을 모르는 통신·토큰·포맷·폼 유틸리티
proxy.ts                     요청의 토큰 갱신. app과 같은 높이
e2e/                         계획 문서의 시나리오를 확인하는 Playwright 테스트
scripts/structure/           사용처·배치·import 경계 검사
```

### 배치 기준

| 규칙 | 코드의 성격 | 위치 |
| --- | --- | --- |
| P1 | 시연 데이터·시연 기록·전환기 | `demo/` |
| P2 | 도메인의 조회·저장·액션·타입·검사 | `features/<도메인>/` |
| P3 | 도메인을 모르는 기반 함수 | `lib/` |
| P4 | 라우트 하나만 쓰는 부품 | 해당 라우트의 `_components/` |
| P5 | 한 구역의 여러 라우트가 쓰는 부품 | 그 구역의 공통 조상 `_components/` |
| P6 | 여러 구역이 쓰는 부품 | 도메인 부품은 `features/*/components`, 범용 UI는 `components/ui`, 라우트 의존 부품은 `app/_components` |
| P7 | 라우트 전용 순수 함수·화면 조합 | 해당 구역의 `_lib/` |

구역은 홈, 로그인·가입, 운영자, 계정 화면, 채팅함, 채팅방, 개발자 화면, 참여 테스트처럼 레이아웃과 사용처로 나눈다. `components/ui`는 사용 횟수보다 도메인과 URL을 모르는지가 기준이다. 도메인은 `session`, `auth`, `member`, `subscription`, `credit`, `project`, `recruitment`, `participation`, `chat`, `report`다.

### import 경계

| 규칙 | 허용하지 않는 의존 |
| --- | --- |
| B1 | `components/ui` → `app`, `features`, `demo`, `lib/backend.ts` |
| B2 | `lib` → `app`, `features`, `components`, `demo` |
| B3 | `features` → `app` |
| B4 | `features` 전체에서 `features/*/api.ts`·`features/session/session.ts` 이외의 파일 → `demo` |
| B5 | 다른 도메인의 `actions.ts` 호출 |
| B6 | `features/session` → 다른 도메인 |
| B7 | 다른 도메인 → `features/auth` |

- 로그인·가입·로그아웃 액션(`auth`)은 화면에서만 부른다. 세션·권한 확인은 `session`이 맡는다.
- 액션은 시연 저장소를 직접 부르지 않고 해당 도메인의 `api.ts`를 거친다. 데이터 함수는 화면의 인증 검사를 믿지 않고 필요한 권한을 다시 확인한다.
- `app`에서 시연 코드를 읽는 곳은 개발용 전환기를 그리는 `AppFooter`뿐이다. `demo`는 도메인의 순수 타입을 가져다 쓸 수 있다.
- 모집을 붙인 프로젝트 조회는 `recruitment`가 맡는다. `project`는 모집을 import하지 않는다. 도메인 사이 양방향 의존은 만들지 않는다.
- API가 바뀌면 `api.ts`를 고치고, 실제 연결이 끝나면 해당 `demo`와 목업 분기를 함께 지운다. `service.ts`는 만들지 않는다.

### 레이아웃과 서버 경계

- 색·모션 값은 `app/globals.css`의 토큰에만 둔다. 간격·글자 크기·라운드는 Tailwind 기본 스케일을 쓴다.
- `"use client"`는 상호작용에 필요한 부품에만 붙인다. 서버 전용 코드와 시연 데이터 파일은 `server-only`로 표시한다.
- 세션이나 쿠키를 읽는 부품은 `<Suspense>` 안에 둔다.
- 일반 화면의 본문과 푸터는 `(site)/layout.tsx`가, 채팅방의 본문은 해당 페이지가 그린다.
- 없는 주소와 채팅방 404는 `SiteFrame`을 직접 쓴다. `(site)` 페이지가 부른 404는 그룹 레이아웃 안에 있으므로 내용만 그린다. `main#main`과 푸터를 중복해서 그리지 않는다.
- `Main`·`SiteFooter`에는 서버 전용 의존을 넣지 않는다. 오류 화면을 추가할 때 이 두 부품을 사용할 수 있다.

### 확인 명령

새 worktree에서는 `node_modules`를 링크하지 않고 `npm ci`로 설치한다. Next의 전역 라우트 타입이 없으면 `tsc`에 앞서 생성한다.

```bash
npx next typegen
npx tsc --noEmit
npm run lint
npm run test:structure
node scripts/structure/usage.mjs . --check
npm run build
npm run test:e2e
```

`lint`는 B1~B7을 검사한다. 배치 검사는 R0(계산할 수 없는 동적 import), R1(한 구역 전용 부품의 공용 배치), R2(비공개 폴더 밖의 사용), R3(범용 UI의 도메인 의존)를 검사하며 CI에서도 실행한다. 파일을 옮기면 import 외의 글꼴·이미지·`process.cwd()` 문자열 경로도 확인한다.

세부 기준과 Next 문서 근거: [목표 구조](../docs/frontend-structure/03-target-structure.md). 페이지 URL: [URL 문서](../docs/page-urls.md).

요구사항과 시나리오: [`../docs/frontend/home.md`](../docs/frontend/home.md) · [`../docs/frontend/admin/home.md`](../docs/frontend/admin/home.md) · [`../docs/frontend/admin/reports.md`](../docs/frontend/admin/reports.md) · 디자인 토큰: [`../docs/design-tokens.html`](../docs/design-tokens.html)
