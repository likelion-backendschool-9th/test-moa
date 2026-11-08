# Test Moa 프론트엔드

Next.js 16(App Router, Cache Components) + CSS Modules + TypeScript. 글꼴은 Wanted Sans, 아이콘은 Phosphor를 쓴다.

## 실행

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # 프로덕션 빌드
npm run lint
npm test           # 브라우저·빌드 없이 규칙을 검사하는 단위 테스트
npm run test:e2e -- e2e/auth.spec.ts  # 해당 기능의 E2E (처음 한 번: npx playwright install chromium)
npm run test:visual -- --base origin/develop   # 화면 변경 시 기준 커밋과 비교
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
    .../_components/         해당 라우트 또는 구역 전용 부품 (부품마다 폴더)
    .../_lib/                해당 구역만 쓰는 순수 함수·훅·화면 조합
  (conversation)/            푸터 없는 채팅방. 페이지가 본문을 그림
components/ui/               도메인·URL을 모르는 범용 UI (Card·Button·TextField·SelectField 등)
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
scripts/structure/           사용처·배치·import 경계·모듈 값 검사
scripts/visual/              기준 커밋과 화면을 비교하는 도구
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
| P7 | 라우트 전용 순수 함수·화면 조합, 한 구역의 여러 부품이 쓰는 훅 | 해당 구역의 `_lib/` |

### 부품 폴더

`_components`·`components/ui`·`features/*/components`의 부품은 이름과 같은 폴더에 둔다. 스타일이 없는 부품도 폴더로 만든다.

```text
AccountNav/
  AccountNav.tsx          부품. 폴더 이름과 같다
  AccountNav.module.css   이 부품의 스타일
  hook.ts                 이 부품만 쓰는 훅. "use client" 부품에만 둔다
  api.ts                  이 부품만 쓰는 서버 연결. 필요할 때만 둔다
```

- import는 `…/AccountNav/AccountNav`처럼 파일까지 쓴다. `index.ts`는 만들지 않는다.
- 부품 `api.ts`는 `import "server-only"`로 시작하고, 데이터는 `features/*/api.ts`·`actions.ts`만 거친다. `demo`와 `lib/backend*`를 직접 부르지 않는다(B8).
- 두 부품 이상이 쓰는 훅은 P4~P7을 따른다. 한 구역 안이면 그 구역의 `_lib/`, 여러 구역이 쓰고 도메인을 알면 `features/<도메인>/`, 모르면 `lib/`.
- 페이지·레이아웃의 스타일은 옆의 `page.module.css`·`layout.module.css`에 둔다.

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
| B8 | 부품 폴더의 `api.ts` → `demo`, `lib/backend.ts`, `lib/backend-http.ts` |

- 로그인·가입·로그아웃 액션(`auth`)은 화면에서만 부른다. 세션·권한 확인은 `session`이 맡는다.
- 액션은 시연 저장소를 직접 부르지 않고 해당 도메인의 `api.ts`를 거친다. 데이터 함수는 화면의 인증 검사를 믿지 않고 필요한 권한을 다시 확인한다.
- `app`에서 시연 코드를 읽는 곳은 개발용 전환기를 그리는 `AppFooter`뿐이다. `demo`는 도메인의 순수 타입을 가져다 쓸 수 있다.
- 모집을 붙인 프로젝트 조회는 `recruitment`가 맡는다. `project`는 모집을 import하지 않는다. 도메인 사이 양방향 의존은 만들지 않는다.
- API가 바뀌면 `api.ts`를 고치고, 실제 연결이 끝나면 해당 `demo`와 목업 분기를 함께 지운다. `service.ts`는 만들지 않는다.

### 스타일

- 색·간격·글자 크기·줄 높이·모서리·모션 값은 `app/globals.css`의 토큰으로 쓴다. 모듈에 `px`·`rem`·hex·`rgb()`를 직접 쓰지 않는다(R5). 너비·격자 칸 같은 부품 고유 크기와 1px 선 두께는 예외다.
- 미디어 쿼리 너비는 `40rem`·`48rem`·`64rem`·`80rem`, 컨테이너 쿼리는 `48rem`만 쓴다. 따로 정한 값은 바로 위에 `예외`라고 쓴 주석으로 이유를 남긴다.
- 애니메이션은 `--animate-*` 토큰으로 쓴다(`animation: var(--animate-rise-in)`). 모듈 안에 쓴 keyframes 이름은 지역 이름으로 바뀌어 `globals.css`의 keyframes를 찾지 못한다.
- 여러 부품이 쓰는 스타일은 공유 CSS 파일이 아니라 부품으로 나눈다(Next `11-css.md:449`). 교정지 면(패널)은 `Card`가 바탕·모서리·라이트 테두리·포커스 링을 그린다.
- 부르는 쪽이 넘기는 `className`은 그 부품이 정하지 않은 속성만 정한다. 같은 우선순위에서는 import 순서가 이기고, 그 순서는 개발 서버와 빌드에서 다를 수 있다(`11-css.md:402-404`, `:458`). 부르는 쪽이 이겨야 하는 기본값은 `:where()`로 우선순위를 0으로 둔다(`SelectField`의 여백, `Skeleton`의 모서리).
- 다른 모듈의 요소를 가리킬 때는 클래스 대신 `data-*` 속성을 쓴다(`data-hover-card`, `data-hero-paper`, `data-thumb`).
- 모듈 안에서 `@layer`에 기대지 않는다. 빌드 결과에 레이어 순서 선언이 남지 않아 CSS 파일이 실리는 순서가 레이어 순서가 된다.

### 레이아웃과 서버 경계

- `"use client"`는 상호작용에 필요한 부품에만 붙인다. 서버 전용 코드와 시연 데이터 파일은 `server-only`로 표시한다.
- 세션이나 쿠키를 읽는 부품은 `<Suspense>` 안에 둔다.
- 일반 화면의 본문과 푸터는 `(site)/layout.tsx`가, 채팅방의 본문은 해당 페이지가 그린다.
- 없는 주소와 채팅방 404는 `SiteFrame`을 직접 쓴다. `(site)` 페이지가 부른 404는 그룹 레이아웃 안에 있으므로 내용만 그린다. `main#main`과 푸터를 중복해서 그리지 않는다.
- `Main`·`SiteFooter`에는 서버 전용 의존을 넣지 않는다. 오류 화면을 추가할 때 이 두 부품을 사용할 수 있다.

### 확인 명령

변경 범위에 맞는 검사만 실행한다. 기본 검사를 통과하면, 동작 변경이 있는 경우 관련 E2E 파일이나 시나리오를 골라 확인한다. 문서만 바꾸면 `git diff --check`로 확인한다.

새 worktree에서는 `node_modules`를 링크하지 않고 `npm ci`로 설치한다. Next의 전역 라우트 타입이 없거나 라우트를 바꿨으면 `npx next typegen`으로 생성한다.

기본 검사:

```bash
npx tsc --noEmit
npm run lint
npm test
```

파일 배치·import·구조 검사 스크립트를 바꿨을 때:

```bash
npm run test:structure
node scripts/structure/usage.mjs . --check
```

의존성·빌드 설정·서버와 클라이언트 경계를 바꿨을 때:

```bash
npm run build
```

화면 동작을 바꿨을 때는 관련 파일 또는 시나리오만 실행한다. E2E 코드의 삭제·정리만 했다면 정적 검사와 테스트 수집(`--list`)으로 확인하고, 남은 테스트의 준비나 검증 로직도 바꿨다면 그 테스트를 실행한다.

```bash
npm run test:e2e -- e2e/auth.spec.ts
npm run test:e2e -- e2e/projects.spec.ts --grep 'S491'
npm run test:e2e -- --list
```

전체 E2E(`npm run test:e2e`)는 사용자가 요청하거나, 공통 인증·라우팅·전역 레이아웃을 바꿔 영향 범위를 좁힐 수 없을 때 실행한다. 커밋이나 PR 생성 자체는 전체 실행의 이유가 아니다. E2E는 실행 시 프로덕션 빌드와 서버 시작 비용도 든다. CI는 정적 검사·단위 테스트·구조 검사·빌드를 실행하며 E2E를 자동 실행하지 않는다.

### 검증을 나누는 기준

| 층 | 확인할 것 | 이 저장소의 예 |
| --- | --- | --- |
| 단위 | 입력과 결과로 판단할 수 있는 규칙·경계값 | 복귀 주소, 피드백 파싱, 이미지·날짜 제한, 크레딧 계산 |
| 통합 | API·DB·트랜잭션·권한 처리의 연결 | 백엔드 컨트롤러·저장소·동시성 테스트 |
| E2E | 사용자 조작부터 결과 표시까지의 연결 | 로그인, 결제·출금 후 잔액 반영, 피드백 제출 |

프론트엔드 단위 테스트는 `tests/unit/`에 둔다. 기존 Playwright의 TypeScript 변환·경로 별칭을 재사용하되, `playwright.unit.config.ts`는 E2E 설정과 독립적이다. `page`·`browser` fixture와 Next 서버를 사용하지 않아 브라우저 설치나 프로덕션 빌드가 필요 없다. 파일 하나만 확인하려면 `npm run test:unit -- tests/unit/next-path.test.ts`처럼 실행한다.

서버 액션이 이미 호출하는 일반 함수를 직접 검사한다. 테스트에서 같은 규칙을 다시 구현하거나 프레임워크 전체를 가짜로 만드는 방식은 피한다. 경계값과 입력 변형은 단위 테스트로 모으고, E2E에는 그 규칙이 실제 제출과 화면에 연결되는 대표 사례를 남긴다. 페이지 문서에는 규칙 검사와 화면 확인의 범위를 각각 적는다.

E2E에는 핵심 작업의 성공·실패, 권한·개인정보 보호, 잔액·보상 반영과 주요 회귀 검사를 남긴다. 고정 시연 데이터의 문구·개수·배치, 세부 UI 조작과 데이터 변형은 각 페이지 문서에서 `[직접]`으로 구분한다. 이 시나리오는 자동 검사 대상에서 빠진 것이며, 매 변경마다 모두 수동 확인하라는 뜻은 아니다. 해당 동작을 바꿀 때 확인한다. 새 시나리오마다 E2E를 하나씩 추가하지 않는다.

`lint`는 B1~B8을 검사한다. 배치 검사는 R0(계산할 수 없는 동적 import), R1(한 구역 전용 부품의 공용 배치), R2(비공개 폴더 밖의 사용), R3(범용 UI의 도메인 의존), R4(폴더 없는 부품), R5(토큰이 아닌 모듈 값·정하지 않은 너비), R6(정의한 곳이 없는 CSS 변수)를 검사하며 CI에서도 실행한다.

화면 비교(`test:visual`)는 기준 커밋과 지금 코드를 같은 환경에서 빌드해 `e2e/pages.ts`의 `PAGES`, 404 세 곳, 첫 탭이 아닌 화면 9곳을 넓은·좁은 화면, 라이트·다크로 찍고 0픽셀 차이인지 본다. 배포와 같은 Linux에서는 GitHub Actions의 `Frontend visual`을 수동으로 실행하거나 Playwright 공식 이미지에서 돌린다. 마우스를 올린 상태, 메뉴·모달처럼 사진에 안 잡히는 상태는 직접 확인한다. 파일을 옮기면 import 외의 글꼴·이미지·`process.cwd()` 문자열 경로도 확인한다.

세부 기준과 Next 문서 근거: [목표 구조](../docs/frontend-structure/03-target-structure.md). 페이지 URL: [URL 문서](../docs/page-urls.md).

요구사항과 시나리오: [`../docs/frontend/home.md`](../docs/frontend/home.md) · [`../docs/frontend/admin/home.md`](../docs/frontend/admin/home.md) · [`../docs/frontend/admin/reports.md`](../docs/frontend/admin/reports.md) · 디자인 토큰: [`../docs/design-tokens.html`](../docs/design-tokens.html)
