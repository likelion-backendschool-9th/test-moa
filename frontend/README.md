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

`src/app/opengraph-image.tsx`의 이미지 생성기는 Wanted Sans의 GSUB 규칙을 읽지 못한다. 그래서 이미지 문구의 글자만 담은 부분 글꼴(`src/app/_og/WantedSans-Bold-og.ttf`)을 쓴다. 문구를 바꾸면 다시 만든다.

```bash
pip install fonttools
pyftsubset node_modules/wanted-sans/fonts/ttf/WantedSans-Bold.ttf \
  --text="이미지에 들어가는 모든 문구" --layout-features='' \
  --output-file=src/app/_og/WantedSans-Bold-og.ttf
```

## 시연용 상태 전환

로그인과 API는 아직 목업이다. 개발 서버 푸터의 "시연용" 선택 상자나 쿠키로 상태를 바꾼다.

| 쿠키 | 값 | 설명 |
| --- | --- | --- |
| `demo-role` | `guest` · `tester`(기본) · `developer` · `admin` | 로그인 상태와 역할 |
| `demo-data` | `normal`(기본) · `single` · `empty` · `slow` | 구독 모집 1개, 모집 글 없음, 1.5초 지연 |
| `demo-reports` | 처리한 신고 기록(JSON) | 운영자가 신고를 처리하면 생긴다. 지우면 신고가 처음 상태로 돌아간다 |
| `demo-admin-withdrawals` | 처리한 출금 요청 기록(JSON) | 운영자가 출금 요청을 처리하면 생긴다. 지우면 출금 요청이 처음 상태로 돌아간다 |
| `demo-admin-cancellations` | 처리한 모집 취소 요청 기록(JSON) | 운영자가 모집 취소 요청을 처리하면 생긴다. 지우면 모집 취소 요청이 처음 상태로 돌아간다 |

## 폴더 구조와 규칙

```
src/
  app/                 라우트. 데이터를 불러와 도메인 컴포넌트를 조립만 한다
  components/ui/       Button, Badge, Card 같은 기본 요소. 도메인을 모른다
  components/layout/   헤더, 탭, 모바일 메뉴, 푸터
  features/<도메인>/
    components/        도메인 컴포넌트. 데이터는 props로만 받는다
    api.ts             데이터 접근. 실제 API로 바꿀 때 이 파일만 고친다
    mock.ts            시연용 샘플 데이터. api.ts만 import한다
    types.ts           타입. GLOSSARY 용어로 이름을 짓는다
  lib/                 세션, 탭 정의, 포맷, 폼 상태, 검사 규칙 같은 공용 모듈. 도메인을 모른다
e2e/                   시나리오(S번호)와 1:1로 맞춘 Playwright 테스트
```

- 색·모션 값은 `src/app/globals.css`의 토큰에만 둔다. 컴포넌트에 hex나 `[13px]` 같은 임의 값을 쓰지 않는다.
- 간격·글자 크기·라운드는 Tailwind 기본 스케일만 쓴다.
- `"use client"`는 상호작용이 필요한 컴포넌트에만 붙인다.
- 세션이나 쿠키를 읽는 컴포넌트는 `<Suspense>` 안에 둔다. Cache Components에서는 Suspense 밖에서 읽으면 빌드 에러가 난다.
- 새 도메인(참여 테스트, 프로젝트, 채팅, 관리자)도 `features/<도메인>/` 구조로 추가한다.

### 의존 방향

기능별 문서는 이 규칙과 다른 점만 적는다.

- `components/ui`와 `lib`는 `features`를 import하지 않는다.
- `mock.ts`는 같은 기능의 `api.ts`에서만 import한다. 화면과 다른 기능은 `mock.ts`를 부르지 않는다.
- 다른 기능은 그 기능의 `api.ts`, `types.ts`, 공개 컴포넌트로만 쓴다. `actions.ts`, 스타일 상수 같은 내부 파일은 부르지 않는다.
- 여러 기능이 함께 쓰는 코드는 한 기능 안에 두지 않는다. UI는 `components/ui`, 순수 함수와 타입은 `lib`, 데이터는 별도 기능(예: 회원 데이터 `features/member`)에 둔다.
- 검사 함수(`lib/validation.ts`)는 값을 받아 오류 문구를 돌려주는 순수 함수다. 중복 조회, 쿠키, 화면 상태는 서버 액션에서 다룬다.
- 확인: `grep -rn "@/features" src/components/ui src/lib`는 결과가 없어야 하고, `grep -rnE 'from "[^"]*mock"' src`는 각 `api.ts`의 `./mock`과 아래 예외만 나와야 한다.
- 알려진 예외(고칠 예정): `features/project/api.ts → features/recruitment/mock`, `features/credit/components → features/my/components/card-styles`.
- 페이지 URL은 [`../docs/page-urls.md`](../docs/page-urls.md)를 따른다.

요구사항과 시나리오: [`../docs/frontend/home.md`](../docs/frontend/home.md) · [`../docs/frontend/admin-home.md`](../docs/frontend/admin-home.md) · [`../docs/frontend/admin-reports.md`](../docs/frontend/admin-reports.md) · 디자인 토큰: [`../docs/design-tokens.html`](../docs/design-tokens.html)
