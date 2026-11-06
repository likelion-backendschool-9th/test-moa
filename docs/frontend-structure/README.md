# Test Moa 프론트엔드 구조 점검

프론트 앱 코드(`frontend/src`, 0단계 뒤 `frontend/`)의 폴더 구조를 파일 하나하나까지 점검하고, 고칠 구조와 옮기는 순서를 정리한 문서 묶음이다. 이 구조로 옮기기로 정했다(2026-11-06, #143). 옮기는 작업은 [4. 옮기는 순서](04-migration.md)를 따르고, 단계마다 하위 이슈가 있다.

- 기준 코드: `origin/develop` `5db2041`(2026-11-07, #142 병합 시점). 처음에는 `084a90d`(#129) 기준으로 썼고, 그 뒤 병합된 커밋(소셜 로그인, 참여 주소 정리, 피드백 AI 후속 질문 등)을 반영해 다시 계산했다
- 기준 문서: 프로젝트가 쓰는 Next.js 16.4.3에 들어 있는 공식 문서(`frontend/node_modules/next/dist/docs/`)
- 판정 근거: 판정마다 Next 문서의 줄 번호나 [`frontend/scripts/structure/`](../../frontend/scripts/structure/)의 실행 결과를 붙였다. 근거 없이 "문제없음"이라고 쓴 곳은 없다.

## 결론

1. **Next 규칙 위반은 없다.** 라우팅, 서버·클라이언트 경계, 서버 액션의 권한 재확인, 데이터 접근, `proxy.ts` 위치는 Next 문서와 맞는다.
2. **README의 import 규칙도 지키고 있다.** 경계 규칙 B1~B7을 ESLint로 돌리면 위반이 0건이다.
3. **문제는 "파일을 어디에 두는가" 규칙이 없다는 것이다.** `features/*/components`의 99개 가운데 88개가 한 구역 안에서만 쓰인다. `features/home`·`my`·`admin`은 도메인이 아니라 화면 이름이다. `components/layout`은 루트 레이아웃 전용인데 공용 폴더에 있고, 세션·시연·로그아웃 액션을 안다.
4. **고치는 방법은 Next가 예로 든 전략 그대로다.** 라우트 하나가 쓰는 부품은 그 라우트 폴더의 `_components`에 두고, 푸터는 경로 그룹 레이아웃이 맡게 한다. `features`에는 도메인 코드만 남기고, 시연 코드는 `demo/`에 모은다. URL은 하나도 바뀌지 않는다.

## 문서

| 문서 | 내용 |
| --- | --- |
| [1. Next 규칙](01-next-rules.md) | Next 문서가 정한 것(N1~N15)과 정하지 않은 것. 줄 번호 인용과 지금 코드의 상태 |
| [2. 점검 결과](02-audit.md) | 문제 F1~F11(심각도, 근거, 원인)과 문제없는 것. 현재 상태 숫자 |
| [3. 목표 구조](03-target-structure.md) | 목표 폴더 트리, 배치 규칙 P1~P7, 레이아웃, 도메인, `demo/`, import 경계 B1~B7·R0~R3 |
| [4. 옮기는 순서](04-migration.md) | 7단계, 단계마다 확인할 명령, 아직 정할 것 1개, **파일 229개 전부의 이동표** |
| [`frontend/scripts/structure/usage.mjs`](../../frontend/scripts/structure/usage.mjs) | 파일마다 누가 쓰는지 계산한다(동적 import 포함, TypeScript 구문 트리). `--check`로 배치 규칙을 검사한다. 위반이 있으면 종료 코드 1 |
| [`frontend/scripts/structure/eslint-boundaries.mjs`](../../frontend/scripts/structure/eslint-boundaries.mjs) | import 경계 규칙 B1~B7. `eslint.config.mjs`에 그대로 넣는다 |

처음 읽는다면 이 README → [2. 점검 결과](02-audit.md)의 "한눈에" → [3. 목표 구조](03-target-structure.md)의 트리와 배치 규칙 순서가 빠르다. 파일을 옮기는 사람은 [4. 옮기는 순서](04-migration.md)만 보면 된다.

## 직접 확인하는 방법

이 문서의 판정은 아래 명령으로 다시 낼 수 있다. 모두 저장소 최상위 폴더에서 실행하고, 코드를 바꾸지 않는다.

### 파일마다 누가 쓰는지

```bash
# 지금 체크아웃한 브랜치 기준
node frontend/scripts/structure/usage.mjs frontend            # 전체 표(TSV). src가 있으면 알아서 src를 본다
node frontend/scripts/structure/usage.mjs frontend --check    # 배치 규칙 위반 (R0~R3). 위반이 있으면 종료 코드 1
node frontend/scripts/structure/usage.mjs frontend --who features/my/components/TodoList.tsx
```

develop 기준으로 보려면, 브랜치를 바꾸지 않고 develop의 파일을 임시 폴더에 풀어서 그 경로를 넘긴다. 도구는 import를 TypeScript로 읽고, `typescript`를 넘긴 `frontend` 폴더의 `node_modules`에서 찾는다. 그래서 풀어 둔 폴더에 지금 체크아웃의 `node_modules`를 링크한다(설치는 하지 않는다). `frontend` 폴더를 통째로 풀어야 아래 ESLint 검사가 `tsconfig.json`으로 `@/` 경로를 푼다.

```bash
rm -rf /tmp/moa-develop && mkdir -p /tmp/moa-develop
git fetch origin develop
git archive origin/develop frontend | tar -x -C /tmp/moa-develop
ln -s "$PWD/frontend/node_modules" /tmp/moa-develop/frontend/node_modules
node frontend/scripts/structure/usage.mjs /tmp/moa-develop/frontend --check   # 5db2041에서 R1 88건, 종료 코드 1
```

`frontend`에 `node_modules`가 없으면(설치한 적이 없으면) 종료 코드 2와 "typescript를 찾지 못했다"가 나온다. 그때는 `frontend`에서 `npm ci`를 먼저 실행한다.

`--who` 결과는 grep으로도 맞춰 볼 수 있다. 예를 들어 `grep -rn "TodoList" frontend --include="*.tsx"`의 import 줄이 페이지 하나뿐이면, 그 부품은 그 라우트만 쓴다.

### import 경계 (ESLint)

위에서 풀어 둔 develop 폴더에서 실행한다. 저장소 작업 트리에는 파일을 만들지 않는다.

```bash
cat > /tmp/moa-develop/frontend/eslint.boundaries.mjs <<EOF
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { boundaries } from "$PWD/frontend/scripts/structure/eslint-boundaries.mjs";
export default [...nextVitals, ...nextTs, boundaries];
EOF
(cd /tmp/moa-develop/frontend && npx eslint -c eslint.boundaries.mjs .)
```

develop `5db2041`에서는 아무것도 출력하지 않고 종료 코드 0으로 끝난다(위반 0건). 규칙이 실제로 걸리는지는, 풀어 둔 폴더의 `components/ui`에 `import { logout } from "@/features/auth/actions";`를 넣은 파일을 만들어 보면 된다. B1 오류와 종료 코드 1이 나온다. 위반 0건이라는 결과의 의미는 [2. 점검 결과](02-audit.md#21-한눈에)에 있다. import 규칙은 지키지만 배치 규칙이 없다는 뜻이다.

### Next 문서 인용

[1. Next 규칙](01-next-rules.md) 맨 위 표의 줄임말을 경로로 바꿔 연다. 예: `구조:349`는 다음 명령으로 본다.

```bash
sed -n 349p frontend/node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md
```
