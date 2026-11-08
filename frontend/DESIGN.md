---
name: Test Moa
description: 모집 글을 갤러리처럼 훑고 바로 고르는 테스터 모집 플랫폼. 라이트는 흰 교정지와 진한 초록 재단 매트, 다크는 uibowl.
colors:
  surface: "#ffffff"
  surface-muted: "#ffffff"
  surface-card: "#fcfcfb"
  surface-strong: "#f1f3f1"
  line: "#d6ded7"
  text: "#1a1a1a"
  text-muted: "#5c5c58"
  brand-green: "#0f7c4a"
  brand-logo: "#129357"
  accent: "#0f7c4a"
  paper-accent: "#0f7c4a"
  accent-soft: "#def7eb"
  on-accent: "#ffffff"
  like: "#c4264a"
  like-soft: "#fde8ed"
  paid-start: "#ddf5ea"
  paid-mid: "#edf5ee"
  paid-end: "#eeeaf4"
  paid-gradient: "linear-gradient(to right, {colors.paid-start} 30%, {colors.paid-mid} 65%, {colors.paid-end})"
  paid-text: "#0f7c4a"
  thumb: "#ffffff"
  on-thumb: "#1a1a1a"
  mark: "#1a1a1a"
  hero-mat: "#0f7c4a"
  hero-grid-minor: "rgb(255 255 255 / 0.09)"
  hero-grid-major: "rgb(255 255 255 / 0.2)"
  hero-muted: "#ffffff"
  hero-button-text: "#0f7c4a"
  surface-dark: "#000000"
  surface-muted-dark: "#16181d"
  surface-strong-dark: "#1f222a"
  line-dark: "#2a3037"
  text-dark: "#ffffff"
  text-muted-dark: "#a3aab5"
  accent-dark: "#129357"
  accent-soft-dark: "#123625"
  on-accent-dark: "#000000"
  like-dark: "#f47c97"
  like-soft-dark: "#341520"
  paid-start-dark: "#123625"
  paid-mid-dark: "#1a2a26"
  paid-end-dark: "#241f36"
  paid-text-dark: "#ffffff"
  thumb-dark: "#ffffff"
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
    backgroundColor: "{colors.hero-mat}"
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

구조와 밀도는 uibowl 갤러리 문법을 따른다. 한 줄 헤더, 전체 폭 순환 배너(소개 → 진행 흐름)(고침 #60: 배너 옆 순위 패널을 없앰), 알약 칩, 16px 모서리의 썸네일 카드, 굵은 Wanted Sans 제목. 라이트 모드는 흰 교정지 위에 진한 초록 재단 매트 배너를 놓는다. 먹색 글씨와 초록 강조를 쓰고, 흰 면은 1px 재단선으로 구분한다. 히어로에는 네 모서리 재단선이, 지급 완료한 참여에는 초록 교정 도장이 찍힌다. 다크 모드는 uibowl 바탕(검정, 남회색 패널)을 유지하고 강조색은 다크에서 읽히는 초록으로 밝힌다. (고침 #60: B 색 시안 확정)

화면은 평평하다. 라이트에서는 흰 페이지와 패널을 얇은 선으로 나누고, 칩은 옅은 중성색으로 구분한다. 썸네일은 가짜 스크린샷 대신 서비스 이름을 교정지 위에 크게 앉힌 활자 썸네일이고, 이름 자체가 그림이다.

**Key Characteristics:**
- 라이트 흰 교정지·진한 초록 재단 매트 / 다크 uibowl, `prefers-color-scheme`로만 전환
- 강조색 하나, 쓰는 자리가 정해져 있다
- 그림자 없는 평면, 흰 면은 1px 재단선으로 나눈다
- 알약(완전 둥근) 조작 요소 + 16px 둥근 면
- 활자 썸네일과 히어로 재단선이 이 세계의 고유 장치

## Colors

흰 교정지와 먹, 진한 초록 하나로 된 팔레트이며, 다크에서는 uibowl 바탕 위에 밝힌 초록이 같은 역할을 맡는다. 모든 값은 `app/globals.css`의 CSS 변수에만 있고, `-dark` 키는 `prefers-color-scheme: dark`에서 같은 이름의 변수를 덮어쓴 값이다(컴포넌트는 `-dark`를 따로 부르지 않는다).

### Primary
- **진한 초록 (라이트 / 다크)** (accent, accent-dark): 라이트에서는 재단 매트 바탕, 주 행동 버튼, 추가 보상 배지, 교정 도장, 진행 흐름 마지막 체크에 같은 초록(`brand-green` `#0f7c4a`)을 쓴다. 로고의 'moa'와 파비콘 바탕만 한 단계 밝은 `brand-logo` `#129357`이다. 포커스 링, 선택, 캐럿, 오늘 온 대화의 일시와 채팅방의 내 말풍선에도 쓴다. 진한 매트 위 글씨와 주 버튼만 흰색으로 뒤집는다. 다크에서는 기존의 밝힌 초록을 쓴다. (고침 #60: 한 초록과 매트 위 흰색 예외)
- **연한 에메랄드** (accent-soft): 모바일 메뉴 현재 항목, 열린 더보기 버튼의 바탕. 강조색 글씨·아이콘 아래에만 깐다.
- **추가 보상 배지** (accent / on-accent): 모집 카드와 참여 목록 모두 강조색 바탕에 강조 위 글씨(`Badge`의 `accentSolid`). 썸네일(`data-thumb`) 위에 올라가므로 다크에서도 교정지 초록(`#0f7c4a`)에 흰 글씨를 쓴다. 대비 5.25:1.
- **교정지 위 강조** (paper-accent): 밝은 교정지 위 체크·도장은 두 모드 모두 진한 초록 `#0f7c4a`. 다크의 밝은 종이에서도 대비를 유지한다.
- **강조 위 글씨** (on-accent): 주 버튼, 선택 영역, 내 말풍선, 추가 보상 배지의 글씨. 라이트는 흰색, 다크는 검정. 단 교정지·썸네일 위(`.hero-paper`, `data-thumb`)는 다크에서도 흰색이다.

### Neutral
- **흰 바탕** (surface): 페이지 바탕과 헤더.
- **교정지** (surface-muted): 카드, 빈 상태, 푸터, 검색창 포커스 면, 채팅 카드, 상대 말풍선, 메시지 입력창. 둥근 패널은 라이트에서 1px 안쪽 재단선으로 구분한다.
- **칩 중성색** (surface-strong): 보조 버튼, 칩, 검색창, 현재 탭, 행 hover, 스켈레톤.
- **카드 중성색** (surface-card): 모집 카드의 바깥 면. 라이트는 옅은 중성색으로 흰 페이지와 구분하고, 다크는 기존 패널색을 쓴다. 초록 강조색을 일반 카드 바탕에 쓰지 않는다.
- **재단 회색** (line): 헤더 아래 선, 썸네일 테두리, 보조 버튼·칩 hover 면, 스크롤바, 채팅방 날짜 구분선, 개발자 역할 배지 테두리.
- **먹** (text): 본문과 제목, 활성 칩의 바탕.
- **흐린 먹** (text-muted): 설명, 메타 정보, 비활성 탭과 정렬, 플레이스홀더.
- **썸네일 면 / 썸네일 글씨** (thumb, on-thumb): 활자 썸네일 전용. 다크에서도 흰 면을 유지해 교정지처럼 보인다.
- **재단선 먹** (mark): 히어로의 재단선.

### Tertiary
- **유용해요 분홍 / 빨강** (like-soft, like): 피드백 "유용해요"를 누른 상태(`Button`의 `like`)에만 쓴다. 라이트는 연한 분홍 `#fde8ed` 위 빨강 `#c4264a`(대비 4.82:1), 다크는 남회색 패널에서 튀지 않게 어두운 장미색 `#341520` 위 밝힌 분홍 `#f47c97`(대비 6.42:1). 위험·오류 색으로 쓰지 않는다. (#134)
- **유료 기능 그라데이션** (paid-start, paid-mid, paid-end, paid-gradient, paid-text): 유료 기능으로 이어지는 면의 바탕. 그라데이션 전체는 `--paid-gradient` 토큰 하나이고 `bg-paid-gradient` 유틸리티로 쓴다. 지금은 피드백의 채팅하기·AI 질문 받기 버튼(`Button`의 `paid`)이 쓰고, 구독 화면 같은 다른 유료 기능 컴포넌트도 같은 유틸리티를 가져다 쓴다. 라이트는 시안 색 그대로 민트 `#ddf5ea`(30%까지) → 65% `#edf5ee` → 라벤더 `#eeeaf4`이고, 초록 쪽 비중을 늘리려고 민트를 30%까지 그대로 둔다(sRGB로 섞음), 다크는 같은 흐름을 낮춘 `#123625` → `#1a2a26` → `#241f36`이다. 위 글씨(`paid-text`)는 라이트에서 강조색(글씨 아래 대비 4.51:1 이상), 다크에서 흰색이다. (#134)

### Named Rules
**The Token-Only Rule.** 색·모션 값은 `globals.css` 토큰에서만 정의한다. `components`, `features`에는 hex도, 임의 px도 쓰지 않는다.

**The One Green Rule.** 라이트에서 재단 매트와 강조색은 같은 초록이다. 초록 강조는 주 행동, 로고의 moa, 추가 보상, 교정 도장과 진행 흐름 마지막 체크, 새로 생긴 것(채팅함의 오늘 온 대화), 그리고 포커스·선택·hover 같은 상호작용 상태에만 쓴다. 고른 필터 칩은 먹색으로 구분한다. 카테고리나 일반 링크, 카드·메시지마다 반복되는 정보에는 강조색을 쓰지 않는다. 매트 위의 주 버튼과 제목은 흰색으로 뒤집고, 교정지 안의 강조는 같은 초록을 쓴다. 채팅방의 내 말풍선은 내가 보낸 말을 구분하려고 초록을 쓴다. 한 화면에 주 버튼은 하나.


## Typography

**Display Font:** Wanted Sans Variable (with system-ui, sans-serif)
**Body Font:** Wanted Sans Variable (with system-ui, sans-serif)

**Character:** 가변 굵기(400~1000) 한 서체로 전부 해결한다. 제목은 800 굵기에 음수 자간으로 단단하게 조이고, 본문은 기본 굵기로 둔다. `next/font/local`로 자체 호스팅하며 `word-break: keep-all`로 한국어 어절을 지킨다.

### Hierarchy
- **Display** (800, 1024px 이상 3rem / 그보다 좁으면 1.5rem, 자간 -0.035em): 홈 배너 진행 흐름 제목 "이렇게 진행돼요".
- **Hero** (800, 768px 미만 화면 폭의 9%(최소 1.75rem·최대 3rem) / 768px 3rem / 1024px 3.25rem / 1280px 4rem, 행간 1.05, 자간 -0.04em): 홈 배너 첫 장 제목 "써 보고, 남기고, 받고" 전용. 어느 폭에서도 한 줄이다. 글 칸은 이 한 줄 폭(max-content)에 맞추고, 제목·설명은 배너 안쪽 맨 위에, 버튼은 맨 아래에 붙인다. (고침 #60)
- **Thumb Name** (800, 15cqw, 행간 1.02, 자간 -0.04em): 활자 썸네일의 서비스 이름. 컨테이너 쿼리 단위라 카드 폭에 비례한다.
- **Headline** (800, 1.5rem, 자간 -0.03em): '이런 테스트도 있어요', '전체 테스트' 같은 섹션 제목.
- **Title** (800, 1.125rem): 패널·대화상자 제목.
- **Body Lead** (400, 1.125rem, 최대 폭 36rem): 히어로 설명 문단, 흐린 먹색.
- **Body** (400~600, 0.875rem): 카드 요청 문구(600), 메타 정보, 칩과 버튼(작은 크기).
- **Label** (0.75rem): 카드의 '모집 마감', '인원' 같은 항목 이름, D-day.

로고 글자 'test moa'는 1.5rem, 800, 자간 -0.04em이고, 'moa'만 `brand-logo`(#129357)이다. 파비콘은 같은 색 둥근 사각형(8px 모서리)에 흰 'm' 한 글자(Wanted Sans ExtraBold 글자 모양을 선으로 바꾼 SVG)다. 'moa' 세 글자는 16px 탭 아이콘에서 3px 높이라 읽히지 않아 'm'만 쓴다. 공유 이미지 맨 위 로고 줄도 같은 모양이다. (고침 #60: 전부 먹색 글자 로고와 'M' 선 파비콘에서 바꿈) 숫자(날짜, 인원, 순위, 슬라이드 번호)는 항상 `tabular-nums`.

### Named Rules
**The Weight-Not-Paint Rule.** 강조는 굵기와 크기로만 한다. 그라데이션 글자는 쓰지 않는다.

**The No-Kicker Rule.** 제목 위에 작은 머리말(kicker, eyebrow)을 두지 않는다. 섹션 제목 아래 한 줄 설명은 허용한다.

**The Scale Rule.** 크기와 간격은 `app/globals.css`의 토큰(`--space-*`·`--text-*`·`--radius-*`)에서 고른다. 간격은 4px 단계다. 예외는 위 표의 자간 값과 썸네일의 cqw 크기뿐이다.

## Layout

페이지는 `Container` 하나로 감싼다. 최대 폭 1536px(screen-2xl), 좌우 여백 모바일 16px, md 이상 40px. 홈의 섹션 사이는 80px, 섹션 제목과 내용 사이는 24px.

첫 화면은 전체 폭 히어로 배너 하나다 (고침 #60: 배너 2칸 + 순위 패널 1칸 그리드에서 바꿈).

모집 카드 그리드는 두 가지다. 전체 테스트는 375px 미만에서 1열, 그 이상에서 2열, lg 이상에서 4열이다. 가로·세로 간격은 16px이고 한 페이지 20개다. 구독 모집은 md 미만에서 카드 폭 72%의 스냅 띠, md 이상에서 3열이다. 전체·구독 카드의 이미지 비율은 모두 16:10이다. (고침 #60: 4열과 이미지 비율 확정)

헤더는 sticky 한 줄이다. xl 이상은 로고·탭·검색·계정이 한 줄, md~xl은 탭이 두 번째 줄로 내려가고, md 미만은 검색과 탭이 전체 화면 메뉴로 들어간다.

채팅함·채팅방처럼 한 가지에 집중하는 페이지는 본문을 가운데 최대 폭 768px(max-w-3xl) 한 열로 둔다. 채팅방은 페이지 전체가 스크롤되고 메시지 입력창 띠만 화면 아래에 붙는다(sticky). 대화를 높이가 정해진 상자 안에서 따로 스크롤하지 않아서, 모바일에서 스크롤이 겹치지 않고 가상 키보드가 올라오면 입력창도 따라 올라온다. 채팅방에는 사이트 푸터가 없다(채팅함에는 있다). 푸터를 빼는 페이지는 `HideFooter`를 두고, 그 화면이 보이는 동안만 푸터를 숨기며 본문(main)을 세로 flex로 바꾼다. 떠난 화면은 숨겨진 채(Activity) 문서에 남으므로, 표시를 찾는 `:has()`로 푸터를 제어하지 않는다. 채팅방은 그 높이를 채워서 대화가 짧아도 입력창이 화면 아래에 있다.

겹침 순서는 토큰으로만 쓴다: `--z-popover`(20, 카드 위 더보기 메뉴), `--z-menu`(30), `--z-header`(40), `--z-skip`(50). 메뉴는 다음 카드 위에 오되 sticky 헤더 아래로 지나간다.

## Elevation & Depth

바깥 그림자는 없다. 라이트의 흰 바탕과 흰 교정지 패널은 1px 안쪽 재단선으로 구분하고, 칩은 옅은 중성색 면으로 구분한다. 재단 매트의 격자는 가로·세로 1px 선일 뿐 색면 그라데이션이 아니다. 반투명 면은 모바일 메뉴와 대화상자 뒤 배경에 쓴다.

### Named Rules
**The Flat Sheet Rule.** 면은 바깥 그림자 없이 평평하다. 라이트의 둥근 흰 패널은 1px 안쪽 선으로 나눈다. 모집 카드는 hover 때 전체가 4px 위로 움직이고, 채팅 카드 이미지는 105%로 살짝 커진다.

## Shapes
두 가지 형태 언어를 쓴다. 누르는 것(버튼, 칩, 탭, 검색창, 아이콘 버튼)은 완전 둥근 알약(9999px), 담는 것(배너, 패널, 썸네일, 빈 상태, 채팅 카드, 말풍선, 메시지 입력창)은 16px 둥근 면. 메시지 입력창은 여러 줄로 늘어나서 검색창 같은 알약 대신 담는 면 모서리를 쓴다. 그 사이 값은 작은 요소에만 쓴다: 더보기 메뉴 면·채팅방 머리 이미지 12px, 모바일 메뉴 버튼·항목, 더보기 메뉴 항목과 스켈레톤 8px, 말풍선 꼬리 모서리 6px.

재단선은 이 세계의 고유 형태다. 히어로에는 네 모서리 16px 재단선(라이트는 흰색, 다크는 기존 mark)이 있고, 활자 썸네일에는 재단선을 넣지 않는다. 교정 도장은 두 줄 테두리의 둥근 사각형으로, 썸네일 오른쪽 위에 폭 30%(최소 4.5rem), -8° 기울여 이름과 겹치지 않게 찍는다. 참여 목록처럼 썸네일 오른쪽 위에 추가 보상 배지가 있으면 도장은 오른쪽 가운데(폭 42%, -12°)에 이름 위로 겹쳐 찍는다. 썸네일 왼쪽 위에는 소프트웨어 유형 배지(테두리만 있는 알약, 하나만)를 둔다. 추가 보상은 카드 글줄의 기본 보상 옆 옅은 초록 배지("추가 보상")다.

### Named Rules
**The Money Field Rule.** 금액·계좌를 입력하는 폼(출금 신청, 앞으로의 구독 결제)은 알약 대신 12px 모서리를 쓴다. 폼 안의 입력란, 선택 상자, 버튼을 모두 같은 모서리·높이(48px)로 맞추고, 버튼은 `shape="field"`로 고른다. 선택 상자는 `.select-field`(globals.css)를 붙여, 지원 브라우저에서 펼친 목록을 칸 바로 아래에 같은 너비·12px 모서리로 맞춘다. 숫자를 다루는 곳에서 가벼운 인상을 줄이기 위해서다. 폼 밖의 버튼·칩·검색창은 알약을 유지한다.

**The Proof Mark Rule.** 네 모서리 재단선(`ProofMarks`)은 히어로에만 둔다. 모집 활자 썸네일에는 재단선이 없다 (고침 #60).

## Components

### Buttons
- **Shape:** 완전 둥근 알약(9999px), 굵기 700.
- **Primary:** 강조색 바탕, on-accent 글씨. 진한 라이트 매트 안에서는 흰 바탕과 진한 초록 글씨로 뒤집는다. 보통 12px 20px / 1rem, 작은 크기 8px 16px / 0.875rem. 한 화면 한 개.
- **Hover / Active:** primary는 불투명도 90%, secondary는 칩 회색 → 재단 회색, ghost는 투명 → 칩 회색. 누르면 98%로 줄어든다. 전환은 300ms `--ease`.
- **Secondary:** 칩 회색 바탕, 먹 글씨. '자세히 보기', 헤더의 크레딧 잔액.
- **Ghost:** 바탕 없음. 로그인, 내 정보, 슬라이드 이전·다음, 대화상자의 취소.
- **Strong:** 먹 바탕, 작업대 글씨, hover 때 불투명도 90%. 대화방 삭제 확인처럼 되돌리기 어려운 무거운 행동에 쓴다. 위험 색(빨강)이 없어서 강조색 대신 먹을 쓴다.
- **Paid:** 유료 기능 그라데이션(`bg-paid-gradient`) 바탕, 유료 기능 글씨(라이트 강조색, 다크 흰색), hover 때 불투명도 80%. 유료 기능으로 이어지는 버튼(피드백의 채팅하기·AI 질문 받기)에 쓴다. 피드백 카드의 버튼 4개는 다크에서 흰 글씨가 무거워 보여 굵기를 400으로 낮춘다(`dark:font-normal`). (#134)
- **Like:** 유용해요 분홍 바탕, 빨강 글씨. 피드백 "유용해요"를 누른 상태에만 쓰고, 누르지 않았으면 secondary다. (#134)
- `Button`과 `LinkButton`은 같은 `buttonClass`를 쓴다. 새 버튼 스타일을 만들지 말고 variant를 고른다.

### Chips
- **Style:** 칩 회색 알약, 8px 16px, 0.875rem 700.
- **State:** 선택되면 먹 바탕 + 흰 글씨로 반전(`aria-pressed`). 강조색을 쓰지 않는다. 정렬은 선택 상자를 쓴다.

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** 일반 패널은 흰 교정지(surface-muted), 모집 카드는 옅은 중성색(surface-card)을 쓴다. 패널 안쪽 여백 24px(md 32px), 히어로 32px(md 48px), 빈 상태 32px.
- **Shadow Strategy:** 바깥 그림자 없음. 라이트의 흰 둥근 패널에는 1px 안쪽 선.
- **Border:** 흰 면과 흰 페이지를 재단선으로 구분한다.

### Inputs / Fields
- **Style:** 칩 회색 알약 검색창, 돋보기 아이콘(흐린 먹), 테두리 없음. 헤더용은 10px 16px / 0.875rem, 그리드용은 12px 20px / 1rem.
- **Focus:** 바탕이 교정지로 밝아지고 2px 강조색 링이 생긴다.

### Navigation
- **Style:** 알약 탭, 600 굵기. 현재 탭은 칩 회색 바탕 + 먹 글씨, 나머지는 흐린 먹이고 hover 때 먹.
- **Mobile:** 두 줄 햄버거가 X로 회전하는 10×10 버튼. 메뉴는 전체 화면 반투명 면에 검색창과 큰(1.25rem) 항목, 항목은 60ms 간격으로 떠오른다. 현재 항목은 연한 강조 바탕 + 강조 글씨.

### 모집 카드와 활자 썸네일
대표 이미지는 카드 너비를 여백 없이 채우고, 전체·구독 카드 모두 16:10 비율이다. 이미지의 위 모서리는 카드의 16px 모서리를 따르고, 본문에만 12px(sm 이상 16px) 안쪽 여백을 둔다.
이미지 왼쪽 위에 유형과 추가 보상 배지를 나란히 둔다. 본문은 프로젝트명 h3, 요청 문구, 구분선, 마감 날짜·인원 수치 순서다. 날짜 앞에는 짧게 "마감"을 표시하고, 인원 라벨은 보조 기술에만 남긴다. 크레딧 금액은 표시하지 않는다. 기본 이미지 자산은 후속 PR에서 연결하며 그전에는 중성색 면과 이미지 아이콘을 쓴다. 카드 전체는 1px 재단선과 옅은 중성색 면으로 묶이고 hover 때 4px 올라간다.

### 교정 도장 (ProofStamp)
모집 카드의 완료 도장은 이미지 오른쪽 아래에 폭 45%(최소 6rem), -8° 회전으로 둔다. 밝은 교정지색을 채우고 두 줄 테두리와 글씨는 두 모드 모두 paper-accent를 쓴다. 이 도장은 normal 합성이고 완료 이미지 불투명도는 25%다. 참여 내역과 배너의 기존 도장 크기·위치는 유지한다. 상태 표시에만 쓰고 장식으로 찍지 않는다.

### 순환 배너 (Carousel)
슬라이드를 한 칸에 겹쳐 가장 긴 슬라이드 높이에 맞춘다. 5초 간격, hover·focus·reduced motion이면 멈춘다. 새 슬라이드는 8px 아래에서 500ms에 떠오른다. 조작부(이전, n / 전체, 다음)는 md 이상에서 오른쪽 아래. 슬라이드 이름은 보여 주지 않는다 (고침 #60).

### 홈 배너 (HeroBanner)
1번 배너의 기울어진 카드에는 대표 이미지와 아래쪽 밝은 이름 띠를 표시한다. 카테고리 배지는 없다. 이미지가 없으면 기본 이미지 자리를 표시하며 프로젝트명은 항상 남긴다. 2번 배너의 밝은 교정지 위 체크·지급 도장은 다크에서도 paper-accent를 쓴다.
전체 폭 재단 매트에 두 장. 라이트는 #0f7c4a 바탕에 흰 격자(24px 잔눈금 9%, 120px 굵은 눈금 20%)를 깔고, 제목·주 버튼은 흰색으로 뒤집는다. 배너 안의 흰 교정지에서는 먹색과 같은 진한 초록을 쓴다. 다크는 기존 남회색 면과 MatGrid를 유지하고, 주 버튼만 교정지·썸네일과 같은 진한 초록(#0f7c4a)에 흰 글씨로 둔다(제목의 초록 글자는 남회색 위에서 읽히게 #129357). 높이는 화면 폭에 따라 30rem·20rem·22rem이고 글자가 커지면 늘어난다. 첫 장에는 최근 모집 글을 기울인 교정지 더미로 놓고, 둘째 장에는 교정 체크리스트와 보상 약속을 둔다. 마지막 줄만 진한 초록 체크와 크레딧 지급 도장을 쓴다. (고침 #60: B 색 시안)

### 아이콘 버튼
글자 없이 아이콘 하나만 있는 36px 원형 버튼. 평소에는 바탕 없이 흐린 먹 아이콘(Phosphor bold 20px), hover 때 칩 회색 바탕 + 먹 아이콘, 열린 상태(`aria-expanded`)에서는 연한 강조 바탕 + 강조 아이콘. 이름은 `aria-label`로 무엇을 하는지까지 쓴다("북로그 채팅 더보기"). 지금은 채팅 카드의 더보기에 쓴다.

### 더보기 메뉴 (ChatCardMenu)
아이콘 버튼 아래 오른쪽 끝에 맞춰 여는 작은 면. 교정지(surface-muted) 바탕에 1px 재단 회색 테두리, 12px 모서리, 안쪽 6px. 그림자 대신 테두리로 아래 카드와 나눈다. 항목은 8px 모서리, 8px 12px, 0.875rem 600이고 hover·포커스 때 칩 회색. 열면 `rise-in`으로 떠오르고 첫 항목에 포커스가 간다. 위아래 화살표로 옮기고 Esc·Tab·바깥 클릭으로 닫는다. 겹침은 `--z-popover`. 채팅 카드에서는 "대화방 이름 변경", 1px 재단 회색 구분선, "대화방 삭제" 순서이고 되돌리기 어려운 삭제를 맨 아래에 둔다. 항목을 고르면 대화상자를 연다. 채팅방 머리에도 같은 메뉴를 두고, 거기서 삭제하면 채팅함으로 돌아간다.

### 대화상자 (ChatRoomDialog)
브라우저 기본 `<dialog>` 모달. 교정지 면(16px 모서리, 안쪽 24px, 최대 폭 24rem), 그림자 없음. 뒤 배경은 작업대 회색 80% + 약한 흐림이라 그림자 없이도 면이 떠 보인다. 위에서부터 제목(1.125rem 800), 한 줄 설명(흐린 먹 0.875rem), 내용, 오른쪽 아래 버튼(작은 크기). 열리면 `rise-in`으로 떠오르고 첫 조작 요소에 포커스가 가며, 포커스가 안에 갇히고, Esc·바깥 클릭·취소로 닫힌 뒤 연 버튼으로 포커스가 돌아온다. 이름 변경은 입력창(알약, 칩 회색, 포커스 때 작업대 바탕 + 강조색 링) + 취소(ghost)·저장(primary), 삭제 확인은 취소(ghost, 처음 포커스)·삭제(strong).

### 마감 캘린더 (DeadlineCalendar)
내 피드백 제출 마감을 표시하는 월 달력. 교정지 면 안에 달 제목(1rem 700)과 이전·다음 보조 버튼, 일요일로 시작하는 7열 표를 둔다. 마감일 칸은 강조색 없이 칩 회색 바탕(8px 모서리)에 날짜 800 굵기이고, md 이상은 서비스 이름(0.75rem 600, 넘치면 말줄임, 같은 날 여러 건이면 첫 이름과 "외 n건"), 그보다 좁으면 6px 먹색 점을 둔다. 오늘은 먹색 2px 안쪽 테두리이고 `aria-current="date"`다.

### 역할 탭 (ChatFilters)
한 목록을 두세 갈래로 나눠 보는 세그먼트 탭. 칩 회색 알약 홈(안쪽 4px) 안에 탭을 나란히 두고, 고른 탭만 교정지 면으로 올라온다(먹 글씨). 나머지 탭은 바탕 없이 흐린 먹, hover 때 먹. 탭은 0.875rem 700, 6px 16px(좁은 화면 6px 12px)이고 이름 뒤에 개수(600, tabular-nums)를 붙인다. 개수는 평소 60% 불투명도, 고른 탭에서는 강조색이다. 헤더 탭(현재 탭이 칩 회색)과 헷갈리지 않도록 홈 안에서 밝은 면이 움직이는 모양을 쓴다. 상태는 `aria-pressed`. 채팅함에서는 "전체 / 테스터 / 개발자"이고 검색창 아래 줄 왼쪽에, 정렬은 같은 줄 오른쪽에 둔다. 참여 테스트 목록의 보기 방식(리스트 / 그리드)도 같은 모양이고, 글자와 개수 없이 20px 아이콘만 둔다.

### 채팅 카드 (ChatCard)
채팅방 하나를 담는 교정지 면(16px 모서리). 왼쪽 이미지 칸 바로 옆에 선이나 그라데이션 없이 오른쪽 내용이 온다. 이미지 칸은 카드 높이를 다 채우고 폭 96px(sm 128px, md 160px). 내용은 안쪽 위아래 16px·좌우 20px(md 24px)이고, 위에서부터 [대화방 이름 … 최근 일시 0.75rem 흐린 먹 tabular-nums·더보기 아이콘 버튼], [역할 배지 + 대화 상대 닉네임], [최근 메시지 미리보기 한 줄, 흐린 먹, 행간 넉넉히, 넘치면 말줄임]. 줄 사이 6px. 글자는 모두 최근 메시지와 같은 크기(0.875rem)다. 대화방 이름만 역할 탭(`ChatFilters`의 전체·테스터·개발자)과 같은 700으로 두고, 닉네임·메시지·일시는 보통 굵기로 색만 나눈다 (대화방 이름·닉네임은 먹, 메시지·일시는 흐린 먹). 크기는 키우지 않고 굵기 한 단계로만 이름을 세운다. 대화방 이름은 회원이 바꾼 이름이 있으면 그것, 없으면 프로젝트명이다. 내 닉네임은 쓰지 않는다. 역할 배지(`ChatRoleBadge`, 6px 모서리, 0.75rem, 2px 8px)는 상대가 "개발자"인지 "테스터"인지 알린다. 카드마다 반복되므로 강조색 없이 바탕·테두리로 나눈다: 테스터는 칩 회색 바탕(`Badge` 기본), 개발자는 바탕 없이 1px 재단 회색 안쪽 테두리(`Badge`의 `outline`, 크기는 같다). 오늘 온 대화는 일시가 강조색이 되고 앞에 6px 강조색 점이 붙는다. 카드 전체가 채팅방 링크(링크의 `::after`가 카드를 덮는다)이고, 더보기 버튼은 링크 밖에 둬서 따로 누른다. 키보드 포커스는 카드 전체에 강조색 2px 테두리로 보인다. hover 때 프로젝트명이 강조색이 되고 이미지가 105%로 살짝 커진다. 더보기 메뉴가 카드 밖으로 나와야 해서 카드에 `overflow: hidden`을 쓰지 않고, 이미지 칸이 왼쪽 두 모서리를 직접 둥글린다. 목록은 카드 사이 16px, 60ms 순차 등장.

### 채팅 카드 이미지 (ChatThumb)
채팅 카드 왼쪽 이미지 칸. 프로젝트 이미지가 있으면 칸을 꽉 채우고(가운데 기준으로 잘라 채움), 이름이 바로 옆 제목에 있으니 장식으로 두고 대체 텍스트를 비운다. 선이나 그라데이션 없이 이미지 가장자리가 그대로 내용과 맞닿는다. 이미지가 없으면 썸네일 면(thumb) 위에 왼쪽 위 재단선(12px, 30%)과 프로젝트 이름 첫 글자(칸 폭의 34%, 800, 자간 -0.04em)를 앉힌 활자 썸네일로 돌아가고, hover 때 글자가 4px 올라간다. 지금은 시연용 웹·앱 화면 이미지(`public/sample/projects/*.svg`, 원본 4:3)를 쓴다. 웹 서비스는 브라우저 창, 앱은 휴대폰 화면 모양이고 실제 서비스 화면이 아니다. 실제 이미지는 API를 붙일 때 프로젝트 대표 이미지로 바꾼다. 채팅방 머리에서는 64×48px(이미지 원본과 같은 4:3), 12px 모서리의 작은 크기로 쓴다.

### 채팅방 머리 (ChatRoomHeader)
채팅방 맨 위. 왼쪽 작은 프로젝트 이미지(64×48px), 오른쪽에 대화방 이름(h1, 채팅함 제목과 같은 1.5rem 800, 자간 -0.03em, 넘치면 말줄임)과 그 아래 [역할 배지(채팅 카드와 같다) + 대화 상대 닉네임 · "북로그 모집 글" 링크(흐린 먹, hover 때 먹 + 밑줄)], 맨 오른쪽 더보기 아이콘 버튼. 내 닉네임은 쓰지 않는다. 바로 위에 "채팅함"으로 돌아가는 링크(왼쪽 화살표 + 0.875rem 600 흐린 먹, hover 때 먹 글씨와 칩 회색 알약 바탕)가 있다. 앱 헤더 높이가 화면 폭마다 달라 머리는 위에 붙이지 않고 페이지와 함께 스크롤된다.

### 대화 내용 (ChatMessageList)
`role="log"` 한 덩어리. 맨 위에 "북로그 모집 건으로 열린 1대1 대화방이에요."(0.75rem 흐린 먹, 가운데)를 두고, 날짜마다 묶는다. 날짜 구분은 h2로, 가운데 0.75rem 600 흐린 먹 글자("오늘", "어제", "10월 29일 목요일") 양옆에 1px 재단 회색 선이 이어진다. 날짜 묶음 사이 32px, 구분과 말풍선 사이 16px.
- **말풍선:** 16px 모서리, 안쪽 10px 16px, 0.875rem, 행간 넉넉히(1.625), 최대 폭 80%, 줄바꿈은 그대로 보이고 띄어쓰기 없는 긴 글자는 안에서 끊는다. 내 메시지는 오른쪽, 강조색 바탕 + 강조 위 글씨(라이트 대비 약 8:1)이고, 그 안의 글을 선택하면 선택 색을 뒤집는다. 상대 메시지는 왼쪽, 흰 교정지 바탕 + 1px 안쪽 재단선으로 구분한다.
- **묶음:** 같은 사람이 이어 보낸 말풍선은 4px로 붙고, 보낸 사람이 바뀌면 12px 띄운다. 같은 사람이 같은 분에 보낸 묶음의 마지막 말풍선만 말하는 쪽 아래 모서리가 6px이고, 그 바깥쪽(내 메시지는 왼쪽, 상대 메시지는 오른쪽)에 시각(0.75rem 흐린 먹, tabular-nums)을 붙인다. 상대 닉네임은 머리에 있으니 말풍선 위에 다시 쓰지 않는다. 보조 기술에는 말풍선 앞에 숨긴 "나:", "서재지기:"가 읽힌다.

### 메시지 입력창 (ChatComposer)
화면 아래에 붙는 작업대 바탕 띠(위 16px, 아래 16px·md 24px) 안의 교정지 면(16px 모서리, 안쪽 8px 8px 8px 20px). 면 안에 테두리 없는 입력란(0.875rem, 한 줄에서 시작해 내용만큼 늘고 최대 128px, 그 뒤로는 안에서 스크롤)과 오른쪽 40px 원형 보내기 버튼(강조색 바탕 + 강조 위 글씨, 종이비행기 아이콘 18px)이 있다. 포커스 때 면에 2px 강조색 링. 보내기는 이 화면의 주 버튼 하나이고, 앞뒤 공백을 뺀 글이 없으면 40% 불투명도로 비활성이다. md 이상에서는 면 아래에 "Enter로 보내고, Shift+Enter로 줄을 바꿔요."(0.75rem 흐린 먹). 휴대폰 같은 터치 기기에서는 Enter가 줄바꿈이고 보내기 버튼으로만 보내며, 안내도 "Enter로 줄을 바꾸고, 보내기 버튼으로 보내요."다. 한글 조합 중의 Enter는 보내지 않는다. 보내면 서버 응답 전에 내 말풍선이 60% 불투명도로 먼저 보이고 시각 대신 "보내는 중"이 붙는다. 저장된 뒤 놓일 자리에 미리 두어서, 마지막 대화가 오늘이 아니면 "오늘" 구분 아래에 보인다. 열 때와 보낸 뒤에는 가장 최근 메시지가 입력창 바로 위에 오도록 스크롤한다.

### 모집글 상세 (PublicRecruitment)
제목 아래 왼쪽에 이미지 띠와 본문, 오른쪽에 스크롤을 따라오는 요약 패널을 둔다. 좁은 화면은 이미지 → 요약 → 본문 순서다. 요약은 기본 보상·추가 보상·인원을 800 굵기로 크게(lg 1.875rem), 재단 회색 선 아래 일정과 선정 방식을 0.875rem 줄로 작게 두어 먼저 볼 숫자를 굵기와 크기로만 가른다. 추가 보상만 강조색이고, 주 버튼은 지원하기 하나다. 본문은 교정지 면 여러 장에 나누고 면 제목은 Headline을 쓴다. 모집 조건은 흐린 먹 체크 아이콘을 붙인 줄 목록, 테스트 항목은 칩 회색 원 번호와 1px 재단 회색 구분선으로 나눈다. 항목 설명은 읽기 좋게 최대 폭 65자(`max-w-prose`)와 넉넉한 행간을 쓴다.

### 이미지 띠 (RecruitmentGallery)
4:3 이미지(최대 28rem, 16px 모서리)를 가로로 잇고 스크롤바 없이 스냅으로 넘긴다. 이미지 영역 양쪽 가운데에 작업대 바탕의 40px 원형 버튼을 겹치고 면과 구분되도록 1px 재단 회색 테두리를 둔다. 끝에서는 그쪽 버튼이 흐려지고, 모두 들어가면 버튼이 없다. 프로젝트 대표 이미지는 왼쪽 위에 "대표 이미지" 배지를 얹어 항목 이미지와 구분한다.

### 항목 이미지 (TestItemImages)
4:3 칸(12px 모서리)에 이미지가 잘리지 않게 담아 2열(md 3열)로 나열한다. 오른쪽 아래의 32px 원형 돋보기와 zoom-in 커서로 누를 수 있음을 알리고, hover 때 4px 올라간다. 누르면 `<dialog>`(교정지 면, 16px 모서리, 최대 폭 64rem, 뒤 배경은 대화상자와 같다)에 이미지를 확대하고, 위 줄에 이름과 n / 전체, 닫기 버튼을 둔다. 넘기기 버튼은 이미지 띠와 같다.

### Motion
이징은 하나, `--ease`(cubic-bezier(0.22, 1, 0.36, 1)). 시간은 `--duration-300`·`--duration-500`, 애니메이션은 `--animate-*` 토큰으로 쓴다. 상태 전환 300ms, 이동 500ms, 등장 `rise-in` 500ms, 순차 등장은 60ms씩 최대 340ms. 스켈레톤은 2초 `soft-pulse`. 피드백 "유용해요"를 누르면 하트가 채워지며 500ms `heart-pop`(1.35배로 커졌다 0.9배를 거쳐 제자리)으로 한 번 튀어 오르고, 처음부터 눌려 있던 하트는 움직이지 않는다 (#134). `prefers-reduced-motion`이면 모두 1ms로 줄인다.

## Do's and Don'ts

### Do:
- **Do** 색은 `bg-surface`, `text-text-muted`, `bg-accent` 같은 토큰 유틸리티로만 쓴다. 새 색이 필요하면 `globals.css`에 라이트·다크 값을 함께 추가한다.
- **Do** 조작 요소는 알약, 담는 면은 16px로 둔다.
- **Do** 라이트의 흰 페이지와 흰 패널은 1px 안쪽 선으로 나누고, 칩은 옅은 중성색으로 구분한다.
- **Do** 모집 카드는 프로젝트 대표 이미지를 쓰고 프로젝트명은 본문에 둔다. 채팅 카드와 채팅방 머리도 프로젝트 이미지를 쓴다.
- **Do** 마감일, 인원, 보상 숫자는 `tabular-nums`로 같은 자리에 둔다.
- **Do** 모션은 `--ease`와 300/500ms만 쓰고 reduced motion을 지킨다.

### Don't:
- **Don't** `components`, `features`에 hex나 임의 px를 쓰지 않는다.
- **Don't** 제목 위에 kicker·eyebrow를 두지 않는다.
- **Don't** 그라데이션 글자를 쓰지 않는다.
- **Don't** 강조색을 주 행동, 로고의 moa, 추가 보상, 교정 도장·진행 흐름 마지막 체크, 새로 생긴 것, 상호작용 상태 밖에서 쓰지 않는다. (예외: 채팅방의 내 말풍선)
- **Don't** 시연용 프로젝트 이미지를 실제 서비스 화면으로 소개하지 않는다. 현재 목업은 기존 시연용 이미지를 사용하며 실제 API에서는 업로드한 대표 이미지를 연결한다.
- **Don't** `ProofMarks`(네 모서리 재단선)를 히어로 밖에 두지 않는다.
- **Don't** 면에 바깥 그림자를 넣지 않는다. 안쪽 1px 선은 허용한다.
- **Don't** 채팅 대화를 높이가 정해진 상자 안에서 따로 스크롤하지 않는다. 페이지가 스크롤되고 입력창 띠만 아래에 붙는다.
