---
name: Test Moa
description: 모집 글을 갤러리처럼 훑고 바로 고르는 테스터 모집 플랫폼. 라이트는 교정쇄, 다크는 uibowl.
colors:
  surface: "#efefec"
  surface-muted: "#fbfbfa"
  surface-strong: "#e4e4e0"
  line: "#d6d6d1"
  text: "#1a1a1a"
  text-muted: "#5c5c58"
  accent: "#0f7c4a"
  accent-soft: "#def7eb"
  on-accent: "#ffffff"
  thumb: "#ffffff"
  on-thumb: "#1a1a1a"
  mark: "#1a1a1a"
  proof-c: "#00a0e0"
  proof-m: "#e4007f"
  proof-y: "#ffe600"
  surface-dark: "#000000"
  surface-muted-dark: "#16181d"
  surface-strong-dark: "#1f222a"
  line-dark: "#2a3037"
  text-dark: "#ffffff"
  text-muted-dark: "#a3aab5"
  accent-dark: "#129357"
  accent-soft-dark: "#123625"
  on-accent-dark: "#000000"
  thumb-dark: "#e9ecf0"
  on-thumb-dark: "#16181d"
  mark-dark: "#3d434b"
typography:
  display:
    fontFamily: "Wanted Sans Variable, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.035em"
  display-mobile:
    fontFamily: "Wanted Sans Variable, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 800
    lineHeight: 1.111
    letterSpacing: "-0.035em"
  thumb-name:
    fontFamily: "Wanted Sans Variable, system-ui, sans-serif"
    fontSize: "15cqw"
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Wanted Sans Variable, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.333
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Wanted Sans Variable, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 800
    lineHeight: 1.556
  body-lead:
    fontFamily: "Wanted Sans Variable, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.556
  body:
    fontFamily: "Wanted Sans Variable, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.429
  label:
    fontFamily: "Wanted Sans Variable, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.333
rounded:
  md: "6px"
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  full: "9999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "6": "24px"
  "8": "32px"
  "10": "40px"
  "12": "48px"
  "20": "80px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.full}"
    padding: "12px 20px"
  button-primary-sm:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  button-secondary:
    backgroundColor: "{colors.surface-strong}"
    textColor: "{colors.text}"
    rounded: "{rounded.full}"
    padding: "12px 20px"
  button-secondary-hover:
    backgroundColor: "{colors.line}"
  button-ghost:
    textColor: "{colors.text}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  button-ghost-hover:
    backgroundColor: "{colors.surface-strong}"
  chip:
    backgroundColor: "{colors.surface-strong}"
    textColor: "{colors.text}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  chip-active:
    backgroundColor: "{colors.text}"
    textColor: "{colors.surface}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  search-field:
    backgroundColor: "{colors.surface-strong}"
    textColor: "{colors.text}"
    rounded: "{rounded.full}"
    padding: "12px 20px"
  search-field-focus:
    backgroundColor: "{colors.surface-muted}"
  panel:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text}"
    rounded: "{rounded.2xl}"
    padding: "24px"
  hero-frame:
    backgroundColor: "{colors.surface-muted}"
    rounded: "{rounded.2xl}"
    padding: "48px"
  recruitment-thumb:
    backgroundColor: "{colors.thumb}"
    textColor: "{colors.on-thumb}"
    typography: "{typography.thumb-name}"
    rounded: "{rounded.2xl}"
    padding: "20px"
  nav-tab-active:
    backgroundColor: "{colors.surface-strong}"
    textColor: "{colors.text}"
    rounded: "{rounded.full}"
    padding: "8px 12px"
  rank-row-hover:
    backgroundColor: "{colors.surface-strong}"
    rounded: "{rounded.xl}"
    padding: "8px"
  money-field:
    backgroundColor: "{colors.surface-strong}"
    textColor: "{colors.text}"
    rounded: "{rounded.xl}"
    height: "48px"
    padding: "0 16px"
  money-field-focus:
    backgroundColor: "{colors.surface-muted}"
---

# Design System: Test Moa

## Overview

**Creative North Star: "교정쇄 위의 갤러리"**

구조와 밀도는 uibowl 갤러리 문법을 따른다. 한 줄 헤더와 큰 알약 검색창, 순환 배너 옆 순위 패널, 알약 칩, 16px 모서리의 썸네일 카드, 굵은 Wanted Sans 제목. 그 문법을 라이트 모드에서는 인쇄소의 교정쇄로 번역했다. 작업대 회색 위에 교정지 패널이 놓이고, 글씨는 먹색, 강조는 에메랄드 하나뿐이다. 히어로에는 재단선과 CMYK 색 막대가, 정원이 찬 모집에는 에메랄드 교정 도장이 찍힌다. 다크 모드는 번역하지 않고 uibowl 바탕(검정, 남회색 패널)을 쓰고, 강조는 라이트와 같은 에메랄드 계열을 다크에 맞게 밝힌 값이다.

화면은 평평하다. 그림자 없이 면의 명도 차이(작업대 → 교정지 → 칩)로만 층을 나눈다. 썸네일은 가짜 스크린샷 대신 서비스 이름을 교정지 위에 크게 앉힌 활자 썸네일이고, 이름 자체가 그림이다.

**Key Characteristics:**
- 라이트 교정쇄 / 다크 uibowl, `prefers-color-scheme`로만 전환
- 강조색 하나, 쓰는 자리가 정해져 있다
- 그림자 없는 평면, 명도 세 단계로 층을 나눈다
- 알약(완전 둥근) 조작 요소 + 16px 둥근 면
- 활자 썸네일과 재단선이 이 세계의 고유 장치

## Colors

교정지와 먹, 에메랄드 하나로 된 절제된 팔레트이며, 다크에서는 uibowl 바탕 위에 같은 에메랄드 계열이 같은 역할을 맡는다. 모든 값은 `src/app/globals.css`의 CSS 변수에만 있고, `-dark` 키는 `prefers-color-scheme: dark`에서 같은 이름의 변수를 덮어쓴 값이다(컴포넌트는 `-dark`를 따로 부르지 않는다).

### Primary
- **에메랄드 (라이트 / 다크)** (accent, accent-dark): 주 행동 버튼(테스트 둘러보기, 회원가입), 마감 임박 순위 숫자, 카드의 '추가 보상' 줄, '모집 완료' 교정 도장, 소개 배너 제목의 강조 구절 한 곳. 상호작용 상태(포커스 링, 텍스트 선택, 캐럿, 검색창 포커스 링, 모바일 메뉴의 현재 항목)도 이 색을 쓴다.
- **연한 에메랄드** (accent-soft): 모바일 메뉴 현재 항목의 바탕. 강조색 글씨 아래에만 깐다.
- **강조 위 글씨** (on-accent): 주 버튼과 선택 영역의 글씨. 라이트는 흰색, 다크는 검정.

### Neutral
- **작업대 회색** (surface): 페이지 바탕과 헤더. 교정지가 놓이는 작업대.
- **교정지** (surface-muted): 히어로 배너, 순위 패널, 빈 상태, 푸터, 검색창 포커스 면.
- **칩 회색** (surface-strong): 보조 버튼, 칩, 검색창, 현재 탭, 행 hover, 스켈레톤.
- **재단 회색** (line): 헤더 아래 선, 썸네일 테두리, 보조 버튼·칩 hover 면, 스크롤바.
- **먹** (text): 본문과 제목, 활성 칩의 바탕.
- **흐린 먹** (text-muted): 설명, 메타 정보, 비활성 탭과 정렬, 플레이스홀더.
- **썸네일 면 / 썸네일 글씨** (thumb, on-thumb): 활자 썸네일 전용. 다크에서도 밝은 면(#e9ecf0 계열)을 유지해 교정지처럼 보인다.
- **재단선 먹** (mark): 히어로의 재단선과 CMYK 막대의 K칸.

### Tertiary
- **CMYK 막대** (proof-c, proof-m, proof-y): 히어로 오른쪽 위 색 막대에만 쓰는 장식색. 라이트에서만 보인다.

### Named Rules
**The Token-Only Rule.** 색·모션 값은 `globals.css` 토큰에서만 정의한다. `src/components`, `src/features`에는 hex도, 임의 px도 쓰지 않는다.

**The One Green Rule.** 강조색은 주 행동, 순위 숫자, 추가 보상, 교정 도장, 그리고 포커스·선택 같은 상호작용 상태에만 쓴다. 카테고리나 장식, 일반 링크에 강조색을 쓰지 않는다. 한 화면에 주 버튼은 하나.

**The Proof Ink Rule.** CMYK 색(proof-c/m/y)은 장식 막대에만 쓰고 글씨나 상태 표시에는 쓰지 않는다.

## Typography

**Display Font:** Wanted Sans Variable (with system-ui, sans-serif)
**Body Font:** Wanted Sans Variable (with system-ui, sans-serif)

**Character:** 가변 굵기(400~1000) 한 서체로 전부 해결한다. 제목은 800 굵기에 음수 자간으로 단단하게 조이고, 본문은 기본 굵기로 둔다. `next/font/local`로 자체 호스팅하며 `word-break: keep-all`로 한국어 어절을 지킨다.

### Hierarchy
- **Display** (800, 데스크톱 3rem / 모바일 2.25rem, 자간 -0.035em): 히어로 배너 제목 전용(`DisplayHeading`). 이벤트·공지 슬라이드는 데스크톱에서 한 단계 작게(2.25rem) 쓴다.
- **Thumb Name** (800, 15cqw, 행간 1.02, 자간 -0.04em): 활자 썸네일의 서비스 이름. 컨테이너 쿼리 단위라 카드 폭에 비례한다.
- **Headline** (800, 1.5rem, 자간 -0.03em): '구독 모집', '전체 테스트' 같은 섹션 제목.
- **Title** (800, 1.125rem): 패널 제목(마감 임박 테스트).
- **Body Lead** (400, 1.125rem, 최대 폭 36rem): 히어로 설명 문단, 흐린 먹색.
- **Body** (400~600, 0.875rem): 카드 요청 문구(600), 메타 정보, 칩과 버튼(작은 크기).
- **Label** (0.75rem): 카드의 '모집 마감', '인원' 같은 항목 이름, D-day.

로고 글자 'test moa'는 1.5rem, 800, 자간 -0.04em이다. 숫자(날짜, 인원, 순위, 슬라이드 번호)는 항상 `tabular-nums`.

### Named Rules
**The Weight-Not-Paint Rule.** 강조는 굵기와 크기로만 한다. 그라데이션 글자는 쓰지 않는다.

**The No-Kicker Rule.** 제목 위에 작은 머리말(kicker, eyebrow)을 두지 않는다. 섹션 제목 아래 한 줄 설명은 허용한다.

**The Scale Rule.** 크기와 간격은 Tailwind 기본 스케일에서 고른다. 예외는 위 표의 자간 값과 썸네일의 cqw 크기뿐이다.

## Layout

페이지는 `Container` 하나로 감싼다. 최대 폭 1536px(screen-2xl), 좌우 여백 모바일 16px, md 이상 40px. 홈의 섹션 사이는 80px, 섹션 제목과 내용 사이는 24px.

첫 화면은 lg 이상에서 3열 그리드로, 왼쪽 2칸이 히어로 배너, 오른쪽 1칸이 순위 패널이며 간격 16px. lg 미만에서는 위아래로 쌓인다.

모집 카드 그리드는 두 가지다. 전체 테스트는 2열 → lg 5열(가로 16px, 세로 32px)로, 10개가 두 배열 모두에서 빈칸 없이 떨어진다. 구독 모집은 md 미만에서 가로로 넘기는 스냅 띠(카드 폭 72%), md 이상에서 3열이며 썸네일 비율이 16:10에서 2:1로 넓어진다.

헤더는 sticky 한 줄이다. xl 이상은 로고·탭·검색·계정이 한 줄, md~xl은 탭이 두 번째 줄로 내려가고, md 미만은 검색과 탭이 전체 화면 메뉴로 들어간다.

겹침 순서는 토큰으로만 쓴다: `--z-menu`(30), `--z-header`(40), `--z-skip`(50).

## Elevation & Depth

그림자가 없다. 깊이는 명도 세 단계, 작업대(surface) → 교정지(surface-muted) → 칩(surface-strong)으로만 나뉘고, 썸네일만 1px 재단 회색 테두리로 바탕과 분리된다. 유일한 반투명 면은 모바일 메뉴(surface 95% + 강한 배경 흐림)다.

### Named Rules
**The Flat Sheet Rule.** 면은 그림자 없이 평평하다. 들뜸은 hover 때 썸네일이 4px 위로 움직이는 것으로만 표현한다.

## Shapes

두 가지 형태 언어를 쓴다. 누르는 것(버튼, 칩, 탭, 검색창)은 완전 둥근 알약(9999px), 담는 것(배너, 패널, 썸네일, 빈 상태)은 16px 둥근 면. 그 사이 값은 작은 요소에만 쓴다: 순위 행 hover 12px, 모바일 메뉴 버튼·항목과 스켈레톤 8px. 예외는 금액·계좌를 다루는 폼 하나다(아래 The Money Field Rule).

재단선은 이 세계의 고유 형태다. 히어로에는 네 모서리 16px 재단선(1px 먹선)과 CMYK 막대가 있고, 활자 썸네일에는 왼쪽 위·오른쪽 아래 두 모서리에 12px 재단선이 30% 투명도로 들어간다. 교정 도장은 두 줄 테두리의 둥근 사각형으로 -12° 기울어 이름 위에 겹친다.

### Named Rules
**The Money Field Rule.** 금액·계좌를 입력하는 폼(출금 신청, 앞으로의 구독 결제)은 알약 대신 12px 모서리를 쓴다. 폼 안의 입력란, 선택 상자, 버튼을 모두 같은 모서리·높이(48px)로 맞추고, 버튼은 `shape="field"`로 고른다. 선택 상자는 `.select-field`(globals.css)를 붙여, 지원 브라우저에서 펼친 목록을 칸 바로 아래에 같은 너비·12px 모서리로 맞춘다. 숫자를 다루는 곳에서 가벼운 인상을 줄이기 위해서다. 폼 밖의 버튼·칩·검색창은 알약을 유지한다.

**The Proof Mark Rule.** 재단선 네 모서리와 CMYK 막대 세트(`ProofMarks`)는 히어로에만 둔다. CMYK 막대는 라이트에서만 보인다. 썸네일의 흐린 두 모서리 재단선은 썸네일 고유 장치로, 다른 면에 옮기지 않는다.

## Components

### Buttons
- **Shape:** 완전 둥근 알약(9999px), 굵기 700.
- **Primary:** 강조색 바탕, on-accent 글씨. 보통 12px 20px / 1rem, 작은 크기 8px 16px / 0.875rem. 한 화면 한 개.
- **Hover / Active:** primary는 불투명도 90%, secondary는 칩 회색 → 재단 회색, ghost는 투명 → 칩 회색. 누르면 98%로 줄어든다. 전환은 300ms `--ease-brand`.
- **Secondary:** 칩 회색 바탕, 먹 글씨. '자세히 보기', 헤더의 크레딧 잔액.
- **Ghost:** 바탕 없음. 로그인, 내 정보, 슬라이드 이전·다음.
- `Button`과 `LinkButton`은 같은 `buttonClass`를 쓴다. 새 버튼 스타일을 만들지 말고 variant를 고른다. 모양은 기본 알약(`shape="pill"`)이고, 금액 폼 안에서만 `shape="field"`(12px)를 쓴다.

### Chips
- **Style:** 칩 회색 알약, 8px 16px, 0.875rem 700.
- **State:** 선택되면 먹 바탕 + 작업대 글씨로 반전(`aria-pressed`). 강조색을 쓰지 않는다. 정렬은 칩이 아니라 글자 버튼으로, 선택은 먹, 나머지는 흐린 먹.

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** 교정지(surface-muted). 패널 안쪽 여백 24px(md 32px), 히어로 32px(md 48px), 빈 상태 32px.
- **Shadow Strategy:** 없음(Elevation & Depth 참고).
- **Border:** 없음. 썸네일만 1px 재단 회색.

### Inputs / Fields
- **Style:** 칩 회색 알약 검색창, 돋보기 아이콘(흐린 먹), 테두리 없음. 헤더용은 10px 16px / 0.875rem, 그리드용은 12px 20px / 1rem.
- **Focus:** 바탕이 교정지로 밝아지고 2px 강조색 링이 생긴다.

### Navigation
- **Style:** 알약 탭, 600 굵기. 현재 탭은 칩 회색 바탕 + 먹 글씨, 나머지는 흐린 먹이고 hover 때 먹.
- **Mobile:** 두 줄 햄버거가 X로 회전하는 10×10 버튼. 메뉴는 전체 화면 반투명 면에 검색창과 큰(1.25rem) 항목, 항목은 60ms 간격으로 떠오른다. 현재 항목은 연한 강조 바탕 + 강조 글씨.

### 활자 썸네일 (RecruitmentThumb)
16:10 교정지(thumb) 면 왼쪽 아래에 서비스 이름을 Thumb Name 서체로 앉힌다. 스크린샷이나 일러스트를 넣지 않는다. 카드 hover 때 썸네일만 4px 올라간다(500ms). 카드 본문은 요청 문구 → 유형·기본 보상 → 추가 보상(강조색, 있을 때만) → 모집 마감·인원 순서로 고정.

### 교정 도장 (ProofStamp)
정원이 찬 모집의 썸네일에 '모집 완료'를 찍는 평면 SVG. 강조색 두 줄 테두리, -12° 회전, 라이트는 multiply 합성. 상태 표시에만 쓰고 장식으로 찍지 않는다.

### 순환 배너 (Carousel)
슬라이드를 한 칸에 겹쳐 가장 긴 슬라이드 높이에 맞춘다. 5초 간격, hover·focus·reduced motion이면 멈춘다. 새 슬라이드는 8px 아래에서 500ms에 떠오른다. 조작부(종류 이름, 이전, n / 전체, 다음)는 md 이상에서 오른쪽 아래.

### 순위 패널 (ClosingSoonPanel)
교정지 패널에 1~5 순위 목록. 순위 숫자만 강조색 800, 이름은 600, D-day는 흐린 먹 0.75rem. 행 hover는 12px 둥근 칩 회색.

### Motion
이징은 하나, `--ease-brand`(cubic-bezier(0.22, 1, 0.36, 1)). 상태 전환 300ms, 이동 500ms, 등장 `rise-in` 500ms, 순차 등장은 60ms씩 최대 340ms. 스켈레톤은 2초 `soft-pulse`. `prefers-reduced-motion`이면 모두 1ms로 줄인다.

## Do's and Don'ts

### Do:
- **Do** 색은 `bg-surface`, `text-text-muted`, `bg-accent` 같은 토큰 유틸리티로만 쓴다. 새 색이 필요하면 `globals.css`에 라이트·다크 값을 함께 추가한다.
- **Do** 조작 요소는 알약, 담는 면은 16px로 둔다.
- **Do** 층은 surface → surface-muted → surface-strong 명도로 나눈다.
- **Do** 모집 글 이미지는 활자 썸네일을 쓴다.
- **Do** 마감일, 인원, 보상 숫자는 `tabular-nums`로 같은 자리에 둔다.
- **Do** 모션은 `--ease-brand`와 300/500ms만 쓰고 reduced motion을 지킨다.

### Don't:
- **Don't** `src/components`, `src/features`에 hex나 임의 px를 쓰지 않는다.
- **Don't** 제목 위에 kicker·eyebrow를 두지 않는다.
- **Don't** 그라데이션 글자를 쓰지 않는다.
- **Don't** 강조색을 주 행동, 순위 숫자, 추가 보상, 교정 도장, 상호작용 상태 밖에서 쓰지 않는다.
- **Don't** 가짜 스크린샷이나 목업 이미지를 썸네일에 넣지 않는다.
- **Don't** `ProofMarks`(네 모서리 재단선 + CMYK 막대)를 히어로 밖에 두지 않고, CMYK 막대를 다크에서 보이지 않는다.
- **Don't** 면에 그림자를 넣지 않는다.
