# 5. CSS Modules와 부품 폴더 (#160)

이슈: [#160](https://github.com/likelion-backendschool-9th/test-moa/issues/160)

시나리오 제목 끝의 태그가 확인 방법이다. `[테스트]`만 e2e 테스트와 1:1이고, `[테스트: 파일 번호]`는 그 테스트가 대신 확인한다. `[명령]`은 명령 한 번, `[직접]`은 사람이 화면을 보고 확인한다.

## 한눈에

- 끝나면: Tailwind가 의존성에서 빠진다. 모든 부품이 `부품/부품.tsx`·`부품.module.css` 폴더가 된다. 모든 화면의 스크린샷이 이전 전과 픽셀 단위로 같다.
- 결정 필요: 없음 (아래 "정한 것"에 기록)
- 규모: 12단계. 약 4~6일. `className`은 1,368곳, `.tsx` 파일은 146개다. PR 하나로 올린다.
- 바꾸지 않는 것: 배치 기준 P1~P7(데이터는 `features/<도메인>`, 부품은 쓰는 라우트), 라우트·레이아웃 구조, URL, 동작, 디자인.

## 정한 것 (2026-11-07)

판단 근거는 Next 16.4.3 문서다. 문서가 정하지 않은 것은 정하지 않았다고 적는다.

- **화면 비교는 배포와 같은 Linux에서 한다.**
  - 기준 커밋과 작업 브랜치를 같은 실행 안에서 차례로 빌드하고 찍어 비교한다. 기준 사진은 커밋하지 않는다.
  - 실행하는 곳은 GitHub Actions 수동 실행(`workflow_dispatch`)과 로컬의 Playwright 공식 Linux 이미지다.
  - 비교 도구는 저장소에 남긴다.
- **패널은 `components/ui/Card` 부품이 맡는다.** 공통 스타일은 공통 부품으로 빼라는 문서를 따른다(`CSS:449`).
  - 테두리를 직접 그리는 이미지 틀은 패널이 아니다. 각 부품의 모듈에 둔다. (고침 11-07: 4곳이 아니라 6곳이었다. `ProjectForm`, `RecruitmentForm`의 2곳, `TestItemImages`, `ProjectDetail`, `RecruitmentGallery`. 모두 양쪽 모드에서 자기 테두리를 그려서 Card가 필요 없다)
- **PR은 하나로 올린다.**
- **스타일이 없는 부품도 폴더로 만든다.** 문서는 전략을 하나 골라 프로젝트 전체에서 일관되게 쓰라고 하고(`구조:319`), CSS 모듈 이름도 한 규칙으로 통일하라고 한다(`CSS:448`).
- **라우트·레이아웃 구조는 그대로 둔다.**
  - 일부 경로에만 layout을 적용할 때 문서가 정한 방법은, 그 경로들을 경로 그룹에 넣고 그 그룹에 layout을 두는 것이다(`구조:383`). 지금 `(site)`가 그 그룹이고, 채팅방은 그룹 밖이다.
  - `(conversation)`에는 layout을 두지 않는다. 이유는 [3.3](03-target-structure.md#33-레이아웃이-맡는-것)에 있다. 채팅방 404의 푸터가 `<main>` 안으로 들어가기 때문이다.

## 1. Tailwind 제거 (#160-R1)

#160-R1: 프론트는 Tailwind 없이 빌드되고, 스타일은 `app/globals.css`와 부품 옆의 `.module.css`만으로 그린다.

#160-S1 정상 [명령]
- Given 모든 단계를 마친 `frontend`
- When  `npm ls tailwindcss @tailwindcss/turbopack`을 실행한다
- Then  두 패키지 모두 `(empty)`다

#160-S2 정상: 함께 쓰는 동안 [명령]
- Given Tailwind가 아직 설치돼 있고, `AccountNav`만 `AccountNav.module.css`로 옮겼다
- When  `npm run build`를 실행한다
- Then  종료 코드가 0이다
- Then  `/my` 화면의 비교 결과가 0픽셀 차이다

#160-S3 정상 [명령]
- Given 모든 단계를 마친 `frontend`
- When  `rg -n '@import "tailwindcss"|@theme|@utility|@tailwindcss' app next.config.ts package.json`을 실행한다
- Then  출력이 없다

## 2. 화면이 그대로다 (#160-R2)

#160-R2: 이전 전과 이전 후의 모든 화면이 같은 Linux 환경에서 픽셀 단위로 같다.

#160-S4 정상 [명령]
- Given 기준 커밋 `de19224`와 작업 브랜치를 같은 실행에서 찍는다. 화면은 `PAGES` 28개와 `/nope`, `/my/chats/nope`, `/admin/reports/nope`의 3개, 첫 탭이 아닌 화면 9개, 1440×900·375×812, 라이트·다크로 모두 160장이다 (고침 11-07: 탭 화면 9개를 더했다. 모집 관리의 피드백 탭이 빠져 있어 첨부 이미지 비율이 사라진 것을 놓쳤다)
- When  각 단계를 마치고 Linux 환경에서 `npm run test:visual -- --base de19224`를 실행한다
- Then  모두 차이가 0픽셀이다
- Then  종료 코드가 0이다

#160-S5 실패 [명령]
- Given 한 부품에서 `padding: var(--space-4)`를 `var(--space-3)`으로 잘못 옮겼다
- When  `npm run test:visual`을 실행한다
- Then  종료 코드가 1이다
- Then  해당 화면의 차이 이미지가 `test-results/visual/diff/`에 생긴다

#160-S6 정상: 사진에 안 잡히는 상태 [직접]
- Given 모든 단계를 마친 화면
- When  아래 목록의 상태를 이전 전 화면과 나란히 놓고 비교한다
  - 마우스를 올렸을 때(hover)와 키보드 포커스
  - 모바일 메뉴, 계정 메뉴, 채팅 카드 메뉴, 출금 모달, 후속 질문 대화상자
  - 홈 캐러셀 넘김, 피드백 "유용해요" 하트 애니메이션
  - 오류가 있는 폼 칸(`aria-invalid`), 금액 선택 상자의 펼친 목록
- Then  색·간격·모서리·애니메이션이 같다

## 3. 동작이 그대로다 (#160-R3)

#160-R3: 기존 e2e 테스트가 스타일 클래스 이름에 기대지 않고 모두 통과한다.

#160-S7 정상 [명령]
- Given e2e 테스트 4곳이 Tailwind 클래스로 요소를 찾는다
  - `admin-withdrawals.spec.ts:103`의 `.max-w-3xl`
  - `subscription-checkout.spec.ts:30-31`의 `.bg-accent`
  - `participations.spec.ts:41,54`의 `.bg-accent`
- When  이 4곳을 역할·`aria-current`·`data-*` 속성으로 찾도록 바꾼다
- Then  `rg -n 'locator\("\.|toHaveClass' e2e`의 출력이 없다
- Then  이전 전 코드에서도 `npm run test:e2e`가 통과한다

#160-S8 정상 [명령]
- Given 모든 단계를 마친 `frontend`
- When  `npm run test:e2e`를 실행한다
- Then  모든 테스트가 통과한다

## 4. 부품 폴더 (#160-R4)

#160-R4: `app/**/_components`, `components/ui`, `features/*/components`의 부품은 모두 부품 이름과 같은 폴더에 들어 있다.

폴더 모양:

```text
AccountNav/
  AccountNav.tsx          부품. 폴더 이름과 파일 이름이 같다 (PascalCase, 3.9)
  AccountNav.module.css   이 부품의 스타일 (`CSS:448`)
  hook.ts                 이 부품만 쓰는 훅. "use client" 부품에만 둔다 (#160-R7)
  api.ts                  이 부품만 쓰는 서버 연결. 필요할 때만 둔다 (#160-R7)
```

- import는 `@/app/(site)/my/(account)/_components/AccountNav/AccountNav`처럼 파일까지 쓴다. `index.ts`는 만들지 않는다.
- 한 파일이 함께 내보내는 작은 부품(`ChatRoomSkeleton` 등)은 지금처럼 그 파일에 둔다.

#160-S9 정상 [명령]
- Given 모든 단계를 마친 `frontend`
- When  `node scripts/structure/usage.mjs . --check`를 실행한다
- Then  새 검사 R4(부품 폴더)의 위반이 0건이다
  - 기준: `_components`·`components/ui`·`features/*/components` 바로 아래에 `.tsx`가 없고, 모든 `X/X.tsx`가 폴더 이름과 같다
- Then  기존 R0~R3도 0건이다

#160-S10 실패 [명령]
- Given `app/(site)/admin/_components/Foo.tsx`를 폴더 없이 만들었다
- When  같은 명령을 실행한다
- Then  종료 코드가 1이다
- Then  R4 위반으로 `Foo.tsx`가 출력된다

#160-S11 정상 [명령]
- Given 부품을 폴더로 옮겼다
- When  `npm run test:structure`를 실행한다
- Then  R4 검사의 회귀 테스트(#160-S9·#160-S10의 두 경우)가 통과한다

## 5. 스타일 값은 토큰으로 (#160-R5)

#160-R5: 모듈의 간격·글자 크기·줄 높이·모서리·색·모션은 `globals.css`의 토큰으로 쓰고, 미디어 쿼리 너비는 정해진 4개만 쓴다.

- 토큰 이름은 지금의 Tailwind 단계를 따른다. 그래야 옮기는 일이 기계적이고 값이 바뀌지 않는다.
  - 간격: `--space-4: 1rem`(`p-4`), `--space-0-5: 0.125rem`
  - 글자 크기와 줄 높이: `--text-sm: 0.875rem`, `--text-sm-leading: calc(1.25 / 0.875)`
  - 모서리: `--radius-2xl: 1rem`, `--radius-full: 2147483647px`(Tailwind `rounded-full`의 빌드 결과 값)
  - 모션: `--ease`, `--duration-300`, 애니메이션 전체 값 `--animate-rise-in` 등
  - 실제로 쓰는 값만 만든다.
- 미디어 쿼리 조건에는 CSS 변수를 쓸 수 없다. 그래서 너비는 숫자로 쓰고, 지금 Tailwind 값 네 개만 허용한다.
  - `40rem`(sm), `48rem`(md), `64rem`(lg), `80rem`(xl)
  - 컨테이너 쿼리는 `48rem`(@3xl)
  - `max-[23.4rem]`처럼 이미 따로 정한 값은 그 부품의 모듈에 주석으로 이유를 남긴다.
- 너비·격자 칸 같은 부품 고유 크기(`max-width: 36rem`, `aspect-ratio: 4 / 3`)는 토큰으로 만들지 않는다. 지금도 Tailwind 임의값(`max-w-[36rem]` 등 44개)으로 쓰는 값이다.

#160-S12 정상 [명령]
- Given 모든 단계를 마친 `frontend`
- When  `node scripts/structure/usage.mjs . --check`를 실행한다
- Then  새 검사 R5(모듈 값)의 위반이 0건이다
  - 기준: `.module.css`의 `padding`·`margin`·`gap`·`inset`·`font-size`·`line-height`·`border-radius`·`color`·`background`·`transition`·`animation` 값에 `px`·`rem`·`#`·`rgb(`가 없다 (`0`, `1px` 선 두께 제외)
  - 기준: `@media`·`@container` 조건이 허용한 너비뿐이다

#160-S21 정상: 정의 없는 변수 [명령]
- Given 모든 단계를 마친 `frontend`
- When  `node scripts/structure/usage.mjs . --check`를 실행한다
- Then  새 검사 R6(정의한 곳이 없는 CSS 변수)의 위반이 0건이다
- Then  모듈이 `var(--aspect-video)`처럼 어디에서도 정의하지 않은 변수를 읽으면 종료 코드 1과 R6 위반이 출력된다 (11-07 리뷰: Tailwind를 뺀 뒤 피드백 첨부 이미지의 `--aspect-video`가 남아 16:9 비율이 사라졌다)

#160-S13 실패 [명령]
- Given 한 모듈에 `gap: 12px`를 썼다
- When  같은 명령을 실행한다
- Then  종료 코드가 1이다
- Then  R5 위반으로 파일과 줄이 출력된다

## 6. 공통 스타일은 부품으로 (#160-R6)

#160-R6: 여러 부품이 쓰는 스타일은 클래스 문자열 파일이나 공유 `.module.css`가 아니라 부품으로 나눈다. `globals.css`에는 부품 클래스 이름에 기대는 선택자를 두지 않는다.

옮기는 대상:

| 지금 | 쓰는 곳 | 바꾼 뒤 |
| --- | --- | --- |
| `my/(account)/_components/card-styles.ts` | 마이페이지 22개 파일 | `my/(account)/_components/AccountCard/`(요약 카드), `SettingsCard/`(설정 면·구역·칸 묶음) |
| `testers/recruitments/_components/view-styles.ts` | `ParticipationList`, `ParticipationSkeleton` | 두 부품이 함께 쓰는 `ParticipationListFrame/` |
| `[roomKey]/_components/bubble.ts` | `ChatComposer`, `ChatMessageList` | `ChatBubble/`(줄·말풍선·시각), `DayDivider/` |
| `components/ui/button-styles.ts` | `Button`, `LinkButton`, `FeedbackField` | `components/ui/Button/button-class.ts`. `Button.module.css`를 읽어 클래스를 돌려준다. `<label>`처럼 버튼 모양만 필요한 곳이 계속 쓴다 |
| `globals.css`의 패널 테두리 (`bg-surface-muted`와 둥근 모서리 조합) | 패널, 이미지 틀 6곳 | 패널은 `components/ui/Card`. 마이페이지·운영자에서 같은 모양이 반복되는 패널은 `AccountCard`·`SettingsCard`·`AdminPanel`·`AdminListRow`가 Card를 감싼다. 상대 말풍선과 `ref`가 있는 대화상자 5곳도 Card다. 이미지 틀은 각 부품의 모듈 (고침 11-07: 운영자 다섯 파일과 목록 세 파일에 같은 패널 문자열이 반복돼 부품으로 묶었다) |
| `globals.css`의 `.hero-banner`·`.hero-paper`·`.hero-action`·`[data-thumb]`·`.select-field` | 홈 3개 부품, 썸네일 2개, 출금 폼 | 각 부품의 모듈로 옮긴다. 썸네일 안의 색을 바꾸는 `[data-thumb]` 변수 재정의만 `globals.css`에 남긴다. 여러 도메인의 썸네일이 같은 속성을 쓰기 때문이다. (고침 11-07: 배너가 다른 부품 안의 요소를 가리킬 때는 클래스 대신 `data-hero-paper`·`data-hero-action`을 쓴다. 모듈 클래스 이름은 다른 모듈에서 가리킬 수 없다. `.select-field`는 두 화면이 쓰는 `components/ui/SelectField`가 됐다) |
| `RecruitmentGallery`가 내보내던 `NAV_BUTTON_CLASS` | `RecruitmentGallery`, `TestItemImages` | `features/recruitment/components/GalleryNavButton/` (고침 11-07: 같은 버튼이 두 곳에 있었다. 그 뒤 `RecruitmentGallery`는 공개 모집 상세만 쓰게 되어 R1에 따라 `app/(site)/recruitments/[slug]/_components/`로 옮겼다) |
| `TextField`가 내보내던 `inputClass` | `TextField`, `FeedbackField`, `FeedbackList` | `TextField.tsx`가 함께 내보내는 `TextInput`·`TextArea` (고침 11-07) |

- `Card`는 면만 정한다: 바탕, 모서리(`radius`: `2xl`·`xl`·`lg`), 라이트 모드 1px 테두리, 포커스 링. 태그는 `as`로 고른다(지금 `div`·`section`·`p`·`ul`·`li`·`dl`·`details`·`article`).
- 부품을 쓰는 쪽이 넘기는 `className`은 그 부품이 정하지 않는 속성만 정한다. (고침 11-07: 옮기기 전 코드에는 같은 속성을 덮어쓰는 곳이 있었다. Tailwind에서는 빌드 순서가, 모듈에서는 부르는 쪽이 이겨서 결과가 달라진다. 각 겹침의 원래 승자를 기준 빌드의 순서로 판정해, 원래 부품이 이겨 효과가 없던 부르는 쪽 선언 20개를 지웠다. 예: 배지의 `font-bold`, 스켈레톤의 모서리, 출금 폼 "전액" 버튼의 `py-0`. 의도와 다르게 보이던 곳이라 디자인 확인이 필요하다)
- 부르는 쪽이 이겨야 하는 부품의 기본값은 `:where()`로 우선순위를 0으로 둔다. (고침 11-07 리뷰: `Skeleton`의 모서리도 같다. 원래 부르는 쪽이 이기던 6곳이 import 순서로만 이기고 있었다. 고침 11-07: `SelectField`. 처음에는 원래처럼 `@layer components`에 넣었지만, 빌드 결과에 레이어 순서 선언이 남지 않아 모듈 CSS가 먼저 실리면 기본 리셋이 이겼다)
- 다른 모듈의 요소를 가리키는 `group-hover` 같은 규칙은 `data-*` 속성을 쓴다(`ChatCard`의 `data-hover-card`). (고침 11-07) `Card`라면 안쪽 여백, 배치, 격자 위치 같은 것이다. 부품이 정한 속성을 덮어쓰지 않는다. 같은 선택자 강도에서는 import 순서가 이기는 쪽을 정하는데(`CSS:402-404`), 이 순서가 개발 서버와 빌드에서 다를 수 있기 때문이다(`CSS:458`).

#160-S14 정상 [명령]
- Given 모든 단계를 마친 `frontend`
- When  `rg -l 'card-styles|view-styles|/bubble"|button-styles' app components features`를 실행한다
- Then  출력이 없다

#160-S15 정상 [명령]
- Given 모든 단계를 마친 `frontend`
- When  `rg -n '\.(bg|rounded|text|p|px|py|flex|grid)-' app/globals.css`를 실행한다
- Then  출력이 없다

#160-S16 정상: 라이트 패널 테두리와 포커스 링 [테스트: visual #160-S4]
- Given 라이트 모드의 `/my`
- Then  요약 카드에 1px `--line` 테두리가 있다. 비교 사진이 0픽셀 차이다
- Then  다크 모드에서는 테두리가 없다

## 7. 훅과 부품 `api.ts` (#160-R7)

#160-R7: 훅은 그것을 쓰는 부품 폴더의 `hook.ts`에 둔다. 부품 폴더의 `api.ts`는 도메인 데이터 접근(`features/*/api.ts`)을 거치는 얇은 서버 연결만 맡는다.

- **`hook.ts`**
  - `"use client"` 부품 폴더에만 둔다. 서버 부품은 훅을 쓸 수 없다.
  - 두 부품 이상이 쓰는 훅은 배치 규칙 P4~P6을 그대로 따른다.
    - 한 구역 안에서 함께 쓰면 그 구역의 `_lib/`
    - 여러 구역이 쓰고 도메인을 알면 `features/<도메인>/`
    - 도메인을 모르면 `lib/`
- **부품 `api.ts`**
  - `import "server-only"`로 시작한다.
  - 데이터는 `features/*/api.ts`와 `features/*/actions.ts`만 거친다. `demo/`와 `lib/backend*`를 직접 부르지 않고, 권한 확인을 따로 하지 않는다.
  - Next는 데이터 접근 방식을 하나로 정하고 섞지 말라고 한다(`보안:27`). 데이터 접근 계층은 한곳에 모은다(`보안:58-66`).
  - 지금 코드에는 여기로 옮길 내용이 없다. 규칙만 정하고 파일은 필요할 때 만든다.

옮기는 대상:

| 지금 | 바꾼 뒤 | 이유 |
| --- | --- | --- |
| `ChatComposer.tsx`의 `useTouchInput` | `ChatComposer/hook.ts` | 그 부품만 쓴다 |
| `Carousel.tsx`의 `usePrefersReducedMotion`·`useHydrated` | `components/ui/Carousel/hook.ts` | 그 부품만 쓴다 |
| `ProjectForm.tsx`가 내보내는 `useFocusFirstError` | `app/(site)/developer/_lib/focus-first-error.ts` | `ProjectForm`·`RecruitmentForm`, 같은 구역의 두 부품이 쓴다 |
| `ProjectForm.tsx`가 내보내는 `FileField`·`revoke` | `developer/_components/FileField/` | 두 폼이 함께 쓰는 부품이다 |
| `app/_components/nav.ts` | `app/_lib/nav.ts` | 부품이 아닌 순수 함수다(`구조:99-100`) |
| `features/chat/inbox-href.ts` | 그대로 | 채팅함과 채팅방, 두 구역이 쓰고 채팅 주소를 안다. P6의 도메인 위치가 맞다 |

#160-S17 정상 [명령]
- Given 모든 단계를 마친 `frontend`
- When  `npm run lint`를 실행한다
- Then  새 경계 B8의 위반이 0건이다
  - B8: `**/_components/**/api.ts`·`components/**/api.ts`가 `demo`·`lib/backend*`를 import하지 않는다
- Then  B1~B7도 0건이다

#160-S18 실패 [명령]
- Given 한 부품 폴더의 `api.ts`가 `@/demo/chat`을 import한다
- When  `npm run lint`를 실행한다
- Then  종료 코드가 1이고 B8 위반이 출력된다

#160-S19 정상 [명령]
- Given 모든 단계를 마친 `frontend`
- When  `rg -n '^(export )?function use[A-Z]' app components features --glob '!**/hook.ts' --glob '!**/_lib/**'`를 실행한다 (고침 11-07: `use[A-Z]`. `usersHref`처럼 `use`로 시작하는 일반 함수가 걸렸다)
- Then  `features/chat/inbox-href.ts`만 나온다

## 8. 문서와 규칙 (#160-R8)

#160-R8: 스타일 규칙과 배치 규칙 문서가 CSS Modules와 부품 폴더 기준으로 바뀐다.

고칠 곳:

- `docs/frontend-structure/03-target-structure.md` 3.8의 `e2e/pages.spec.ts`의 `PAGES` → `e2e/pages.ts` (고침 11-07: 1단계에서 옮김)
- `frontend/README.md`: 첫 줄의 기술 목록, 폴더 구조, "레이아웃과 서버 경계"의 Tailwind 규칙, 확인 명령에 `test:visual` 추가
- `docs/frontend-structure/03-target-structure.md`
  - 3.1 트리
  - 3.2 배치 규칙: P7에 공유 훅 추가
  - 3.6에 B8·R4·R5 추가
  - 3.9의 "Tailwind 규칙"
- `docs/frontend-structure/README.md`의 문서 표
- `frontend/DESIGN.md`의 The Scale Rule(348줄): "Tailwind 기본 스케일"을 토큰 이름으로
- `docs/design-tokens.html`
- `frontend/.impeccable/design.json`

`docs/frontend/`의 과거 기능 계획에 남은 Tailwind 클래스 이름은 고치지 않는다(4번 문서와 같은 기준).

#160-S20 정상 [명령]
- Given 모든 단계를 마친 저장소
- When  `git grep -il tailwind -- ':!frontend/package-lock.json' ':!docs/frontend/'`를 실행한다
- Then  이 문서(`05-css-modules.md`)만 나온다 (확인 11-07)

## 범위 밖

- 디자인 변경. 값과 모양은 그대로 옮긴다.
- 배치 기준 P1~P7과 도메인 구조. 이번에 바꾸는 것은 부품 안쪽의 구성이다.
- `error.tsx`·`loading.tsx` 새로 만들기
- `features/chat/query.ts`와 `features/*/paths.ts`의 주소 함수 이름 정리 (별도 이슈)
- `lib/cn.ts`. Tailwind와 관계없는 클래스 이어 붙이기 함수라서 모듈 클래스를 합칠 때도 그대로 쓴다.
- 모듈 클래스 이름 다듬기. 변환 도구가 태그 이름으로 지은 이름(`box2`, `label3` 등)이 남아 있다. #160 변환에서 생긴 것이고 동작에는 영향이 없어 후속으로 정리한다 (11-07 리뷰)
- 라우트·레이아웃 구조(`(site)`·`(conversation)`, `SiteFrame`, 404 세 파일). 문서의 방법(`구조:383`)과 이미 맞는다. 채팅방 페이지는 지금처럼 `<Main>`을 직접 그린다.

## 작업 순서

각 단계를 마칠 때마다 아래 공통 확인을 돌린다. 단계별 확인에는 그 밖의 것만 적는다.

```bash
npx tsc --noEmit && npm run lint && npm run build && npm run test:visual
```

1. **화면 비교 도구** — #160-S4, #160-S5
   - 파일: `scripts/visual/compare.mjs`(빌드·서버 실행), `scripts/visual/visual.spec.ts`·`playwright.config.ts`(촬영·비교), `e2e/pages.ts`(`PAGES`를 `pages.spec.ts`에서 옮김. e2e와 비교 도구가 함께 쓴다), `package.json`(`test:visual`), `.github/workflows/frontend-visual.yml`(`workflow_dispatch`, Playwright 공식 이미지 `mcr.microsoft.com/playwright:v1.64.1-noble`)
   - 도구가 하는 일
     - `--base`로 받은 커밋을 운영체제 임시 폴더(`$TMPDIR/test-moa-visual/<커밋>`)에 worktree로 꺼낸다. 같은 커밋이면 다음 실행에서 빌드를 다시 쓴다. (고침 11-07: `frontend` 안에 두면 `tsc`·ESLint가 기준 코드까지 읽는다)
     - 기준 커밋과 지금 코드를 각각 `npm ci`·`npm run build` 하고 다른 포트로 띄워서 찍는다.
     - 같은 화면을 기준 서버와 작업 서버에서 한 테스트 안에서 연달아 찍고, Playwright의 `toMatchSnapshot`(`maxDiffPixels: 0`)으로 비교한다.
   - 사진과 차이 이미지는 `test-results/visual/`에 둔다. 이 폴더는 이미 git에서 빠져 있다. CI에서는 실행 결과물로 올린다.
   - 화면을 고정하는 조건: `reducedMotion: "reduce"`, `networkidle`과 글꼴 로드를 기다린 뒤 전체 페이지 촬영. 시각은 고정하지 않고 두 장을 연달아 찍는다. (고침 11-07: 날짜는 서버가 그리므로 `page.clock`으로는 고정되지 않는다)
   - 애니메이션·전환은 찍기 직전에 두 서버 모두 끈다. Chromium은 `--disable-gpu --disable-partial-raster --disable-skia-runtime-opts --force-color-profile=srgb --disable-lcd-text`로 띄운다. (고침 11-07: 둘 다 없으면 같은 코드끼리도 둥근 테두리 모서리에서 1~34픽셀이 실행마다 달랐다)
   - 확인: `--base de19224`로 `de19224` 자신과 비교해 124장 모두 0픽셀인지 본다. 이것으로 도구가 결정적인지 확인한다
   - 로컬에서 docker를 쓰기 전에 `docker context show`를 확인한다. 기본 컨텍스트가 원격이다
2. **e2e의 클래스 의존 제거** — #160-S7
   - 파일: `e2e/admin-withdrawals.spec.ts`, `subscription-checkout.spec.ts`, `participations.spec.ts`. 필요하면 대상 부품에 `data-*`를 더한다
   - 확인: `npm run test:e2e`
3. **가장 얇은 경로: `AccountNav` 하나** — #160-S2
   - 파일: `AccountNav/AccountNav.tsx`, `AccountNav.module.css`, `app/_lib/nav.ts`
   - 아래 가정 3개를 이 단계에서 확인한다: 모듈과 Tailwind 레이어의 순서, 모듈 안 `animation`의 keyframes 이름, `:focus-visible` 기본 규칙
4. **토큰과 기본 스타일** — #160-S12의 토큰 부분
   - 파일: `app/globals.css`
     - 간격·글자·모서리 토큰을 추가한다
     - Tailwind preflight 중 실제로 화면에 영향을 주는 리셋을 `@layer base`로 옮긴다
     - `@theme`의 색 이름은 기존 `--surface` 등을 그대로 쓴다
5. **`components/ui`** — #160-S16, `button-styles`·`Card`
   - 파일: `components/ui/*` 12개를 폴더로 만든다. `Card`에 `as`·`radius`를 더한다. 패널 52곳은 각 구역 단계에서 `Card`로 바꾼다
6. **`features/*/components`와 `app/_components`** — 썸네일·헤더·메뉴·푸터
7. **채팅방** — `bubble.ts`
   - 파일: `[roomKey]/_components/*`
   - 확인: `npx playwright test layout-structure chat-room`
8. **마이페이지와 채팅함** — `card-styles.ts`
   - 파일: `my/(account)/**`, `my/chats/**`
9. **홈, 로그인·가입, 공개 모집** — `.hero-*`
   - 파일: `(home)/**`, `(auth)/**`, `recruitments/**`
10. **참여 테스트, 개발자, 운영자** — `view-styles.ts`, `useFocusFirstError`, `FileField`
    - 파일: `testers/**`, `developer/**`, `admin/**`
11. **Tailwind 제거와 검사 추가** — #160-S1, #160-S3, #160-S8, #160-S9~S11, #160-S13~S15, #160-S17~S19
    - 파일: `package.json`, `next.config.ts`(`turbopack.rules`), `app/globals.css`(`@import`·`@theme`·`@utility`), `scripts/structure/usage.mjs`(R4·R5)과 그 테스트, `scripts/structure/eslint-boundaries.mjs`(B8)과 그 테스트
    - 확인: `npm run test:structure && node scripts/structure/usage.mjs . --check && npm run test:e2e && npm run test:visual`
12. **문서** — #160-S20
    - 파일: 8장의 목록
    - 확인: `git grep -il tailwind -- ':!frontend/package-lock.json' ':!docs/frontend/'`

6~10단계는 구역마다 같은 순서로 한다. (고침 11-07: 구역별로 나누지 않고 한 번에 했다. 옮긴 부품의 모듈은 레이어 밖이라, 아직 옮기지 않은 부르는 쪽의 Tailwind 클래스가 늘 져서 구역 사이에 화면이 달라진다. 그래서 먼저 부품 120개를 폴더로만 옮기고(빌드·e2e·화면 확인), 그다음 스타일 전체를 변환 도구로 한 번에 옮긴 뒤 화면 차이를 고쳤다)

1. 부품을 폴더로 옮긴다.
2. 클래스를 모듈로 옮긴다.
3. 그 구역의 `.tsx`에 Tailwind 클래스가 남지 않았는지 `rg -n 'className="' <구역>`으로 확인한다. 문자열 클래스는 `data-*` 등 의도한 것만 남아야 한다.
4. 비교 사진이 0픽셀인지 확인한다.

## 브랜치·커밋

- 브랜치: `feature/css-modules-colocation`. PR 하나로 올린다.
- 커밋:
  - `Test: 화면 비교 도구와 e2e의 클래스 의존을 정리한다` — 1~2단계
  - `Refactor: <구역> 부품을 폴더와 CSS Modules로 옮긴다` — 3~10단계, 구역마다 (고침 11-07: 폴더 이동 한 커밋, 스타일 이전 한 커밋. 한 부품의 변경과 부르는 곳의 변경이 같이 가야 빌드와 화면이 맞는다)
  - `Chore: Tailwind를 제거하고 부품 폴더·모듈 값 검사를 추가한다` — 11단계 (검사의 회귀 테스트는 `Test:` 커밋으로 나눈다)
  - `Docs: CSS Modules와 부품 폴더 규칙을 기록한다` — 12단계

## 가정

- CSS Modules와 Tailwind는 이전 중에 함께 동작한다. Tailwind의 스타일은 `@layer` 안에 있고 모듈 스타일은 레이어 밖에 있어서 모듈이 이긴다. (확인 11-07: 빌드 결과에 `@layer properties·theme·base·components·utilities`가 있고 모듈 규칙은 레이어 밖이다)
- 이전 중에는 `next.config.ts`의 Tailwind 규칙이 `.module.css`를 건너뛰게 한다. (고침 11-07: `"*.css"` 규칙이 `as: "*.css"`로 `.module.css`까지 전역 CSS로 바꿔서, 클래스 이름이 해시 없이 `.list`·`.link`로 나갔다. `condition: { not: { path: /\.module\.css$/ } }`를 더했다. Next `turbopack.md:217-262`. 11단계에서 규칙째 지운다)
- `globals.css`의 `@layer base`에 있는 `:focus-visible` 테두리는 레이어 밖에 있는 모듈의 `outline`에 진다. 그래서 `outline`을 쓰는 모듈(패널 등)은 포커스 링도 같은 모듈에 쓴다. 3단계와 5단계에서 확인한다.
- 모듈 안의 keyframes 이름은 지역 이름으로 바뀐다. (고침 11-07: `animation: rise-in`이 `XKv8aq_rise-in`이 되어 전역 `@keyframes rise-in`을 찾지 못했다. CSS 변수 이름은 바뀌지 않으므로, 애니메이션은 `globals.css`의 토큰 `--animate-rise-in: rise-in 500ms var(--ease) both`처럼 두고 모듈은 `animation: var(--animate-rise-in)`으로 쓴다. 출력이 `var(--animate-rise-in)` 그대로인 것을 확인했다. 색·모션 값은 `globals.css` 토큰에만 둔다는 기존 규칙과 같다)
- 시연 데이터는 쿠키와 고정 시각만 같으면 같은 화면을 그린다. 차이가 생기면 1단계에서 그 화면만 고정 조건을 더한다.
- Linux에서도 화면이 같다. (확인 11-08: 원격 Docker의 Playwright 공식 이미지 `mcr.microsoft.com/playwright:v1.64.1-noble` 컨테이너에서 `de19224`와 `b4ea227`을 비교해 160장 모두 0픽셀, 종료 코드 0. 호스트 커널은 WSL2였다. GitHub Actions의 `Frontend visual`은 수동 실행 워크플로라 기본 브랜치에 파일이 있어야 실행되므로, 병합 뒤에 쓸 수 있다)
- 화면 비교가 결정적이려면 애니메이션·전환을 끄고 Chromium을 결정적 래스터 옵션으로 띄워야 한다. (확인 11-07: 없으면 같은 코드끼리도 둥근 테두리 모서리에서 1~34픽셀이 실행마다 달랐다. 넣은 뒤 124장 × 3회가 모두 0픽셀)
- 기준과 작업 브랜치의 사진은 같은 실행 안에서 찍으므로 Linux 이미지와 Chromium 버전이 같다. 다른 실행에서 찍은 사진끼리는 비교하지 않는다.

## 참고

- 구역별 수치(2026-11-07, `de19224` 기준)
  - `className` 1,368곳, `className`이 있는 `.tsx` 146개
  - 반응형 접두사: `md` 146, `lg` 62, `sm` 29, `xl` 6, 컨테이너 `@3xl` 13
  - 임의값 44개, `z-(--…)` 5개
- Next 문서(16.4.3)
  - CSS Modules: `11-css.md:188-211`
  - 파일 이름 통일: `:448`
  - 공통 스타일은 공통 부품으로: `:449`
  - import 순서가 CSS 순서다: `:402-404`
  - 개발 서버와 빌드의 순서가 다를 수 있다: `:458`
  - 전역 CSS는 정말 전역인 것만: `:294`
  - 데이터 접근 계층: `02-guides/data-security.md:27`, `:58-66`
  - 일부 경로에만 layout 적용: `01-getting-started/02-project-structure.md:383`
  - 전략은 하나로 일관되게: `02-project-structure.md:319`
  - Turbopack의 CSS Modules는 Lightning CSS가 처리한다. `:local`·`:global`을 단독 의사 클래스로 쓰는 것은 지원하지 않는다: `03-api-reference/08-turbopack.md:96`, `:102`
- Tailwind를 빼는 것은 Next 규칙을 고치는 일이 아니라 팀이 고른 것이다. Next 문서는 부품 스타일에 Tailwind를 권한다(`11-css.md:446`). 고른 이유는 팀이 일반 CSS 파일을 더 읽기 쉽다고 봤기 때문이다(2026-11-07).
