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
  lib/                 세션, 탭 정의, 포맷 같은 공용 모듈
e2e/                   시나리오(S번호)와 1:1로 맞춘 Playwright 테스트
```

- 색·모션 값은 `src/app/globals.css`의 토큰에만 둔다. 컴포넌트에 hex나 `[13px]` 같은 임의 값을 쓰지 않는다.
- 간격·글자 크기·라운드는 Tailwind 기본 스케일만 쓴다.
- `"use client"`는 상호작용이 필요한 컴포넌트에만 붙인다.
- 세션이나 쿠키를 읽는 컴포넌트는 `<Suspense>` 안에 둔다. Cache Components에서는 Suspense 밖에서 읽으면 빌드 에러가 난다.
- 새 도메인(참여 테스트, 프로젝트, 채팅, 관리자)도 `features/<도메인>/` 구조로 추가한다.
- 페이지 URL은 [`../docs/page-urls.md`](../docs/page-urls.md)를 따른다.

요구사항과 시나리오: [`../docs/frontend-home.md`](../docs/frontend-home.md) · [`../docs/frontend-admin-home.md`](../docs/frontend-admin-home.md) · 디자인 토큰: [`../docs/design-tokens.html`](../docs/design-tokens.html)
