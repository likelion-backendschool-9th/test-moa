# e2e 테스트 정리 (#56)

## 한눈에
- 끝나면: e2e 테스트가 431개(반복 포함 482건)에서 약 160개로 줄고, `docs/frontend/` 시나리오마다 확인 방법(`[테스트]`/`[명령]`/`[직접]`)이 붙는다. 테스트는 `[테스트]` 시나리오와만 1:1이다. 앞으로 새 계획도 같은 기준으로 테스트를 만든다.
- 결정 필요: 없음 (11-03 확정: 엄격하게 줄임, 문서는 태그만 붙임, scenario-plan 스킬 갱신, 문서 이동과 한 브랜치)
- 규모: 4단계

## 정한 것
- 강도: 새 scenario-plan 규칙 그대로. R마다 정상 1개, 실패는 되돌리기 어렵거나 조용히 틀어지는 것만 (11-03)
- 문서: 시나리오는 지우지 않고 제목에 태그만 붙인다. "S번호는 테스트와 1:1" 문구는 "`[테스트]` 시나리오만 1:1"로 고친다 (11-03)
- 브랜치: `feature/docs-structure`에서 이어서 하고 PR 하나로 올린다. 태그를 붙일 `docs/frontend/` 경로가 이 브랜치에만 있다 (11-03)
- `~/.agents/skills/scenario-plan/SKILL.md`를 `~/code/automation` 쪽 새 규칙으로 덮었다 (11-03, 저장소 밖)
- 지운 넘침·권한 검사는 페이지 목록을 도는 `pages.spec.ts` #56-S1~S3로 대신한다 (11-03, 고침 11-04: S537~S539가 #30·#42 번호와 겹쳐 이슈 번호로 바꿈)
- 기준선에서 실패하던 2건은 남기는 테스트라 함께 고친다 (11-03)
- 스킬도 고친다: 한 번 깨졌던 동작과 권한·보안은 `[테스트]`, `[직접]`은 PR에서 확인 표시, 다른 테스트는 파일과 S번호로 가리킨다 (11-03)

## 1. 테스트 줄이기 (R1)
기존 e2e 중 `[테스트]` 기준(분기가 있어 다시 깨질 수 있는 로직, 보안, 조용히 틀어지는 계산·동기화)에 맞는 것만 남긴다.

S1 정상 [명령]
- Given 아래 "남길 테스트" 목록
- When  `npx playwright test`
- Then  모두 통과하고 테스트는 150~180개다 (결과 11-04, #30 병합 뒤 다시 함: 소스 기준 166개, 반복 포함 242건)

빼는 묶음과 새 태그:
- 색·글꼴·배치·"주 버튼은 하나"·대비 → `[직접]`
- 스켈레톤 먼저 보이기, 입력해야 생기는 넘침(긴 메모), h2·라벨 같은 접근성 구조, 히어로 자동 넘김 → `[직접]`
- "링크가 있다", 입력 속성, 정적 문구, 빈 상태 문구 → `[직접]`
- 페이지마다 반복하는 비로그인·일반 회원·404: 검사는 `src/lib/auth.ts` 한 곳(`requireMember`/`requireAdmin`/`requireRole`)이 하므로 대표만 남긴다 → 나머지와 페이지만 열면 보이는 넘침은 `[테스트: pages.spec.ts #56-S1~S3]` (고침 11-03: 보완 테스트 추가)
- 같은 처리 양식·같은 검증 규칙을 다른 페이지에서 다시 보는 것 → 대표만 남긴다

남길 테스트 (파일: S번호). #30 번호 정리 전 번호다. #30 뒤에는 제목이 같은 테스트를 남겼다 (고침 11-04)
- a11y: S35, S36
- admin-home: S89(한 역할), S91, S94, S97, S99
- admin-reports: S118, S119, S120, S532, S533, S536, S123, S128, S129, S130, S137, S131
- admin-withdrawals: S196, S197, S203, S206, S207, S208, S209, S219
- admin-cancellations: S255, S261, S278, S266, S268, S269, S270
- admin-users: S225, S229, S231, S233, S280, S235, S531, S238, S240, S242
- auth: S287, S289, S290, S291, S294, S316, S296, S301, S304, S314, S307, S308, S295(바깥 주소 목록)
- chat-room: S143(들어갈 수 없는 방), S145, S146, S148, S149, S340(두 기기), S150, S151, S153, S317, S318, S335, S336, S157, S321
- chats: S120, S121, S136, S122, S123, S124, S126, S319, S320, S139, S140
- credits: S137, S139~S142, S352·S356, S154·S353, S144·S146, S145·S354, S148·S149, S151·S152, S150·S185…, S187·S190
- header: S4, S5, S317, S318, S321, S322
- home-gallery: S65, S68, S69, S70, S71, S72, S73
- links: S26, S27
- mobile-menu: S12, S328
- my: S96, S100, S103
- nav: S323, S324, S334
- no-js-forms: 로그인 S288, 가입 S300, 비밀번호 S177 (기본 정보 S177은 뺌)
- participation-detail: S194(다른 사람 참여는 404), S196, S197
- participations: S83, S88, S90, S92, S95, S96
- profile: S167, S170, S172, S173
- projects: S103(목록), S108, S109, S111, S116, S118, S121, S122, S139(두 개), S123, S144(끊김, 다른 탭 정원), S143(두 개), S124, S126 S128, S127, S131 S138
- subscription-checkout: S344, S345, S346, S347, S350, S351
- subscription: S196, S202
- pages: #56-S1, #56-S2, #56-S3 (새로)
- 파일째 지움: theme, hero, header-layout

S2 정리 뒤 남는 코드 [명령]
- Given 테스트를 지운 파일
- When  `npm run lint`, `npx tsc --noEmit`
- Then  쓰지 않는 import·헬퍼가 없다

## 2. 문서에 확인 방법 붙이기 (R2)
`docs/frontend/` 시나리오 제목 끝에 확인 방법을 붙인다. 테스트가 있으면 `[테스트]`, 다른 파일의 테스트가 대신 확인하면 `[테스트: 파일 S번호]`, grep 같은 명령으로 확인하면 `[명령]`, 나머지는 `[직접]`이다.

S3 정상 [명령]
- Given 정리한 e2e와 문서
- When  문서의 `[테스트]` S번호와 e2e 테스트 이름의 S번호를 비교하는 스크립트를 돌린다
- Then  두 목록이 같고, 태그 없는 시나리오가 0개다

## 3. 앞으로 늘지 않게 (R3)
저장소 `AGENTS.md`에 테스트 규칙을 적고, PR 템플릿에 `[직접]` 확인 칸을 두고, scenario-plan 스킬의 `[테스트]` 기준을 넓힌다. (고침 11-03: 기준의 빈 곳 보완)

S4 정상 [직접]
- Given 새 페이지 계획
- Then  plan의 시나리오에 태그가 붙고 `[테스트]`만 e2e가 된다
- Then  새 페이지는 `pages.spec.ts`의 `PAGES`에 한 줄 더한다
- Then  PR 본문에 `[직접]` 시나리오를 확인했는지 적는다

## 범위 밖
- 남긴 테스트의 내용 고치기, 여러 테스트 합치기 (지우기만 한다)
- 단위 테스트 도입, CI에서 e2e 돌리기

## 작업 순서
0. 브랜치 — `feature/docs-structure`에서 이어서 한다 (문서 이동 뒤라야 `docs/frontend/` 경로에 태그를 붙일 수 있다)
1. 테스트 지우기 — S1, S2
   - 파일: `frontend/e2e/*.spec.ts`
   - 확인: `npx playwright test`, `npm run lint`, `npx tsc --noEmit`
2. 문서 태그 — S3
   - 파일: `docs/frontend/*.md` (시나리오 제목, 머리말의 1:1 문구)
   - 확인: 비교 스크립트 (스크래치에 두고 커밋하지 않음)
3. 규칙 — S4
   - 파일: `AGENTS.md`, `.github/pull_request_template.md`, `~/code/automation/.agents/skills/scenario-plan/SKILL.md`(저장소 밖)
4. 마무리 — 전체 테스트 다시 실행, 수와 시간을 보고

## 브랜치·커밋
- 브랜치: `feature/docs-structure` (문서 이동과 한 PR, 11-03 확정)
- 커밋: `Test: 화면 모양·중복 권한 검사 e2e를 지우고 분기 로직만 남김 (#56)` — 단계 1
- 커밋: `Docs: 시나리오에 확인 방법 태그를 붙이고 테스트 1:1 범위를 좁힘` — 단계 2
- 커밋: `Docs: AGENTS.md와 PR 템플릿에 e2e 테스트 기준 추가` — 단계 3

## PR #30 병합 뒤 다시 한 일 (11-04)
PR #30(`feature/e2e-cleanup-and-renumber`, 시나리오·요구사항 번호 재배정)이 먼저 병합됐다(11-04). #30은 이 브랜치와 같은 문서·테스트를 옛 경로에서 고치므로, 병합 뒤 `develop`을 합치면 거의 모든 파일이 충돌한다. 충돌을 손으로 풀지 않고 새 `develop` 위에서 같은 작업을 다시 했다. 예전 커밋은 로컬 `backup/docs-structure`에 있다.

#30이 바꾸는 것 (11-03 확인)
- 시나리오 번호: credits·subscription·admin-home·admin-reports·participations·projects를 S348~S526으로 옮겼다. 대응표는 `docs/scenario-numbers.md`에 있다.
- 요구사항 번호: chats·credits·my·profile-edit·subscription·auth·chat-room·header·participations를 R113~R195로 옮겼다.
- 구독 결제가 S533~S543을 쓴다. 이 브랜치의 S537~S539와 겹친다.
- `AGENTS.md`에 "번호는 `docs/scenario-numbers.md`에서 다음 빈 번호를 받는다" 규칙이 생긴다. 이 브랜치의 "이슈마다 1부터(`#42-S1`)" 규칙과 맞지 않는다.
- chats S320·chat-room S321은 #30도 로고(`homeLogo` 도우미)로 고쳤다. 가로 넘침·비로그인 이동 확인은 `helpers.ts`의 공용 도우미로 모았다.

다시 한 순서
1. 이 브랜치를 새 `develop`으로 다시 만든다. 기존 커밋은 참고용으로 남긴다(`backup/docs-structure` 등).
2. 문서 이동: `docs/scenario-numbers.md`를 포함해 옛 이름을 가리키는 참조를 다시 바꾼다.
3. 테스트 지우기: 위 "남길 테스트" 목록을 대응표로 새 번호로 바꾼 뒤 다시 지운다. S320·S321 수정은 #30 것을 쓰고, `pages.spec.ts`는 #30의 공용 도우미와 겹치지 않게 맞춘다.
4. 목록 테스트 번호: S537~S539는 #30과 겹치므로, 이 작업의 이슈를 만들어 `#이슈-S1`~`S3`으로 바꾼다.
5. 문서 태그: 대조 스크립트를 새 번호로 다시 돌린다.
6. 번호 규칙: `AGENTS.md`의 #30 규칙을 이슈 번호 규칙으로 바꾸고, `docs/scenario-numbers.md`는 "S543까지의 옛 번호 표와 대응표"로 남긴다.

정리에 쓴 스크립트(문서 이동, 테스트 지우기, 태그·대조)는 저장소 밖 `project-lion/docs/test-cleanup-scripts/`에 있다.

## 가정
- 기준선에서 실패하는 chats S320, chat-room S321은 남길 목록에 있다. 다시 돌려도 실패하면 고치지 않고 보고한다. (고침 11-03: 없어진 헤더 "홈" 탭을 누르던 낡은 테스트라 로고로 고쳤다)
- 반복문으로 만드는 테스트(S86·S89·S250 등)는 한 건만 남기거나 통째로 뺀다.
- 목업 데이터와 `helpers.ts`는 남긴 테스트가 쓰는 만큼만 둔다.

## 참고 (2026-11-03 확인)
- 기준선: `develop` 기준 482건, 480 통과·2 실패, 1.6분
- CI(`.github/workflows`)는 lint·build만 돌리고 e2e는 돌리지 않는다
- 권한 검사: `requireAdmin` 10곳, `requireRole` 9곳, `requireMember` 7곳에서 부른다
- `docs/frontend/` 시나리오는 488개, 8개 문서에 1:1 문구가 있다
