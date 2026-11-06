# 테스터·개발자 페이지 URL을 역할 경로로 옮기기

이슈: [#101](https://github.com/likelion-backendschool-9th/test-moa/issues/101) · 관련 문서: [참여 테스트](participations.md), [개발자 프로젝트](projects.md), [페이지 URL](../../page-urls.md)

## 한눈에
- 끝나면: 참여 테스트는 `/testers/recruitments`, 내 프로젝트·모집은 `/developer/...` 주소로 열린다. 옛 `/my/participations`, `/my/projects` 주소는 404다.
- 결정 필요: 없음. 모집 작성 주소는 안 A(`?project=`)로 정했다(11-05).

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
- Then  결과가 `docs/frontend/project/role-urls.md`(이 문서)의 이전 경로 설명, `projects.spec.ts`의 #101-S4(옛 주소 404), `home.md` S26의 과거 변경 메모에만 나온다

#101-S4 옛 주소는 404다 [테스트]
- Given 개발자로 로그인
- When  `/my/projects`, `/my/participations`에 접속한다
- Then  "찾는 페이지가 없어요" 화면이다

## 2. 모집 작성은 쿼리로 프로젝트를 받는다 (#101-R2)
`/developer/recruitments/new`는 `?project=`로 프로젝트 키를 받는다. 키가 없거나 내 프로젝트가 아니면 404다.

#101-S5 작성 폼 [테스트]
- Given 개발자로 로그인
- When  `/developer/projects/booklog`에서 "테스트 모집 작성"을 누른다
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

`docs/page-urls.md`의 "참여 테스트"와 "개발자 프로젝트" 섹션은 1장 표대로 바꾼다. 상태(확정·후보)는 그대로 두고, 섹션 이름은 "참여 테스트(테스터)"와 "개발자 프로젝트(개발자)"로 바꾼다. 경로가 바뀐 두 섹션에 `(고침 #101: 역할 경로로 이동)`을 붙이고, git으로 확인할 수 있는 변경 이력은 따로 적지 않는다.

## 범위 밖
- 시트에만 있고 아직 없는 페이지: `/admin/cancellations…`, `/developer/projects/:projectKey/recruitments`(모집 건 목록 따로 보기)
- 시트가 예전 내용인 곳: 출금 요청 상세는 모달(`/admin/withdrawals?open=`)로 둔다. 시트에 없는 `/my/subscription/checkout`, `/admin/reports?target=`도 그대로 둔다.
- 시트 대분류 줄(4.0 `/my/recruitments`, 5.0 `/my/projects`)과 "API 명세" 탭의 경로. 둘 다 옛 경로다.
- 옛 주소에서 새 주소로 보내는 리다이렉트. 아직 배포 전이다.
- API 경로(`/api/v1/...`). 백엔드 작업에서 정한다.
- `/my` 아래 다른 페이지(마이페이지, 크레딧, 구독, 채팅)

## 조회와 주소 생성의 책임

- 모집 소유권·상태 조회와 관리 화면 전체 조회를 나눈다. 취소·지원자 결정·AI 분석이 화면의 통계 계산이나 목록 가공에 의존하지 않게 하기 위해서다.
- 소유 모집을 찾는 방식은 데이터 계층이 감춘다. 목업은 프로젝트 목록을 탐색하지만, 실제 API에서는 모집 키와 로그인 회원으로 소유권을 확인한다.
- 프로젝트·모집의 이동 주소는 `src/lib/project-paths.ts`, 테스터의 참여 목록·상세 주소는 `src/lib/participation-paths.ts`에서 생성한다. 상세 키와 쿼리 값은 `encodeURIComponent`로 인코딩한다. 페이지, 액션, 헤더, 마이페이지가 같은 경로 규칙을 쓰되 Next.js의 `PageProps` 경로 타입과 e2e의 기대 주소는 리터럴로 둔다.

## 가정
- 내 참여 상세의 경로 변수 이름은 `participationKey`로 둔다. 시트의 `recuritmentsKey`는 오타이고, 실제로 가리키는 것도 모집 건이 아니라 참여 건이다.
- 백엔드는 프로젝트·모집·참여 모두 PK id를 주소 키로 쓴다. 나중에 별도 키(채팅의 `roomKey` 같은 랜덤 키)로 바꿔도 프론트는 주소 변수(`:projectKey`, `:recruitmentKey`, `:participationKey`)와 문자열 키를 그대로 쓴다 (11-06).
- 모집 키가 `new`인 모집 건은 없다. 백엔드 키는 숫자이고, 목업 slug에도 `new`가 없다. 겹쳐도 Next.js는 정적 세그먼트 `new`를 먼저 고른다.
- 모집 작성에 `?project=`가 없을 때 프로젝트 고르기 화면을 따로 만들지 않고 404로 둔다. 작성은 프로젝트 상세의 버튼에서만 들어온다.
- e2e 테스트 이름에 주소가 들어간 #56-S1·S2는 `PAGES`를 바꾸면 이름이 저절로 바뀐다.

## 참고
- 기준 시트: 팀 백로그 "전체" 탭(2026-11-02 기준, 11-05 확인). https://docs.google.com/spreadsheets/d/1nnpYxolTOrFoWQPGyMfIGNWK9JhDA1WRI2Y3U9UNjrk
