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
  icon-button:
    textColor: "{colors.text-muted}"
    rounded: "{rounded.full}"
    size: "36px"
  icon-button-hover:
    backgroundColor: "{colors.surface-strong}"
    textColor: "{colors.text}"
  icon-button-open:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
  segmented-tabs:
    backgroundColor: "{colors.surface-strong}"
    rounded: "{rounded.full}"
    padding: "4px"
  segmented-tab:
    textColor: "{colors.text-muted}"
    rounded: "{rounded.full}"
    padding: "6px 16px"
  segmented-tab-active:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text}"
    rounded: "{rounded.full}"
    padding: "6px 16px"
  role-badge:
    backgroundColor: "{colors.surface-strong}"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "2px 8px"
  role-badge-developer:
    borderColor: "{colors.line}"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "2px 8px"
  menu-popover:
    backgroundColor: "{colors.surface-muted}"
    borderColor: "{colors.line}"
    rounded: "{rounded.xl}"
    padding: "6px"
  menu-item-hover:
    backgroundColor: "{colors.surface-strong}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
  chat-card:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text}"
    rounded: "{rounded.2xl}"
    padding: "16px 24px"
  chat-time-today:
    textColor: "{colors.accent}"
    typography: "{typography.label}"
  chat-thumb:
    backgroundColor: "{colors.thumb}"
    textColor: "{colors.on-thumb}"
    rounded: "{rounded.2xl} 0 0 {rounded.2xl}"
    width: "160px"
  button-strong:
    backgroundColor: "{colors.text}"
    textColor: "{colors.surface}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  dialog:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text}"
    rounded: "{rounded.2xl}"
    padding: "24px"
  dialog-backdrop:
    backgroundColor: "{colors.surface} 80%"
  chat-room-thumb:
    backgroundColor: "{colors.thumb}"
    rounded: "{rounded.xl}"
    width: "64px"
    height: "48px"
  chat-day-divider:
    textColor: "{colors.text-muted}"
    borderColor: "{colors.line}"
    typography: "{typography.label}"
  chat-bubble-mine:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.2xl}"
    padding: "10px 16px"
  chat-bubble-partner:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text}"
    rounded: "{rounded.2xl}"
    padding: "10px 16px"
  chat-composer:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text}"
    rounded: "{rounded.2xl}"
    padding: "8px 8px 8px 20px"
  chat-send-button:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.full}"
    size: "40px"
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
- **에메랄드 (라이트 / 다크)** (accent, accent-dark): 주 행동 버튼(테스트 둘러보기, 회원가입), 마감 임박 순위 숫자, 카드의 '추가 보상' 줄, '모집 완료' 교정 도장, 소개 배너 제목의 강조 구절 한 곳. 상호작용 상태(포커스 링, 텍스트 선택, 캐럿, 검색창 포커스 링, 모바일 메뉴의 현재 항목)도 이 색을 쓴다. 채팅함에서는 오늘 온 대화의 일시와 점, hover 때 프로젝트명, 고른 역할 탭의 수, 열린 더보기 버튼에 쓴다. 채팅방에서는 보내기 버튼(그 화면의 주 버튼), 내 말풍선 바탕, 메시지 입력창의 포커스 링에 쓴다.
- **연한 에메랄드** (accent-soft): 모바일 메뉴 현재 항목, 열린 더보기 버튼의 바탕. 강조색 글씨·아이콘 아래에만 깐다.
- **강조 위 글씨** (on-accent): 주 버튼, 선택 영역, 내 말풍선의 글씨. 라이트는 흰색, 다크는 검정.

### Neutral
- **작업대 회색** (surface): 페이지 바탕과 헤더. 교정지가 놓이는 작업대.
- **교정지** (surface-muted): 히어로 배너, 순위 패널, 빈 상태, 푸터, 검색창 포커스 면, 채팅 카드, 상대 말풍선, 메시지 입력창.
- **칩 회색** (surface-strong): 보조 버튼, 칩, 검색창, 현재 탭, 행 hover, 스켈레톤.
- **재단 회색** (line): 헤더 아래 선, 썸네일 테두리, 보조 버튼·칩 hover 면, 스크롤바, 채팅방 날짜 구분선, 개발자 역할 배지 테두리.
- **먹** (text): 본문과 제목, 활성 칩의 바탕.
- **흐린 먹** (text-muted): 설명, 메타 정보, 비활성 탭과 정렬, 플레이스홀더.
- **썸네일 면 / 썸네일 글씨** (thumb, on-thumb): 활자 썸네일 전용. 다크에서도 밝은 면(#e9ecf0 계열)을 유지해 교정지처럼 보인다.
- **재단선 먹** (mark): 히어로의 재단선과 CMYK 막대의 K칸.

### Tertiary
- **CMYK 막대** (proof-c, proof-m, proof-y): 히어로 오른쪽 위 색 막대에만 쓰는 장식색. 라이트에서만 보인다.

### Named Rules
**The Token-Only Rule.** 색·모션 값은 `globals.css` 토큰에서만 정의한다. `src/components`, `src/features`에는 hex도, 임의 px도 쓰지 않는다.

**The One Green Rule.** 강조색은 주 행동, 순위 숫자, 추가 보상, 교정 도장, 새로 생긴 것(채팅함의 오늘 온 대화), 그리고 포커스·선택·hover·지금 걸린 필터 같은 상호작용 상태에만 쓴다. 카테고리나 장식, 일반 링크, 카드·메시지마다 반복되는 정보(닉네임, 썸네일, 상대 말풍선)에는 강조색을 쓰지 않는다. 예외는 채팅방의 내 말풍선 하나로, 내가 보낸 말을 한눈에 가르도록 메인 색을 쓴다(2026-11-01 요청). 그래야 강조가 드물어서 눈에 띈다. 한 화면에 주 버튼은 하나.

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

채팅함·채팅방처럼 한 가지에 집중하는 페이지는 본문을 가운데 최대 폭 768px(max-w-3xl) 한 열로 둔다. 채팅방은 페이지 전체가 스크롤되고 메시지 입력창 띠만 화면 아래에 붙는다(sticky). 대화를 높이가 정해진 상자 안에서 따로 스크롤하지 않아서, 모바일에서 스크롤이 겹치지 않고 가상 키보드가 올라오면 입력창도 따라 올라온다. 채팅방에는 사이트 푸터가 없다(채팅함에는 있다). 푸터를 빼는 페이지는 `HideFooter`를 두고, 그 화면이 보이는 동안만 푸터를 숨기며 본문(main)을 세로 flex로 바꾼다. 떠난 화면은 숨겨진 채(Activity) 문서에 남으므로, 표시를 찾는 `:has()`로 푸터를 제어하지 않는다. 채팅방은 그 높이를 채워서 대화가 짧아도 입력창이 화면 아래에 있다.

겹침 순서는 토큰으로만 쓴다: `--z-popover`(20, 카드 위 더보기 메뉴), `--z-menu`(30), `--z-header`(40), `--z-skip`(50). 메뉴는 다음 카드 위에 오되 sticky 헤더 아래로 지나간다.

## Elevation & Depth

그림자가 없다. 깊이는 명도 세 단계, 작업대(surface) → 교정지(surface-muted) → 칩(surface-strong)으로만 나뉘고, 썸네일과 개발자 역할 배지만 1px 재단 회색 테두리로 바탕과 분리된다. 반투명 면은 두 가지뿐이다. 모바일 메뉴(surface 95% + 강한 배경 흐림)와 대화상자 뒤 배경(surface 80% + 약한 흐림). 그라데이션 면은 쓰지 않는다.

### Named Rules
**The Flat Sheet Rule.** 면은 그림자 없이 평평하다. 들뜸은 hover 때 썸네일이 4px 위로 움직이는 것으로만 표현한다. 카드에 붙은 채팅 카드 이미지는 움직일 자리가 없어서 대신 105%로 살짝 커진다.

## Shapes
두 가지 형태 언어를 쓴다. 누르는 것(버튼, 칩, 탭, 검색창, 아이콘 버튼)은 완전 둥근 알약(9999px), 담는 것(배너, 패널, 썸네일, 빈 상태, 채팅 카드, 말풍선, 메시지 입력창)은 16px 둥근 면. 메시지 입력창은 여러 줄로 늘어나서 검색창 같은 알약 대신 담는 면 모서리를 쓴다. 그 사이 값은 작은 요소에만 쓴다: 순위 행 hover·더보기 메뉴 면·채팅방 머리 이미지 12px, 모바일 메뉴 버튼·항목, 더보기 메뉴 항목과 스켈레톤 8px, 말풍선 꼬리 모서리 6px.

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
- **Ghost:** 바탕 없음. 로그인, 내 정보, 슬라이드 이전·다음, 대화상자의 취소.
- **Strong:** 먹 바탕, 작업대 글씨, hover 때 불투명도 90%. 대화방 삭제 확인처럼 되돌리기 어려운 무거운 행동에 쓴다. 위험 색(빨강)이 없어서 강조색 대신 먹을 쓴다.
- `Button`과 `LinkButton`은 같은 `buttonClass`를 쓴다. 새 버튼 스타일을 만들지 말고 variant를 고른다.

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

### 아이콘 버튼
글자 없이 아이콘 하나만 있는 36px 원형 버튼. 평소에는 바탕 없이 흐린 먹 아이콘(Phosphor bold 20px), hover 때 칩 회색 바탕 + 먹 아이콘, 열린 상태(`aria-expanded`)에서는 연한 강조 바탕 + 강조 아이콘. 이름은 `aria-label`로 무엇을 하는지까지 쓴다("북로그 채팅 더보기"). 지금은 채팅 카드의 더보기에 쓴다.

### 더보기 메뉴 (ChatCardMenu)
아이콘 버튼 아래 오른쪽 끝에 맞춰 여는 작은 면. 교정지(surface-muted) 바탕에 1px 재단 회색 테두리, 12px 모서리, 안쪽 6px. 그림자 대신 테두리로 아래 카드와 나눈다. 항목은 8px 모서리, 8px 12px, 0.875rem 600이고 hover·포커스 때 칩 회색. 열면 `rise-in`으로 떠오르고 첫 항목에 포커스가 간다. 위아래 화살표로 옮기고 Esc·Tab·바깥 클릭으로 닫는다. 겹침은 `--z-popover`. 채팅 카드에서는 "대화방 이름 변경", 1px 재단 회색 구분선, "대화방 삭제" 순서이고 되돌리기 어려운 삭제를 맨 아래에 둔다. 항목을 고르면 대화상자를 연다. 채팅방 머리에도 같은 메뉴를 두고, 거기서 삭제하면 채팅함으로 돌아간다.

### 대화상자 (ChatRoomDialog)
브라우저 기본 `<dialog>` 모달. 교정지 면(16px 모서리, 안쪽 24px, 최대 폭 24rem), 그림자 없음. 뒤 배경은 작업대 회색 80% + 약한 흐림이라 그림자 없이도 면이 떠 보인다. 위에서부터 제목(1.125rem 800), 한 줄 설명(흐린 먹 0.875rem), 내용, 오른쪽 아래 버튼(작은 크기). 열리면 `rise-in`으로 떠오르고 첫 조작 요소에 포커스가 가며, 포커스가 안에 갇히고, Esc·바깥 클릭·취소로 닫힌 뒤 연 버튼으로 포커스가 돌아온다. 이름 변경은 입력창(알약, 칩 회색, 포커스 때 작업대 바탕 + 강조색 링) + 취소(ghost)·저장(primary), 삭제 확인은 취소(ghost, 처음 포커스)·삭제(strong).

### 역할 탭 (ChatFilters)
한 목록을 두세 갈래로 나눠 보는 세그먼트 탭. 칩 회색 알약 홈(안쪽 4px) 안에 탭을 나란히 두고, 고른 탭만 교정지 면으로 올라온다(먹 글씨). 나머지 탭은 바탕 없이 흐린 먹, hover 때 먹. 탭은 0.875rem 700, 6px 16px(좁은 화면 6px 12px)이고 이름 뒤에 개수(600, tabular-nums)를 붙인다. 개수는 평소 60% 불투명도, 고른 탭에서는 강조색이다. 헤더 탭(현재 탭이 칩 회색)과 헷갈리지 않도록 홈 안에서 밝은 면이 움직이는 모양을 쓴다. 상태는 `aria-pressed`. 채팅함에서는 "전체 / 테스터 / 개발자"이고 검색창 아래 줄 왼쪽에, 정렬은 같은 줄 오른쪽에 둔다.

### 채팅 카드 (ChatCard)
채팅방 하나를 담는 교정지 면(16px 모서리). 왼쪽 이미지 칸 바로 옆에 선이나 그라데이션 없이 오른쪽 내용이 온다. 이미지 칸은 카드 높이를 다 채우고 폭 96px(sm 128px, md 160px). 내용은 안쪽 위아래 16px·좌우 20px(md 24px)이고, 위에서부터 [대화방 이름 … 최근 일시 0.75rem 흐린 먹 tabular-nums·더보기 아이콘 버튼], [역할 배지 + 대화 상대 닉네임], [최근 메시지 미리보기 한 줄, 흐린 먹, 행간 넉넉히, 넘치면 말줄임]. 줄 사이 6px. 글자는 모두 최근 메시지와 같은 크기(0.875rem)다. 대화방 이름만 역할 탭(`ChatFilters`의 전체·테스터·개발자)과 같은 700으로 두고, 닉네임·메시지·일시는 보통 굵기로 색만 나눈다 (대화방 이름·닉네임은 먹, 메시지·일시는 흐린 먹). 크기는 키우지 않고 굵기 한 단계로만 이름을 세운다. 대화방 이름은 회원이 바꾼 이름이 있으면 그것, 없으면 프로젝트명이다. 내 닉네임은 쓰지 않는다. 역할 배지(`ChatRoleBadge`, 6px 모서리, 0.75rem, 2px 8px)는 상대가 "개발자"인지 "테스터"인지 알린다. 카드마다 반복되므로 강조색 없이 바탕·테두리로 나눈다: 테스터는 칩 회색 바탕(`Badge` 기본), 개발자는 바탕 없이 1px 재단 회색 안쪽 테두리(`Badge`의 `outline`, 크기는 같다). 오늘 온 대화는 일시가 강조색이 되고 앞에 6px 강조색 점이 붙는다. 카드 전체가 채팅방 링크(링크의 `::after`가 카드를 덮는다)이고, 더보기 버튼은 링크 밖에 둬서 따로 누른다. 키보드 포커스는 카드 전체에 강조색 2px 테두리로 보인다. hover 때 프로젝트명이 강조색이 되고 이미지가 105%로 살짝 커진다. 더보기 메뉴가 카드 밖으로 나와야 해서 카드에 `overflow: hidden`을 쓰지 않고, 이미지 칸이 왼쪽 두 모서리를 직접 둥글린다. 목록은 카드 사이 16px, 60ms 순차 등장.

### 채팅 카드 이미지 (ChatThumb)
채팅 카드 왼쪽 이미지 칸. 프로젝트 이미지가 있으면 칸을 꽉 채우고(가운데 기준으로 잘라 채움), 이름이 바로 옆 제목에 있으니 장식으로 두고 대체 텍스트를 비운다. 선이나 그라데이션 없이 이미지 가장자리가 그대로 내용과 맞닿는다. 이미지가 없으면 썸네일 면(thumb) 위에 왼쪽 위 재단선(12px, 30%)과 프로젝트 이름 첫 글자(칸 폭의 34%, 800, 자간 -0.04em)를 앉힌 활자 썸네일로 돌아가고, hover 때 글자가 4px 올라간다. 지금은 시연용 웹·앱 화면 이미지(`public/sample/projects/*.svg`, 원본 4:3)를 쓴다. 웹 서비스는 브라우저 창, 앱은 휴대폰 화면 모양이고 실제 서비스 화면이 아니다. 실제 이미지는 API를 붙일 때 프로젝트 대표 이미지로 바꾼다. 채팅방 머리에서는 64×48px(이미지 원본과 같은 4:3), 12px 모서리의 작은 크기로 쓴다.

### 채팅방 머리 (ChatRoomHeader)
채팅방 맨 위. 왼쪽 작은 프로젝트 이미지(64×48px), 오른쪽에 대화방 이름(h1, 채팅함 제목과 같은 1.5rem 800, 자간 -0.03em, 넘치면 말줄임)과 그 아래 [역할 배지(채팅 카드와 같다) + 대화 상대 닉네임 · "북로그 모집 글" 링크(흐린 먹, hover 때 먹 + 밑줄)], 맨 오른쪽 더보기 아이콘 버튼. 내 닉네임은 쓰지 않는다. 바로 위에 "채팅함"으로 돌아가는 링크(왼쪽 화살표 + 0.875rem 600 흐린 먹, hover 때 먹 글씨와 칩 회색 알약 바탕)가 있다. 앱 헤더 높이가 화면 폭마다 달라 머리는 위에 붙이지 않고 페이지와 함께 스크롤된다.

### 대화 내용 (ChatMessageList)
`role="log"` 한 덩어리. 맨 위에 "북로그 모집 건으로 열린 1대1 대화방이에요."(0.75rem 흐린 먹, 가운데)를 두고, 날짜마다 묶는다. 날짜 구분은 h2로, 가운데 0.75rem 600 흐린 먹 글자("오늘", "어제", "10월 29일 목요일") 양옆에 1px 재단 회색 선이 이어진다. 날짜 묶음 사이 32px, 구분과 말풍선 사이 16px.
- **말풍선:** 16px 모서리, 안쪽 10px 16px, 0.875rem, 행간 넉넉히(1.625), 최대 폭 80%, 줄바꿈은 그대로 보이고 띄어쓰기 없는 긴 글자는 안에서 끊는다. 내 메시지는 오른쪽, 강조색 바탕 + 강조 위 글씨(One Green Rule의 예외, 대비 라이트 5.25:1 · 다크 5.34:1)이고, 그 안의 글을 선택하면 선택 색을 뒤집는다. 상대 메시지는 왼쪽, 교정지 바탕 + 먹 글씨이고 강조색을 쓰지 않는다.
- **묶음:** 같은 사람이 이어 보낸 말풍선은 4px로 붙고, 보낸 사람이 바뀌면 12px 띄운다. 같은 사람이 같은 분에 보낸 묶음의 마지막 말풍선만 말하는 쪽 아래 모서리가 6px이고, 그 바깥쪽(내 메시지는 왼쪽, 상대 메시지는 오른쪽)에 시각(0.75rem 흐린 먹, tabular-nums)을 붙인다. 상대 닉네임은 머리에 있으니 말풍선 위에 다시 쓰지 않는다. 보조 기술에는 말풍선 앞에 숨긴 "나:", "서재지기:"가 읽힌다.

### 메시지 입력창 (ChatComposer)
화면 아래에 붙는 작업대 바탕 띠(위 16px, 아래 16px·md 24px) 안의 교정지 면(16px 모서리, 안쪽 8px 8px 8px 20px). 면 안에 테두리 없는 입력란(0.875rem, 한 줄에서 시작해 내용만큼 늘고 최대 128px, 그 뒤로는 안에서 스크롤)과 오른쪽 40px 원형 보내기 버튼(강조색 바탕 + 강조 위 글씨, 종이비행기 아이콘 18px)이 있다. 포커스 때 면에 2px 강조색 링. 보내기는 이 화면의 주 버튼 하나이고, 앞뒤 공백을 뺀 글이 없으면 40% 불투명도로 비활성이다. md 이상에서는 면 아래에 "Enter로 보내고, Shift+Enter로 줄을 바꿔요."(0.75rem 흐린 먹). 휴대폰 같은 터치 기기에서는 Enter가 줄바꿈이고 보내기 버튼으로만 보내며, 안내도 "Enter로 줄을 바꾸고, 보내기 버튼으로 보내요."다. 한글 조합 중의 Enter는 보내지 않는다. 보내면 서버 응답 전에 내 말풍선이 60% 불투명도로 먼저 보이고 시각 대신 "보내는 중"이 붙는다. 저장된 뒤 놓일 자리에 미리 두어서, 마지막 대화가 오늘이 아니면 "오늘" 구분 아래에 보인다. 열 때와 보낸 뒤에는 가장 최근 메시지가 입력창 바로 위에 오도록 스크롤한다.

### Motion
이징은 하나, `--ease-brand`(cubic-bezier(0.22, 1, 0.36, 1)). 상태 전환 300ms, 이동 500ms, 등장 `rise-in` 500ms, 순차 등장은 60ms씩 최대 340ms. 스켈레톤은 2초 `soft-pulse`. `prefers-reduced-motion`이면 모두 1ms로 줄인다.

## Do's and Don'ts

### Do:
- **Do** 색은 `bg-surface`, `text-text-muted`, `bg-accent` 같은 토큰 유틸리티로만 쓴다. 새 색이 필요하면 `globals.css`에 라이트·다크 값을 함께 추가한다.
- **Do** 조작 요소는 알약, 담는 면은 16px로 둔다.
- **Do** 층은 surface → surface-muted → surface-strong 명도로 나눈다.
- **Do** 모집 글 이미지는 활자 썸네일을 쓴다. 채팅 카드와 채팅방 머리는 프로젝트 이미지를 쓰고, 없을 때만 활자 썸네일로 돌아간다.
- **Do** 마감일, 인원, 보상 숫자는 `tabular-nums`로 같은 자리에 둔다.
- **Do** 모션은 `--ease-brand`와 300/500ms만 쓰고 reduced motion을 지킨다.

### Don't:
- **Don't** `src/components`, `src/features`에 hex나 임의 px를 쓰지 않는다.
- **Don't** 제목 위에 kicker·eyebrow를 두지 않는다.
- **Don't** 그라데이션 글자를 쓰지 않는다.
- **Don't** 강조색을 주 행동, 순위 숫자, 추가 보상, 교정 도장, 새로 생긴 것, 상호작용 상태 밖에서 쓰지 않는다. (예외: 채팅방의 내 말풍선)
- **Don't** 모집 카드 썸네일에 가짜 스크린샷이나 목업 이미지를 넣지 않는다. (채팅 카드의 시연용 프로젝트 화면 이미지는 예외로, 2026-10-30 요청으로 넣었다. 시연용임을 코드와 문서에 적어 둔다)
- **Don't** `ProofMarks`(네 모서리 재단선 + CMYK 막대)를 히어로 밖에 두지 않고, CMYK 막대를 다크에서 보이지 않는다.
- **Don't** 면에 그림자를 넣지 않는다.
- **Don't** 채팅 대화를 높이가 정해진 상자 안에서 따로 스크롤하지 않는다. 페이지가 스크롤되고 입력창 띠만 아래에 붙는다.
