# 4. 이전 범위와 검증 기준

상위 이슈 [#143](https://github.com/likelion-backendschool-9th/test-moa/issues/143)의 구조 이전 범위다. 이전 전 점검 기준은 develop `5db2041`이며, 당시 파일 229개를 조사했다. 파일별 이동표는 작업용 자료라 제거하고 최종 배치는 [목표 구조](03-target-structure.md)와 `usage.mjs`로 확인한다.

## 이전 범위

| 이슈 | 결정 |
| --- | --- |
| #144 | `src`를 제거하고 `@/`를 앱 최상위로 맞춘다. 로컬 글꼴과 OG 이미지의 문자열 경로도 함께 고친다 |
| #145 | import 경계 B1~B7을 ESLint에 연결한다 |
| #146 | 일반 화면과 채팅방을 경로 그룹으로 나누고, 본문·푸터·404를 각 레이아웃에 맞게 그린다 |
| #147 | 헤더·메뉴·계정 메뉴 등 라우트 의존 부품은 `app`에 둔다 |
| #148 | 한 라우트·구역만 쓰는 부품은 해당 `_components`로 옮긴다 |
| #149 | 시연 데이터를 `demo`로 모으고, 액션의 저장은 `api.ts`를 거친다. e2e의 시연 기록 직렬화는 helper에 모은다 |
| #150 | 회원·구독·신고·크레딧·프로젝트·모집·세션을 도메인별로 나눈다. 데이터 접근은 `api.ts`, 순수 규칙은 타입·순수 함수 파일이 맡는다 |
| #151 | 최종 배치·의존 규칙을 프론트 README에 기록하고 배치 검사를 CI에 연결한다 |

파일 이동에 따른 URL 변경은 없다. `docs/frontend/`에 남아 있는 이전 코드 위치는 과거 기능 계획의 기록이므로 일괄 수정하지 않는다. 오류 화면(`error.tsx`) 신규 작성은 이번 범위에 포함하지 않는다.

## 레이아웃에서 확인한 것

- `AppFooter`는 `SiteFooter`와 함께 `app/_components`에 둔다. 공용 폴더에 남은 `AppFooter`가 `app`의 비공개 부품을 읽으면 R2를 어긴다.
- 루트의 없는 주소 404와 채팅방 404는 `SiteFrame`으로 본문·푸터를 직접 그린다.
- `(site)` 페이지가 `notFound()`를 부를 때는 그룹 레이아웃이 남는다. 그룹 전용 `not-found.tsx`가 `NotFoundContent`만 그려 본문·푸터 중복을 막는다. Next의 구간별 계층(`02-project-structure.md:194~201`, `:211`, `not-found.md:13`, `:45`)과 #146-S4의 회귀 테스트가 근거다.
- #146-S1~#146-S4는 이동 전에 먼저 통과시킨 뒤 같은 기준으로 이동 후를 검사한다. 시나리오는 [3.8 테스트](03-target-structure.md#38-테스트)에 있다.

## 확인 명령

`frontend`에서 실행한다.

```bash
npm ci
npx next typegen
npx tsc --noEmit
npm run lint
npm run test:structure
node scripts/structure/usage.mjs . --check
npm run build
npm run test:e2e
```

`PageProps`·`LayoutProps`·`RouteContext`는 Next가 생성하는 전역 타입이다. 새 worktree에서는 타입 생성이 필요하다(Next `page.md:139~140`, `layout.md:109~110`, `route.md:120~121`). `node_modules` 링크 상태에서는 빌드가 Next 패키지를 찾지 못할 수 있으므로 각 worktree에 직접 설치한다.

배치 검사 R0~R3의 목표는 모두 0건이다. CI의 프론트 작업에서 lint 다음에 같은 검사를 실행한다. 도메인 간 순환과 `app`의 시연 직접 참조 제한은 리뷰로 함께 확인한다.

파일을 옮기면 `rg -n 'node_modules|src/|process.cwd' app components features lib demo`로 문자열 경로도 확인한다. `tsc`는 문자열 경로를 검사하지 않는다. 로컬 글꼴과 `/opengraph-image`는 빌드와 화면으로 확인한다.
