# 테스터·개발자 페이지 URL을 역할 경로로 옮기기

이슈: [#101](https://github.com/likelion-backendschool-9th/test-moa/issues/101) · 관련 문서: [참여 테스트](participations.md), [개발자 프로젝트](projects.md), [페이지 URL](../../page-urls.md)

## 한눈에
- 끝나면: 참여 테스트는 `/testers/recruitments`, 내 프로젝트·모집은 `/developer/...` 주소로 열린다. 옛 `/my/participations`, `/my/projects` 주소는 404다.
- 결정 필요: 없음. 모집 작성 주소는 안 A(`?project=`)로 정했다(11-05).
- 규모: 4단계. 경로를 기계적으로 바꾸는 일이 대부분이고, 모집 작성·관리의 키 처리만 로직이 바뀐다.

## 1. 주소 옮기기 (#101-R1)
지금 있는 테스터·개발자 페이지 8개를 팀 백로그 시트("전체" 탭)의 역할 경로로 옮긴다. 쿼리 탭(`?tab=`)과 안내(`?notice=`)는 그대로 둔다.

| 페이지 | 옛 주소 | 새 주소 |
| --- | --- | --- |
| 참여 테스트 목록 | `/my/participations?tab=applied\|ongoing\|history` | `/testers/recruitments?tab=…` |
| 내 참여 상세 | `/my/participations/:participationKey` | `/testers/recruitments/:participationKey` |
| 내 프로젝트 목록 | `/my/projects` | `/developer/projects` |
| 프로젝트 등록 | `/my/projects/new` | `/developer/projects/new` |
| 프로젝트 상세 | `/my/projects/:projectKey` | `/developer/projects/:projectKey` |
| 프로젝트 수정 | `/my/projects/:projectKey/edit` | `/developer/projects/:projectKey/edit` |
| 테스트 모집 작성 | `/my/projects/:projectKey/recruitments/new` | `/developer/recruitments/new?project=:projectKey` |
| 테스트 모집 관리 | `/my/projects/:projectKey/recruitments/:recruitmentKey?tab=testers\|feedback\|analytics` | `/developer/recruitments/:recruitmentKey?tab=…` |

#101-S1 새 주소로 열린다 [테스트: pages.spec.ts #56-S1]
- Given `PAGES`의 8개 주소를 새 주소로 바꿨다
- When  각 역할로 접속한다
- Then  모두 HTTP 200이고 `h1`이 보인다

#101-S2 비로그인은 새 주소로 돌아오게 로그인으로 간다 [테스트: pages.spec.ts #56-S2]
- Given 비로그인
- When  `/developer/recruitments/new?project=booklog`에 접속한다
- Then  `/login?next=%2Fdeveloper%2Frecruitments%2Fnew%3Fproject%3Dbooklog`로 간다

#101-S3 옛 주소를 쓰는 곳이 남지 않는다 [명령]
- When  `grep -rnE "/my/(participations|projects)" frontend/src frontend/e2e docs`를 실행한다
- Then  결과가 `docs/frontend/project/role-urls.md`(이 문서)의 이전 경로 설명, `projects.spec.ts`의 #101-S4(옛 주소 404), `home.md` S26의 과거 변경 메모와 `docs/page-urls.md` 변경 이력에만 나온다

#101-S4 옛 주소는 404다 [테스트]
- Given 개발자로 로그인
- When  `/my/projects`, `/my/participations`에 접속한다
- Then  "찾는 페이지가 없어요" 화면이다

## 2. 모집 작성은 쿼리로 프로젝트를 받는다 (#101-R2)
`/developer/recruitments/new`는 `?project=`로 프로젝트 키를 받는다. 키가 없거나 내 프로젝트가 아니면 404다.

#101-S5 작성 폼 [테스트]
- Given 개발자로 로그인
- When  `/developer/projects/booklog`에서 "모집글 작성"을 누른다 (고침 #130: 문구 변경)
- Then  URL이 `/developer/recruitments/new?project=booklog`이고 폼 위에 "북로그"가 보인다

#101-S6 프로젝트 키가 없거나 남의 프로젝트 [테스트]
- Given 개발자로 로그인
- When  `/developer/recruitments/new`, `/developer/recruitments/new?project=nope`에 접속한다
- Then  두 주소 모두 "찾는 페이지가 없어요" 화면이다

S500 작성 성공은 그대로 `/developer/projects/booklog?notice=saved`로 간다. 작성 폼의 "취소"는 `/developer/projects/booklog`로 간다(S497).

## 3. 모집 관리는 모집 키만으로 연다 (#101-R3)
`/developer/recruitments/:recruitmentKey`는 내 프로젝트들 가운데 그 모집 건을 가진 프로젝트를 찾아 연다. 찾지 못하면 404다. 모집 키는 전체에서 하나뿐이다. 백엔드는 지금 `recruitment_id`(PK)를 키로 넘기고([결정 7](../../backend/project/README.md)), 목업은 slug를 쓴다. 백엔드는 키로 모집 건을 찾은 뒤 그 프로젝트의 회원이 나인지 확인한다. 목업에서 내 프로젝트를 모두 뒤지는 방식은 목업에만 해당한다.

#101-S7 관리 화면 [테스트]
- Given 개발자로 로그인
- When  `/developer/recruitments/booklog`에 접속한다
- Then  "현재 위치"가 "내 프로젝트 › 북로그"이고, 두 링크는 `/developer/projects`, `/developer/projects/booklog`다

S485 없는 프로젝트·모집 건은 `/developer/projects/nope`, `/developer/recruitments/nope`으로 확인한다. 테스터로 `/developer/recruitments/booklog`에 접속해도 404다. (고침 #101: 모집 관리 주소에서 프로젝트 키를 뺌)

지원자 확정·거절(`decideApplicants`)과 모집 취소(`cancelRecruitment`)도 모집 키만 받는다. 이 동작은 `projects.spec.ts`의 기존 테스트가 그대로 확인한다. 확정·거절은 S504, S521, S525, S526이고, 취소는 #62-S16, #62-S17, #74-S1, #62-S19, #62-S20이다.

## 4. 헤더 탭의 현재 위치 (#101-R4)
"참여 테스트" 탭은 `/testers/recruitments` 아래에서, "내 프로젝트" 탭은 `/developer/projects`와 `/developer/recruitments` 아래에서 현재 탭이다.

#101-S8 모집 관리에서도 "내 프로젝트"가 현재 탭 [테스트]
- Given 개발자로 로그인
- When  `/developer/recruitments/booklog`에 접속한다
- Then  "주요 메뉴"의 "내 프로젝트"에 `aria-current="page"`가 있다

S323, S334, S344는 주소만 새 주소로 바꾼다. (고침 #101: 역할 경로로 이동)

## 5. 다른 문서의 시나리오 주소 (#101-R5)
아래 시나리오는 동작은 같고 주소만 바뀐다. 문장의 주소를 새 주소로 바꾸고 끝에 `(고침 #101: 역할 경로로 이동)`을 붙인다.

| 문서 | 시나리오 |
| --- | --- |
| `docs/frontend/header.md` | S323, S334, S344 |
| `docs/frontend/my.md` | S97, S100, S101, S102, S104, S105, S109 |
| `docs/frontend/auth/auth.md` | S316 |
| `docs/frontend/home.md` | S12 (S26은 옛 주소가 고침 메모에만 있으면 그대로 둔다) |
| `docs/frontend/project/participations.md` | 제목, 한눈에, S448, S451, S453, S455, S472, S473, S474, 11장 머리말, 구현 |
| `docs/frontend/project/projects.md` | 제목, 한눈에 URL 표, 3계층 구조 표, S485, S486, S489, S491, S492, S493, #62-S4, S494, #64-S1, S497, S500, S501, #74-S2, S516 |

`docs/page-urls.md`의 "참여 테스트"와 "개발자 프로젝트" 섹션은 1장 표대로 바꾼다. 상태(확정·후보)는 그대로 두고, 섹션 이름은 "참여 테스트(테스터)"와 "개발자 프로젝트(개발자)"로 바꾼다. 변경 이력에는 `2026-11-06: 참여 테스트를 /testers/recruitments로, 개발자 프로젝트·모집을 /developer/...로 옮겼다(#101).`를 더한다.

## 범위 밖
- 시트에만 있고 아직 없는 페이지: `/admin/cancellations…`, `/developer/projects/:projectKey/recruitments`(모집 건 목록 따로 보기)
- 시트가 예전 내용인 곳: 출금 요청 상세는 모달(`/admin/withdrawals?open=`)로 둔다. 시트에 없는 `/my/subscription/checkout`, `/admin/reports?target=`도 그대로 둔다.
- 시트 대분류 줄(4.0 `/my/recruitments`, 5.0 `/my/projects`)과 "API 명세" 탭의 경로. 둘 다 옛 경로다.
- 옛 주소에서 새 주소로 보내는 리다이렉트. 아직 배포 전이다.
- API 경로(`/api/v1/...`). 백엔드 작업에서 정한다.
- `/my` 아래 다른 페이지(마이페이지, 크레딧, 구독, 채팅)

## 작업 순서

### 1단계 — 페이지 폴더 옮기기와 링크 (#101-S1, S5~S8)
`git mv`로 옮긴다. 그래야 이력이 이어진다.

| 옛 폴더 | 새 폴더 |
| --- | --- |
| `src/app/my/participations/` | `src/app/testers/recruitments/` |
| `src/app/my/projects/page.tsx`, `new/`, `[projectKey]/page.tsx`, `[projectKey]/edit/` | `src/app/developer/projects/…` |
| `src/app/my/projects/[projectKey]/recruitments/new/page.tsx` | `src/app/developer/recruitments/new/page.tsx` |
| `src/app/my/projects/[projectKey]/recruitments/[recruitmentKey]/page.tsx` | `src/app/developer/recruitments/[recruitmentKey]/page.tsx` |

옮긴 뒤 빈 `src/app/my/projects/`, `src/app/my/participations/` 폴더가 남지 않게 한다.

각 `page.tsx`에서 바꿀 것:
- 맨 위 주석의 주소와 `PageProps<"…">` 타입 인자를 새 경로로 바꾼다. 예: `PageProps<"/developer/recruitments/[recruitmentKey]">`.
- 모집 작성 `page.tsx`는 `params` 대신 `searchParams`를 받는다. `const { project } = await searchParams`에서 `project`가 문자열이 아니면 `notFound()`를 부른다. `getRecruitmentFormInfo` 호출의 path는 `` `/developer/recruitments/new?project=${projectKey}` ``다. 그래야 로그인 뒤 같은 주소로 돌아온다.
- 모집 관리 `page.tsx`는 `params`에서 `recruitmentKey`만 꺼낸다. `basePath`는 `` `/developer/recruitments/${recruitmentKey}` ``이고, `getRecruitmentDetail`·`getAiAnalysis`·`ApplicantList`에 `projectKey`를 넘기지 않는다.

`src/features/project/service.ts`:
- `getRecruitmentDetail(path, recruitmentKey)`: 공통 `getMyRecruitment`에서 로그인·소유권·모집 상태를 확인한 뒤 지원·피드백·상세를 조합한다. 소유 모집 조회는 데이터 계층의 `findOwnedRecruitment`가 맡고, 목업의 전체 프로젝트 탐색은 그 함수 안에 둔다. 없는 모집은 `notFound()`다.
- `cancelRecruitment(recruitmentKey, formData)`, `decideApplicants(recruitmentKey, ids, status)`, `getAiAnalysis(path, recruitmentKey)`에서 `projectKey` 인자를 뺀다. 내부 path는 `` `/developer/recruitments/${recruitmentKey}` ``다.
- `getMyDashboard`의 할 일 `base`는 `` `/developer/recruitments/${recruitment.slug}` ``다.

`src/features/project/actions.ts`:
- `saveProject`의 path와 redirect를 `/developer/projects…`로 바꾼다.
- `createRecruitment(projectKey, …)`는 그대로 두되 path를 `` `/developer/recruitments/new?project=${projectKey}` ``로, redirect를 `` `/developer/projects/${projectKey}?notice=saved` ``로 바꾼다.
- `decideApplicants`, `cancelRecruitment`에서 `projectKey` 인자를 뺀다.

컴포넌트:
- `ApplicantList`: `projectKey` prop을 뺀다.
- `CancelRecruitmentButton`: `projectKey` prop을 빼고 `cancelRecruitment.bind(null, recruitmentKey)`로 바꾼다. `RecruitmentManage.tsx`의 호출도 고친다.
- `RecruitmentManage.tsx`: 현재 위치 링크는 `/developer/projects`, `` `/developer/projects/${project.key}` ``다.
- `ProjectDetail.tsx`: 모집 작성 링크는 `` `/developer/recruitments/new?project=${projectKey}` ``, 모집 건 링크는 `` `/developer/recruitments/${item.slug}` ``, `base`는 `` `/developer/projects/${project.key}` ``다.
- `ProjectList.tsx`, `RecruitmentForm.tsx`(취소 링크): `/developer/projects…`로 바꾼다.

참여:
- `src/features/participation/types.ts`의 `participationPath`는 `` `/testers/recruitments/${key}` ``를 돌려준다.
- `actions.ts`의 `revalidatePath`와 `setParticipationView`의 path를 `/testers/recruitments`로 바꾼다.
- `ParticipationTabs.tsx`, `ParticipationDetail.tsx`의 탭 링크를 `` `/testers/recruitments?tab=${tab}` ``로 바꾼다.

마이페이지(`src/features/my/`):
- `mock.ts`, `ActivitySummary.tsx`, `TodoList.tsx`의 `/my/participations` → `/testers/recruitments`, `/my/projects` → `/developer/projects`.

헤더(`src/lib/nav.ts`, #101-S8):
- `NavDefinition`과 `NavItem`에 선택 필드 `activePaths?: string[]`를 더하고, `getNavItems`가 그대로 넘긴다.
- NAV는 `{ label: "참여 테스트", path: "/testers/recruitments", requiresAuth: true }`와 `{ label: "내 프로젝트", path: "/developer/projects", activePaths: ["/developer/projects", "/developer/recruitments"], requiresAuth: true }`다.
- `findActivePath`는 항목마다 `item.activePaths ?? [item.path]` 가운데 `pathname`과 일치하는 가장 긴 경로를 찾는다. 그 길이가 가장 긴 항목의 `item.path`를 돌려준다. 돌려주는 값이 지금처럼 `path`라서 `MainNav`, `MobileMenu`, `NavList`의 비교는 바꾸지 않는다. `AccountNav`의 `ACCOUNT_NAV`는 `activePaths`가 없으니 동작이 같다.
- `isMyPagePath`는 바꾸지 않는다. `/my` 아래 탭은 이제 채팅뿐이다.

- 확인: `cd frontend && npm run lint && npm run build`

### 2단계 — e2e (#101-S1~S2, S4~S8, 기존 시나리오)
- `e2e/pages.spec.ts`의 `PAGES` 8줄을 바꾼다. `/testers/recruitments`, `/testers/recruitments/p-meeting-notes`(tester). `/developer/projects`, `/developer/projects/new`, `/developer/projects/booklog`, `/developer/projects/booklog/edit`, `/developer/recruitments/new?project=booklog`, `/developer/recruitments/folio-builder`(developer).
- `participations.spec.ts`, `participation-detail.spec.ts`, `projects.spec.ts`, `recruitment-detail.spec.ts`, `nav.spec.ts`, `mobile-menu.spec.ts`, `auth.spec.ts`, `my.spec.ts`의 주소를 1장 표대로 바꾼다. 예: `FOLIO_MANAGE = "/developer/recruitments/folio-builder"`, `recruitment-detail.spec.ts`의 `NEW = "/developer/recruitments/new?project=booklog"`. 테스트 이름은 바꾸지 않는다.
- `projects.spec.ts`의 S485 루프는 `["/developer/projects/nope", "/developer/recruitments/nope"]`로 바꾸고, 테스터로 `/developer/recruitments/booklog`에 접속하는 경우를 더한다.
- 새 테스트를 만든다.
  - `projects.spec.ts`: `#101-S4`(옛 주소 404), `#101-S5`(작성 버튼 → `?project=booklog`), `#101-S6`(키 없음·남의 키 404), `#101-S7`(관리 화면의 현재 위치 링크; S501은 기존 e2e에 없어 새로 확인)
  - `nav.spec.ts`: `#101-S8`(모집 관리에서 "내 프로젝트"가 현재 탭)
- 확인: `cd frontend && npx playwright test e2e/pages.spec.ts e2e/projects.spec.ts e2e/participations.spec.ts e2e/participation-detail.spec.ts e2e/recruitment-detail.spec.ts e2e/nav.spec.ts e2e/mobile-menu.spec.ts e2e/auth.spec.ts e2e/my.spec.ts`

### 3단계 — 문서 (#101-R5, #101-S3)
- 5장 표의 시나리오 주소를 바꾸고 `(고침 #101: 역할 경로로 이동)`을 붙인다. S485는 3장의 고침 이유를 쓴다.
- `docs/page-urls.md`를 5장대로 고친다.
- `projects.md`의 3계층 구조 표와 S516·#74-S2의 명령은 `frontend/src/app/developer`를 가리키게 고친다. `participations.md`의 구현 절은 `src/app/testers/recruitments/…`를 가리키게 고친다.
- 확인: #101-S3의 `grep`

### 4단계 — 전체 확인
- `cd frontend && npm run lint && npm run build && npm run test:e2e`

## 조회와 주소 생성의 책임

- 모집 소유권·상태 조회와 관리 화면 전체 조회를 나눈다. 취소·지원자 결정·AI 분석이 화면의 통계 계산이나 목록 가공에 의존하지 않게 하기 위해서다.
- 소유 모집을 찾는 방식은 데이터 계층이 감춘다. 목업은 프로젝트 목록을 탐색하지만, 실제 API에서는 모집 키와 로그인 회원으로 소유권을 확인한다.
- 프로젝트·모집의 이동 주소는 `src/lib/project-paths.ts`에서 생성한다. 페이지, 액션, 헤더, 마이페이지가 같은 경로 규칙을 쓰되 Next.js의 `PageProps` 경로 타입과 e2e의 기대 주소는 리터럴로 둔다.

## 가정
- 내 참여 상세의 경로 변수 이름은 `participationKey`로 둔다. 시트의 `recuritmentsKey`는 오타이고, 실제로 가리키는 것도 모집 건이 아니라 참여 건이다.
- 백엔드는 프로젝트·모집·참여 모두 PK id를 주소 키로 쓴다. 나중에 별도 키(채팅의 `roomKey` 같은 랜덤 키)로 바꿔도 프론트는 주소 변수(`:projectKey`, `:recruitmentKey`, `:participationKey`)와 문자열 키를 그대로 쓴다 (11-06).
- 모집 키가 `new`인 모집 건은 없다. 백엔드 키는 숫자이고, 목업 slug에도 `new`가 없다. 겹쳐도 Next.js는 정적 세그먼트 `new`를 먼저 고른다.
- 모집 작성에 `?project=`가 없을 때 프로젝트 고르기 화면을 따로 만들지 않고 404로 둔다. 작성은 프로젝트 상세의 버튼에서만 들어온다.
- e2e 테스트 이름에 주소가 들어간 #56-S1·S2는 `PAGES`를 바꾸면 이름이 저절로 바뀐다.

## 참고
- 기준 시트: 팀 백로그 "전체" 탭(2026-11-02 기준, 11-05 확인). https://docs.google.com/spreadsheets/d/1nnpYxolTOrFoWQPGyMfIGNWK9JhDA1WRI2Y3U9UNjrk
- 11-06 계획 시점의 `develop`(`61f6853`)에서 옛 경로를 쓰는 파일은 38개다(코드 22, e2e 9, 문서 7).
