# 프론트엔드 개발자 프로젝트 (`/my/projects`)

개발자 프로젝트 영역(`docs/page-urls.md`의 "개발자 프로젝트" 9개 페이지)이 지켜야 하는 요구사항(R)과 시나리오(S)를 모은 문서다. S번호는 `frontend/e2e`의 테스트 이름과 1:1로 맞는다. 홈 문서(`frontend-home.md`, S1~S82)와 겹치지 않게 S101부터 쓴다. 테스트를 추가하거나 바꾸면 이 문서도 함께 고친다.

## 한눈에
- 스택과 규칙은 홈과 같다: Next.js 16(App Router, Cache Components), Tailwind CSS v4, TypeScript, Playwright E2E. 폴더 구조와 규칙은 `frontend/README.md`를 따른다.
- 범위: 아래 9개 페이지. 후보 URL도 모두 포함한다.

| 페이지 | URL | 상태 |
| --- | --- | --- |
| 내 프로젝트 목록 | `/my/projects` | 확정 |
| 프로젝트 등록 | `/my/projects/new` | 후보 |
| 프로젝트 상세 | `/my/projects/:projectKey` | 확정 |
| 프로젝트 수정 | `/my/projects/:projectKey/edit` | 후보 |
| 테스트 모집 작성 | `/my/projects/:projectKey/recruitments/new` | 확정 |
| 테스트 모집 관리 | `/my/projects/:projectKey/recruitments/:recruitmentKey` | 확정 |
| 테스터 관리 탭 | `...?tab=testers` | 후보 |
| 피드백 탭 | `...?tab=feedback` | 후보 |
| 분석 탭 | `...?tab=analytics` | 후보 |

- 용어는 README를 따른다. **프로젝트**는 테스트할 소프트웨어, **테스트 모집 건**은 한 프로젝트에서 조건·일정을 정해 테스터를 모으는 단위다. 참여자·피드백·보상은 모집 건별로 관리한다.
- 데이터: 로그인과 API는 목업이다. 홈과 같이 `features/project/`에 `types.ts`, `mock.ts`, `api.ts`를 두고, 화면은 `api.ts`만 부른다. 실제 API를 붙일 때는 `api.ts` 함수 본문만 바꾼다.
- 시연 상태는 홈과 같은 쿠키로 바꾼다. `demo-role=developer`(박도현, 구독 중)가 프로젝트를 가진 개발자다. `demo-data=empty`면 프로젝트가 없다.
- 디자인: 홈의 토큰과 공통 컴포넌트(`components/ui`의 Button, LinkButton, Badge, Card, EmptyState, Skeleton)를 그대로 쓴다. 새 색이나 임의 값은 만들지 않는다.

## 코드 작성 규칙
### 3계층 구조
공통 의존 규칙은 [프론트엔드 README의 의존 방향](../frontend/README.md#의존-방향)을 따른다. 프로젝트 영역은 여기에 로직 계층(`service.ts`)을 하나 더 둔다. 위 계층만 아래 계층을 부른다(화면 → 로직 → 데이터). 아래 계층은 위 계층을 모른다.

| 계층 | 위치 | 하는 일 | 하지 않는 일 |
| --- | --- | --- | --- |
| 화면 | `src/app/my/projects/**/page.tsx`, `src/features/project/components/` | 로직 계층을 불러 받은 값을 그린다. 버튼·폼 같은 상호작용 | 계산, 검증 규칙, 목업 직접 접근 |
| 로직 | `src/features/project/service.ts` | 모집 건 상태, 제출률, 남은 신고 시간 계산, 폼 검증, 구독 여부에 따른 기능 허용 판단 | 화면 그리기, 데이터 저장소 접근 방식 알기 |
| 데이터 | `src/features/project/api.ts` (+ `mock.ts`) | 프로젝트·지원·피드백 데이터를 가져온다. 지금은 목업, 나중에 실제 API | 계산, 화면 문구 |

- 라우트(`page.tsx`)는 `service.ts`만 불러서 받은 값을 컴포넌트에 넘겨 조립만 한다.
- 프로젝트 영역에서는 `service.ts`만 `api.ts`를 import하며, 페이지와 액션은 `service.ts`를 호출한다.
- 컴포넌트는 데이터를 props로만 받는다. `api.ts`나 `mock.ts`를 직접 import하지 않는다.
- 로직 계층 함수는 화면 없이 테스트할 수 있게 입력을 받아 값을 돌려주는 함수로 쓴다.

### 한글 주석
- 주석은 한글로 쓴다.
- 파일 맨 위에 그 파일이 무엇을 하는지 한두 줄로 적는다.
- export하는 함수, 컴포넌트, 타입마다 무엇을 하는지 `/** */` 한 줄 주석을 단다.
- 규칙이나 숫자의 근거가 있으면 적는다. 예: `/* README: 제출 후 72시간 동안 신고가 없으면 자동 지급 */`
- 코드를 그대로 읽어 주는 주석은 달지 않는다. 예: `// i를 1 늘린다`

## 데이터 모델
필드 이름은 `features/recruitment/types.ts`와 맞춘다.

**Project** (`features/project/types.ts`)
| 필드 | 설명 |
| --- | --- |
| `key` | URL의 `projectKey`. 영문 소문자와 `-` |
| `name` | 프로젝트 이름. 1~50자 |
| `summary` | 한 줄 소개. 1~100자 |
| `softwareType` | `SoftwareType` 재사용 (`web`, `mobile`, `game`, `api`) |
| `accessUrl` | 접속 링크. `http(s)://`로 시작한다 |
| `createdAt` | 등록일 |
| `recruitments` | 이 프로젝트의 모집 건. `Recruitment`를 재사용하고 `slug`를 `recruitmentKey`로 쓴다 |

**Application** (지원)
| 필드 | 설명 |
| --- | --- |
| `id` | 지원 번호 |
| `testerNickname` | 테스터 닉네임. 이메일·연락처 같은 개인정보는 두지 않는다 |
| `status` | `applied`(지원), `confirmed`(확정), `rejected`(거절) |
| `appliedAt` | 지원일 |

**Feedback**
| 필드 | 설명 |
| --- | --- |
| `id` | 피드백 번호 |
| `testerNickname` | 작성한 테스터 닉네임 |
| `content` | 피드백 내용 |
| `submittedAt` | 제출 시각 |
| `status` | `waiting`(72시간 신고 대기), `reported`(신고됨), `paid`(지급 완료) |

**모집 건 상태**는 저장하지 않고 계산한다.
- `모집 중`: 모집 마감 전이고 정원이 남았다
- `모집 완료`: 모집 마감 전이고 정원이 찼다
- `테스트 중`: 모집이 마감됐고 제출 마감 전이다
- `종료`: 제출 마감이 지났다

## 1. 접근 (R101)
이 영역은 로그인한 회원만 쓴다. 역할은 나누지 않아서 로그인한 누구나 프로젝트를 등록할 수 있다.

S101 비로그인
- Given `demo-role=guest`
- When  9개 URL 중 아무 곳에 직접 접속한다
- Then  `/login?next=<접속한 경로>`로 이동한다

S102 탭 표시
- When  9개 URL 중 아무 곳에 접속한다
- Then  카테고리 탭 "내 프로젝트"에 `aria-current="page"`가 있다

S103 없는 프로젝트·모집 건
- When  `/my/projects/nope`이나 `/my/projects/booklog/recruitments/nope`에 접속한다
- Then  맞춤 404 화면("찾는 페이지가 없어요")이다
- Then  다른 회원의 프로젝트도 같은 404 화면이다 (403으로 할지 보류)
- 참고: 세션을 읽고 나서 404를 판단하므로 화면을 스트리밍하는 중이라 HTTP 상태는 200이다. 실제 API를 붙일 때 다시 본다.

## 2. 내 프로젝트 목록 (R102)
내 프로젝트를 최신 등록순 카드로 보여 준다.

S104 목록
- Given `demo-role=developer`
- Then  제목 "내 프로젝트"와 "프로젝트 등록" 버튼(`/my/projects/new`)이 있다
- Then  카드 3개가 최신순이다: "할 일 메모", "포트폴리오 빌더", "북로그"
- Then  각 카드에 한 줄 소개, 유형("웹서비스"), "모집 n건 · 모집 중 n건"이 보이고 상세(`/my/projects/:projectKey`)로 이동한다 (북로그는 "모집 2건 · 모집 중 1건")

S105 빈 목록
- Given `demo-role=tester` (또는 `demo-data=empty`)
- Then  "아직 등록한 프로젝트가 없어요"와 "프로젝트 등록" 버튼이 보인다

S106 로딩
- Given `demo-data=slow`
- Then  카드 스켈레톤이 먼저 보이고, 응답 뒤 카드가 보인다

## 3. 프로젝트 등록·수정 (R103)
등록과 수정은 같은 폼을 쓴다. 목업이라 저장되지 않고, 성공하면 안내와 함께 이동한다.

S107 등록 폼
- When  `/my/projects/new`에 접속한다
- Then  "프로젝트 이름", "한 줄 소개", "유형", "접속 링크" 입력란이 레이블과 함께 있다
- Then  유형은 "웹서비스"만 고를 수 있고, 나머지 셋은 "준비 중"으로 비활성이다

S108 검증
- When  이름을 비우거나 51자를 넣거나, 접속 링크를 `abc`로 넣고 "등록"을 누른다
- Then  해당 칸 아래에 오류 문구가 보이고(`aria-describedby`로 연결), 첫 오류 칸으로 포커스가 간다
- Then  페이지는 이동하지 않는다

S109 등록 성공
- When  올바른 값으로 "등록"을 누른다
- Then  `/my/projects`로 이동하고 "시연용이라 실제로 저장되지는 않아요" 안내가 보인다

S110 수정 폼
- When  `/my/projects/booklog/edit`에 접속한다
- Then  같은 폼에 북로그의 값이 채워져 있고 버튼 이름은 "저장"이다
- Then  "취소"는 `/my/projects/booklog`로 간다

S111 수정 성공
- When  소개를 바꾸고 "저장"을 누른다
- Then  `/my/projects/booklog`로 이동하고 저장 안내가 보인다

## 4. 프로젝트 상세 (R104)
프로젝트 정보와 그 프로젝트의 모집 건 목록을 보여 준다.

S112 정보
- When  `/my/projects/booklog`에 접속한다
- Then  이름, 소개, 유형, 접속 링크가 보인다
- Then  접속 링크는 새 탭(`target="_blank"`, `rel="noopener noreferrer"`)으로 열린다
- Then  "수정"(`/my/projects/booklog/edit`), "테스트 모집 작성"(`/my/projects/booklog/recruitments/new`) 버튼이 있다

S113 모집 건 목록
- Then  모집 건이 최신순으로 보이고, 각 항목에 상태 배지, 요청 내용, "확정 n / 정원 n명", 모집 마감일, 제출 마감일, "구독 모집" 여부가 있다
- Then  항목은 관리 화면(`.../recruitments/:recruitmentKey`)으로 이동한다
- Then  "공개 페이지 보기"는 `/recruitments/:slug`를 가리킨다

S114 모집 건 없음
- Given 모집 건이 없는 프로젝트
- Then  "아직 테스트 모집이 없어요"와 "테스트 모집 작성" 버튼이 보인다

## 5. 테스트 모집 작성 (R105)
모집 조건과 일정을 정한다. 보상은 개발자가 정하지 않고 서비스가 정한다(README: 개발자 보상 예산 충전 없음).

S115 작성 폼
- When  `/my/projects/booklog/recruitments/new`에 접속한다
- Then  "요청 내용", "모집 마감일", "피드백 제출 마감일", "모집 인원" 입력란이 있다
- Then  보상은 입력란이 아니라 "기본 보상 n 크레딧"으로 안내만 한다
- Then  구독 중이면 "구독 모집이라 추가 보상 n 크레딧이 붙고, 지원자를 직접 선정해요"가 보인다

S116 일정 검증
- When  모집 마감일이 오늘보다 이르거나, 제출 마감일이 모집 마감일보다 이르거나 같다
- Then  해당 칸에 오류 문구가 보이고 이동하지 않는다

S117 인원 검증
- When  모집 인원이 1보다 작거나 최대 인원을 넘는다
- Then  "1~n명까지 모집할 수 있어요" 오류가 보인다

S118 작성 성공
- When  올바른 값으로 "모집 등록"을 누른다
- Then  `/my/projects/booklog`로 이동하고 "시연용이라 실제로 저장되지는 않아요" 안내가 보인다

## 6. 테스트 모집 관리와 탭 (R106)
모집 건 요약을 위에 두고, 아래에서 테스터 관리·피드백·분석 탭을 바꾼다. 탭 상태는 URL(`tab`)에 남는다.

S119 요약
- When  `/my/projects/booklog/recruitments/booklog`에 접속한다
- Then  프로젝트 이름, 요청 내용, 상태 배지, "확정 n / 정원 n명", 지원 수, 피드백 제출 수, 두 마감일이 보인다
- Then  "프로젝트로 돌아가기"가 `/my/projects/booklog`를 가리킨다

S120 탭
- Then  탭 3개 "테스터 관리", "피드백", "분석"이 있다
- Then  `tab`이 없거나 모르는 값이면 "테스터 관리"가 선택된다(`aria-current="page"`)
- When  "피드백"을 누른다
- Then  URL에 `?tab=feedback`이 붙고 피드백 탭이 보인다

## 7. 테스터 관리 탭 (R107)
지원자를 지원 순서대로 보여 준다. 무료 모집은 선착순 자동 확정이라 보기만 하고, 구독 모집은 개발자가 직접 확정·거절한다.

S121 지원자 목록
- Then  지원 순서대로 닉네임, 상태 배지("지원", "확정", "거절"), 지원일이 보인다
- Then  이메일·연락처는 보이지 않는다

S122 구독 모집 선정
- Given 구독 모집(북로그), 정원이 남았다
- Then  상태가 "지원"인 행에만 "확정", "거절" 버튼이 있다
- When  "확정"을 누른다
- Then  그 행의 배지가 "확정"이 되고, 버튼이 사라지고, 확정 수가 1 늘어난다 (목업이라 새로고침하면 돌아온다)

S123 정원 참
- Given 확정 수가 정원과 같다
- Then  "확정" 버튼이 비활성이고 "정원이 다 찼어요"가 보인다

S124 무료 모집
- Given 무료 모집(포트폴리오 빌더)
- Then  "확정", "거절" 버튼이 없고 "선착순 모집이라 지원 순서대로 자동 확정돼요"가 보인다

S125 지원자 없음
- Then  "아직 지원자가 없어요"가 보인다
- 참고: 지원자가 없는 샘플 모집 건이 없어서 E2E 테스트는 아직 없다

## 8. 피드백 탭 (R108)
제출된 피드백을 최신순으로 보여 주고, 72시간 안에 신고할 수 있다.

S126 피드백 목록
- When  `?tab=feedback`
- Then  최신순으로 닉네임, 내용, 제출 시각, 상태가 보인다
- Then  신고 대기 중이면 "n시간 뒤 자동 지급"이 함께 보인다

S127 신고
- Given 상태가 신고 대기이고 72시간이 지나지 않았다
- When  "신고"를 누른다
- Then  사유 입력 대화상자(`dialog`)가 열리고 포커스가 사유 칸에 간다
- When  사유를 비우고 "신고하기"를 누른다
- Then  "신고 사유를 적어 주세요" 오류가 보인다
- When  사유를 적고 "신고하기"를 누른다
- Then  대화상자가 닫히고 그 행의 상태가 "신고됨"이 된다 (목업이라 새로고침하면 돌아온다)
- When  Esc를 누른다
- Then  대화상자가 닫히고 포커스가 "신고" 버튼으로 돌아온다

S128 신고 불가
- Given 상태가 "신고됨"이나 "지급 완료"다
- Then  "신고" 버튼이 없다

S129 피드백 없음
- Then  "아직 제출된 피드백이 없어요"가 보인다

## 9. 분석 탭 (R109)
구독 모집 건의 진행 숫자를 보여 준다. 구독 전용이다.

S130 분석
- Given 구독 모집(북로그), `?tab=analytics`
- Then  지원 수, 확정 수, 피드백 제출 수, 제출률(제출 ÷ 확정, 확정 0이면 0%), 신고 수가 숫자 카드로 보인다

S131 무료 모집
- Given 무료 모집(포트폴리오 빌더)
- Then  숫자 대신 "구독 모집에서 분석을 볼 수 있어요"와 "구독 알아보기"(`/my/subscription`)가 보인다

## 10. 접근성 (R110)
홈의 R12를 따른다. 추가로 다음을 지킨다.

S132 폼
- Then  모든 입력란에 레이블이 있고, 오류 문구는 `aria-describedby`로 연결된다

S133 상태 변화 알림
- Then  확정·거절·신고 뒤 바뀐 결과가 `aria-live="polite"`로 읽힌다

## 11. 구조 (R111)
홈의 R13 규칙을 따른다.

S134
- When  `grep -rl '"use client"' src/features/project`
- Then  ProjectForm, RecruitmentForm, ApplicantList, FeedbackList 4개만 나온다 (탭은 링크라 서버 컴포넌트다)
- Then  `src/features/project`의 컴포넌트에 hex 색이나 `[13px]` 같은 임의 값이 없다
- Then  `mock.ts`는 `api.ts`만 불러온다
- Then  `api.ts`를 import하는 파일은 `service.ts`뿐이다 (3계층 구조)
- Then  `src/app/my/projects`와 `src/features/project/components`는 `api.ts`, `mock.ts`를 import하지 않는다
- Then  `src/features/project`의 각 파일 맨 위에 한글 주석이 있다

## 홈 문서와 맞춰야 할 것
기존 문서(`frontend-home.md`)는 고치지 않는다. 대신 이 작업으로 홈 문서와 달라지는 점을 여기 적어 둔다.
- S26: `/my/projects`가 더 이상 "준비 중"이 아니다. 홈 문서의 목록에는 아직 남아 있다. 테스트(`e2e/links.spec.ts`)는 이 목록에서 `/my/projects`를 빼야 통과해서 뺐다.
- S78: `"use client"` 파일이 6개에서 10개로 늘어난다. 홈 문서의 목록은 6개 그대로다. 늘어난 4개는 이 문서 S134에 있다.

## 데모 데이터와 가정
- 박도현(`developer`)은 구독 중이고 프로젝트 3개를 가진다.
  - 북로그: 구독 모집 2건.
    - `booklog`: 홈의 모집 글과 같은 내용이다. 확정 13·거절 1·대기 3명의 지원자가 있고, 신고 대기·신고됨·지급 완료 피드백이 하나씩 있다.
    - `booklog-beta`: 정원 5명이 다 찼지만 모집 마감 전이다. 피드백은 없다.
  - 포트폴리오 빌더: 무료 모집 1건(홈의 `folio-builder`, 정원 마감). 선착순 자동 확정과 분석 잠김을 보여 준다.
  - 할 일 메모: 모집 건이 없다(빈 상태 시연).
- 테스터·운영자 역할은 프로젝트가 없다(빈 상태 시연).
- `projectKey`와 `recruitmentKey`는 영문 키(`booklog`)다. `recruitmentKey`는 모집 글 `slug`와 같다.
- 기본 보상, 추가 보상, 최대 모집 인원(임시: 무료 10명, 구독 30명)은 기획에서 미정이라 목업 상수로 둔다.
- 72시간 신고 기간은 README에 확정된 값이다. 남은 시간은 접속 시각 기준으로 계산한다.
- 등록·수정·작성·확정·거절·신고는 목업이라 저장되지 않는다. 폼은 이동과 안내만, 버튼은 화면에서만 바뀐다.

## 범위 밖
- 프로젝트 삭제, 모집 건 수정·취소(URL이 없다)
- 채팅, 버전별 비교, AI 요약, 그래프가 있는 통계 대시보드
- 실제 로그인, API, 저장
- 페이지 나누기
- 지원하기(`/recruitments/:slug/apply`)와 피드백 제출 화면은 다른 담당이다

## 정해야 할 것
- 다른 회원의 프로젝트 접근을 404로 할지 403으로 할지 (보류, 지금은 404)
- 유형을 웹서비스만 받을지, 네 가지 다 받을지 (지금은 웹서비스만)
- 구독 가격·보상·최대 인원 실제 값

## 브랜치·커밋
- 브랜치: `feature/frontend-projects` (`develop`에서 분기), PR로 `develop`에 머지한다
- 커밋 메시지: README의 `유형: 변경 내용` 규칙

## 변경 이력
- 2026-10-30
  - 문서를 처음 만들었다. 개발자 프로젝트 9개 페이지(후보 포함)를 R101~R111, S101~S134로 정리했다.
  - 코드 작성 규칙(3계층 구조, 한글 주석)을 더했다.
  - 9개 페이지를 구현하고 `e2e/projects.spec.ts`를 추가했다. 홈 문서는 고치지 않고 달라지는 점만 "홈 문서와 맞춰야 할 것"에 적었다. 구현하면서 S103(HTTP 상태), S104(카드 3개), S125(테스트 없음), S134(클라이언트 컴포넌트 목록)와 데모 데이터를 고쳤다.

## 참고
- 페이지 URL: `docs/page-urls.md`
- 홈 문서(형식·공통 규칙): `docs/frontend-home.md`
- 폴더 구조와 규칙: `frontend/README.md`
- 제품 기록: `frontend/PRODUCT.md`
- 디자인 시스템: `frontend/DESIGN.md`, `docs/design-tokens.html`
- 모집 건 타입과 샘플: `frontend/src/features/recruitment/types.ts`, `mock.ts`
