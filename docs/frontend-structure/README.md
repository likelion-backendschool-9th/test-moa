# Test Moa 프론트엔드 구조 점검

프론트 앱 코드(`frontend/`)의 폴더 구조를 파일 하나하나까지 점검하고, 고칠 구조와 옮기는 순서를 정리한 문서 묶음이다. 이 구조로 옮기기로 정했다(2026-11-06, #143). 이전 범위와 검증 기준은 [4. 이전 범위](04-migration.md)에 있고, 세부 결정은 하위 이슈에 연결한다.

- 기준 코드: `origin/develop` `5db2041`(2026-11-07, #142 병합 시점). 처음에는 `084a90d`(#129) 기준으로 썼고, 그 뒤 병합된 커밋(소셜 로그인, 참여 주소 정리, 피드백 AI 후속 질문 등)을 반영해 다시 계산했다
- 기준 문서: 프로젝트가 쓰는 Next.js 16.4.3에 들어 있는 공식 문서(`frontend/node_modules/next/dist/docs/`)
- 판정 근거: 판정마다 Next 문서의 줄 번호나 [`frontend/scripts/structure/`](../../frontend/scripts/structure/)의 실행 결과를 붙였다. 근거 없이 "문제없음"이라고 쓴 곳은 없다.

## 이전 전 점검의 결론

1. **Next 규칙 위반은 없다.** 라우팅, 서버·클라이언트 경계, 서버 액션의 권한 재확인, 데이터 접근, `proxy.ts` 위치는 Next 문서와 맞는다.
2. **README의 import 규칙도 지키고 있다.** 경계 규칙 B1~B7을 ESLint로 돌리면 위반이 0건이다.
3. **문제는 "파일을 어디에 두는가" 규칙이 없다는 것이다.** `features/*/components`의 99개 가운데 88개가 한 구역 안에서만 쓰인다. `features/home`·`my`·`admin`은 도메인이 아니라 화면 이름이다. `components/layout`은 루트 레이아웃 전용인데 공용 폴더에 있고, 세션·시연·로그아웃 액션을 안다.
4. **고치는 방법은 Next가 예로 든 전략 그대로다.** 라우트 하나가 쓰는 부품은 그 라우트 폴더의 `_components`에 두고, 푸터는 경로 그룹 레이아웃이 맡게 한다. `features`에는 도메인 코드만 남기고, 시연 코드는 `demo/`에 모은다. URL은 하나도 바뀌지 않는다.

## 문서

| 문서 | 내용 |
| --- | --- |
| [1. Next 규칙](01-next-rules.md) | Next 문서가 정한 것(N1~N15)과 정하지 않은 것. 줄 번호 인용과 지금 코드의 상태 |
| [2. 점검 결과](02-audit.md) | 문제 F1~F11(심각도, 근거, 원인)과 문제없는 것. 현재 상태 숫자 |
| [3. 목표 구조](03-target-structure.md) | 목표 폴더 트리, 배치 규칙 P1~P7, 레이아웃, 도메인, `demo/`, import 경계 B1~B8·R0~R6 |
| [4. 이전 범위](04-migration.md) | 이슈별 범위, 레이아웃 결정, 검증 기준 |
| [5. CSS Modules와 부품 폴더](05-css-modules.md) | #160. 스타일을 CSS Modules로 옮김, 부품 폴더(`부품.tsx`·`.module.css`·`hook.ts`·`api.ts`), 스타일 토큰, 화면 비교 검증 |
| [`frontend/scripts/structure/usage.mjs`](../../frontend/scripts/structure/usage.mjs) | 파일마다 누가 쓰는지 계산한다(동적 import 포함, TypeScript 구문 트리). `--check`로 배치 규칙을 검사한다. 위반이 있으면 종료 코드 1 |
| [`frontend/scripts/structure/eslint-boundaries.mjs`](../../frontend/scripts/structure/eslint-boundaries.mjs) | import 경계 규칙 B1~B8. `eslint.config.mjs`에 그대로 넣는다 |

처음 읽는다면 이 README → [2. 점검 결과](02-audit.md)의 "한눈에" → [3. 목표 구조](03-target-structure.md)의 트리와 배치 규칙 순서가 빠르다. 파일을 추가하거나 옮길 때는 [목표 구조](03-target-structure.md)와 배치 검사를 함께 사용한다.

## 직접 확인하는 방법

현재 구조의 검사 명령은 [프론트 README](../../frontend/README.md#확인-명령)에 있다. 이전 전 점검 결과는 `5db2041` 기준의 기록이며, 현재 검사에서는 R0~R6과 B1~B8 모두 위반이 없어야 한다.

```bash
node frontend/scripts/structure/usage.mjs frontend
node frontend/scripts/structure/usage.mjs frontend --check
node frontend/scripts/structure/usage.mjs frontend --who features/chat/components/ChatThumb.tsx
```

경계 규칙은 `frontend`에서 `npm run lint`로 실행한다. Next 문서 인용은 [1. Next 규칙](01-next-rules.md)의 줄임말 표에서 파일을 찾아 확인한다.
