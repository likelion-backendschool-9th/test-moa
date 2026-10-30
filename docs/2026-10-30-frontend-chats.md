# 프론트엔드 채팅함 (`/my/chats`)

## 한눈에
- 끝나면: `/my/chats`에 내가 들어가 있는 채팅방이 카드 목록으로 보인다. 카드 하나에 프로젝트 사진, 프로젝트명, 채팅 요청자(프로젝트 주인) 닉네임, 채팅 응답자(테스터) 닉네임, 최근 메시지 미리보기, 최근 일시, 더보기 버튼이 있다. 목록 위에서 채팅방 검색, 프로젝트별 보기, 최신순·오래된순 정렬을 하고, 상태는 URL(`q`, `project`, `sort`)에 남는다. 카드를 누르면 채팅방(`/my/chats/:roomKey`)으로 가고, 채팅방은 지금처럼 "준비 중".
- 결정 필요:
  1. 더보기 버튼에 넣을 항목. 임시안은 "채팅방 열기", "모집 글 보기" 메뉴다 (R5)
  2. 프로젝트 사진. 시연용 사진이 없어서 프로젝트 이름 첫 글자를 앉힌 활자 썸네일로 대신한다. 실제 사진을 보여 줘야 하면 샘플 이미지를 정해야 한다 (S117)
  3. 채팅방 화면을 이번에 같이 만들지. 임시안은 목록만 만들고 채팅방은 "준비 중"으로 둔다
- 규모: 7단계

## 맥락
- 채팅은 구독 개발자와 해당 모집 건에 선정된 테스터의 1대1 소통이다 (README 주요 서비스 구성). 그래서 채팅 요청자는 프로젝트 주인(개발자), 채팅 응답자는 테스터다.
- 개발자와 테스터는 한 계정이다 (마이페이지 문서 맥락). 같은 사람이 어떤 방에서는 요청자, 다른 방에서는 응답자일 수 있으므로, 목록을 역할로 나누지 않고 내가 들어가 있는 방을 모두 보여 준다.
- 요청에서 "모달"이라고 한 목록 한 칸은 카드(박스)다 (10-30 확인). 이 문서에서는 "채팅 카드"라고 부른다.
- 채팅방에는 따로 정한 이름이 없다. "채팅방 이름 검색"은 카드에 보이는 프로젝트명과 요청자·응답자 닉네임을 찾는 것으로 본다.
- "프로젝트별"은 묶어 보기가 아니라 한 프로젝트의 채팅방만 고르는 필터로 본다.
- 홈의 모집 카드는 이미지 파일 없이 서비스 이름 활자를 썸네일로 쓴다 (홈 S74). 채팅 카드도 같은 소재를 쓴다.
- 백엔드에는 채팅 테이블이 아직 없다. 프론트 목업으로 먼저 만든다.
- 채팅함은 마이페이지 메뉴가 없는 페이지다 (마이페이지 S97).

## 1. 접근 제어 (R1)
비로그인 사용자는 채팅함을 볼 수 없고 로그인으로 이동한다.

S114 비로그인
- Given `demo-role=guest`
- When  `/my/chats`에 접속한다
- Then  URL이 `/login?next=%2Fmy%2Fchats`이다

S115 로그인
- Given `demo-role=tester`
- When  `/my/chats`에 접속한다
- Then  HTTP 200이고 h1 "채팅함"이 있다
- Then  헤더의 "채팅" 탭에 `aria-current="page"`가 있다
- Then  "마이페이지 메뉴"가 없다

## 2. 채팅 카드 (R2)
카드 하나에 프로젝트 사진, 프로젝트명, 요청자 닉네임, 응답자 닉네임, 최근 메시지 미리보기, 최근 일시, 더보기 버튼이 있다. 카드를 누르면 채팅방으로 간다.

S116 카드 요소
- Given `demo-role=tester`
- Then  첫 카드에 "북로그", 요청자 "서재지기", 응답자 "윤슬", "피드백 마감이 이틀 남았어요. 막히는 부분 있으면 편하게 물어봐 주세요."가 있다
- Then  최근 일시는 `time` 요소이고 `datetime`에 ISO 시각이 있다
- Then  "북로그 채팅 더보기" 버튼이 있다

S117 프로젝트 사진
- Then  카드에 이미지 파일이 없고, 썸네일에 프로젝트 이름 첫 글자 "북"이 있다 (샘플에 사진이 없다)

S118 미리보기 한 줄
- Given 너비 375px
- Then  미리보기는 한 줄이고, 넘치는 글자는 "…"로 줄인다 (`-webkit-line-clamp: 1`)

S119 채팅방으로 이동
- When  첫 카드를 누른다
- Then  URL이 `/my/chats/booklog-yunseul`이고 "준비 중" 제목이 보인다

## 3. 순서와 일시 (R3)
기본은 최근 메시지가 최신인 방이 위에 온다. 일시는 오늘이면 시각, 어제면 "어제", 그 전이면 날짜로 쓴다.

S120 테스터
- Given `demo-role=tester`
- Then  카드 5개가 "북로그" → "모아플랜" → "레시피핏" → "가계부 노트" → "회의록 정리" 순서다
- Then  앞의 세 카드 일시는 "오후 3:12" 같은 시각, "어제", "10월 28일" 같은 날짜다

S121 개발자
- Given `demo-role=developer`
- Then  카드 4개가 "가계부 노트"(응답자 새벽코더) → "가계부 노트"(응답자 윤슬) → "북로그" → "회의록 정리" 순서다
- Then  세 번째 카드는 요청자 "서재지기", 응답자 "도현랩"이다 (같은 계정이 응답자로도 보인다)
- Then  두 번째 카드는 테스터의 "가계부 노트" 카드와 같은 채팅방(`/my/chats/ledger-yunseul`)이고 미리보기도 같다

## 4. 검색·프로젝트·정렬 (R4)
목록 위에서 채팅방 검색, 프로젝트별 보기, 정렬을 바로 바꾸고, 상태는 URL(`q`, `project`, `sort`)에 남는다. 채팅방이 하나도 없으면 이 영역을 보여 주지 않는다.

S122 검색
- Given `demo-role=tester`
- When  "채팅방 검색"에 "도현랩"을 입력한다 (300ms 뒤 반영)
- Then  URL에 `q=%EB%8F%84%ED%98%84%EB%9E%A9`가 붙고 카드 2개("가계부 노트", "회의록 정리")가 보인다
- Then  "채팅방 2개"가 `aria-live="polite"`로 읽힌다

S123 프로젝트
- Given `demo-role=developer`
- Then  "프로젝트" 칩이 "전체 4", "가계부 노트 2", "북로그 1", "회의록 정리 1" 순서다
- When  "가계부 노트" 칩을 누른다
- Then  URL에 `project=ledger-note`가 붙고 카드 2개가 보이며, 칩에 `aria-pressed="true"`가 있다
- When  "전체" 칩을 누른다
- Then  URL이 `/my/chats`이다

S124 정렬
- Given `demo-role=tester`
- When  "오래된순"을 누른다
- Then  URL에 `sort=oldest`가 붙고 첫 카드가 "회의록 정리", 마지막 카드가 "북로그"다

S125 결과 없음과 초기화
- When  "채팅방 검색"에 "없는채팅방"을 입력한다
- Then  "조건에 맞는 채팅방이 없어요"가 보인다
- When  "조건 초기화"를 누른다
- Then  URL이 `/my/chats`이고 카드 5개가 다시 보이며 검색창이 비어 있다

S126 URL로 열기
- Given `demo-role=developer`, `/my/chats?project=ledger-note&sort=oldest`로 연다
- Then  "가계부 노트" 칩과 "오래된순"이 눌린 상태이고 첫 카드의 응답자는 "윤슬"이다

## 5. 더보기 (R5)
더보기 버튼은 카드마다 메뉴를 연다. 메뉴에는 이미 있는 페이지로 가는 항목만 둔다. (결정 필요 1의 임시안)

S127 열기
- When  "북로그 채팅 더보기"를 누른다
- Then  버튼에 `aria-expanded="true"`가 있고 포커스가 첫 항목으로 간다
- Then  메뉴에 "채팅방 열기"(`/my/chats/booklog-yunseul`), "모집 글 보기"(`/recruitments/booklog`)가 있다

S128 키보드와 닫기
- When  아래 화살표를 누른다
- Then  포커스가 "모집 글 보기"로 간다
- When  Esc를 누른다
- Then  메뉴가 닫히고 포커스가 "북로그 채팅 더보기" 버튼으로 돌아온다
- When  메뉴를 다시 열고 메뉴 바깥을 누른다
- Then  메뉴가 닫힌다

## 6. 빈 상태 (R6)
채팅방이 없으면 채팅이 무엇인지와 다음 행동을 보여 준다.

S129 운영자
- Given `demo-role=admin`
- Then  "아직 채팅이 없어요"와 "채팅은 구독 모집 건의 개발자와 선정된 테스터가 1대1로 나눠요."가 보인다
- Then  "테스트 둘러보기"(`/recruitments`)가 보이고 "채팅방 검색"은 없다

S130 데이터 없음
- Given `demo-role=tester`, `demo-data=empty`
- Then  S129와 같은 빈 상태가 보이고 카드는 없다

## 7. 로딩 (R7)
제목은 바로 보이고, 데이터는 `features/chat/api.ts`에서 받는 동안 검색 영역과 카드 모양 스켈레톤을 보여 준다.

S131 지연
- Given `demo-data=slow`
- When  `/my/chats`에 접속한다 (응답 시작 직후)
- Then  h1 "채팅함"과 스켈레톤이 보인다
- Then  응답 뒤 카드 5개가 보이고 스켈레톤은 없다

## 8. 모바일 (R8)
좁은 화면에서도 카드 요소가 잘리지 않고, 가로 스크롤이 생기지 않는다.

S132
- Given 너비 375px, `demo-role=tester`
- Then  `document.documentElement.scrollWidth`가 375 이하다
- Then  첫 카드의 썸네일, 프로젝트명, 최근 일시, 더보기 버튼이 화면 안에 있다

## 9. 접근성 (R9)
목록 구조와 카드 이름이 보조 기술에 알려지고, 키보드로 카드와 더보기를 따로 쓸 수 있다.

S133
- Then  "채팅 목록"은 목록(`ul`)이고 카드는 각각 항목(`li`)이다
- Then  카드 링크 이름이 "북로그 채팅방"이다
- When  첫 카드 링크에 포커스를 두고 Tab을 누른다
- Then  포커스가 "북로그 채팅 더보기" 버튼에 있다 (링크 안에 버튼을 넣지 않는다)

## 10. 기존 테스트와 구조 (R10)
홈 테스트를 깨지 않고 구조 규칙을 지킨다.

S134 (기존 S26 수정)
- Then  `/my/chats`는 S26 "준비 중" 목록에서 빠지고, `/my/chats/booklog-yunseul`이 들어간다

S135 (기존 S78 수정)
- When  `grep -rl '"use client"' src`
- Then  기존 7개 + `ChatFilters`, `ChatCardMenu` 2개, 모두 9개다
- When  `grep -rln "mock" src --include='*.tsx'`
- Then  결과가 없다

## 범위 밖
- 채팅방 화면: 메시지 목록, 보내기, 실시간 수신 (`/my/chats/:roomKey`는 준비 중 유지)
- 채팅 시작(방 만들기). 구독 개발자가 선정된 테스터에게 거는 곳은 모집 관리 화면에서 정한다
- 안 읽은 메시지 수, 알림
- 채팅방 나가기, 신고, 차단 (기획 미정)
- 메시지 내용 검색, 요청한 방·받은 방 필터, 프로젝트별 묶어 보기, 페이지 나누기·무한 스크롤
- 사진·파일 메시지의 미리보기
- 실제 프로젝트 사진, 로그인·API·백엔드 채팅 테이블

## 작업 순서
1. 데이터 계층 — S114, S120~S126, S129~S131의 데이터
   - 파일: `src/features/chat/types.ts`, `mock.ts`, `query.ts`, `api.ts` (`getChatInbox(query)`: 비로그인은 `/login?next=%2Fmy%2Fchats`로 보내고, 검색·프로젝트·정렬을 적용하고, 프로젝트 칩 목록을 만들고, `demo-data`의 empty·slow를 반영한다. 패턴: `src/features/recruitment/api.ts`, `query.ts`)
   - 확인: `npx tsc --noEmit`
2. 일시 표시 — S120
   - 파일: `src/lib/format.ts`에 `formatChatTime(iso, now)` 추가 (`formatDday`처럼 기준 시각을 받는다)
3. 채팅 카드 — S116~S119, S133
   - 파일: `src/features/chat/components/ChatCard.tsx`, `ChatThumb.tsx` (`RecruitmentThumb`와 같은 소재를 정사각형으로 줄인 썸네일)
4. 더보기 메뉴 — S127, S128
   - 파일: `src/features/chat/components/ChatCardMenu.tsx` (`"use client"`. 첫 항목 포커스, 화살표 이동, Esc·Tab·바깥 클릭으로 닫기)
   - 토큰: `globals.css`에 `--z-popover` 추가 (메뉴가 다음 카드 위에 오되 헤더 아래)
5. 검색·프로젝트·정렬 — S122~S126
   - 파일: `src/features/chat/components/ChatFilters.tsx` (`"use client"`. 패턴: `RecruitmentFilters`)
6. 페이지·빈 상태·스켈레톤 — S115, S129~S132
   - 파일: `src/app/my/chats/page.tsx` (h1은 정적 셸, 목록은 Suspense 안에서 스트리밍. 패턴: `src/app/page.tsx`의 전체 테스트), `src/app/my/chats/[roomKey]/page.tsx` (`ComingSoon` "채팅방"), `ChatInbox.tsx`. 재사용: `Container`, `EmptyState`, `Skeleton`, `LinkButton`
7. 기존 테스트와 문서 — S134, S135
   - 파일: `e2e/links.spec.ts`, `docs/frontend-home.md` S26·S78, `frontend/DESIGN.md`·`docs/design-tokens.html`에 새 컴포넌트(채팅 카드, 작은 활자 썸네일, 아이콘 버튼, 더보기 메뉴)와 `--z-popover`
   - 확인: `npm run test:e2e && npm run lint && npm run build`, 개발 서버에서 1440px·375px 눈으로 확인

테스트: `e2e/chats.spec.ts`를 R1~R10 묶음으로 만들고, 테스트 이름은 S번호로 시작한다.

## 브랜치·커밋
- 브랜치: `feature/frontend-chats` (`origin/develop`에서 분기, upstream 해제)
- 커밋:
  - `Docs: 채팅함 계획` — 이 문서
  - `Feat: 채팅함 목록과 검색·정렬` — 단계 1~6
  - `Test: 채팅함 시나리오` — `e2e/chats.spec.ts`, `e2e/links.spec.ts`
  - `Docs: 채팅 컴포넌트를 디자인 토큰에 추가` — 단계 7 문서

## 가정
- 화면 배치: 본문은 최대 너비 4xl(56rem)의 한 열이다. 위에서부터 제목·한 줄 설명 → 검색창과 정렬 → 프로젝트 칩 → 결과 수 → 카드 목록이다. 카드는 왼쪽에 정사각형 썸네일, 가운데에 [프로젝트명 … 최근 일시], [요청자 · 응답자], [미리보기 한 줄], 오른쪽에 더보기 버튼이다.
- 카드 hover는 썸네일만 4px 올라간다 (DESIGN.md The Flat Sheet Rule). 그림자는 쓰지 않는다.
- 요청자·응답자 표기: 흐린 글씨 "요청자"·"응답자" 뒤에 굵은 닉네임. 내 닉네임을 따로 표시하지 않는다.
- 검색 대상은 프로젝트명과 요청자·응답자 닉네임이다. 대소문자를 구분하지 않는다.
- 프로젝트 칩은 "전체" 다음에 프로젝트 이름 가나다순이고, 칩마다 채팅방 수를 붙인다. 칩 값은 모집 건 slug다.
- 정렬은 최신순(기본, URL에 남기지 않음)과 오래된순 두 가지다. 기준은 최근 메시지 일시다.
- 일시 규칙(서울 시간): 오늘 "오후 3:12", 어제 "어제", 올해 "10월 28일", 작년 이전 "2025. 12. 3.". 작년 이전 샘플은 없어서 e2e로 확인하지 않는다. 오늘 샘플은 접속 1분 전이라, 자정 직후 1분 동안은 "어제"로 보일 수 있다.
- 시연용 샘플 (일시는 접속 시각 기준):

  | 채팅방 | 프로젝트 | 요청자 | 응답자 | 최근 메시지 | 최근 일시 |
  | --- | --- | --- | --- | --- | --- |
  | `booklog-yunseul` | 북로그 | 서재지기 | 윤슬 | 피드백 마감이 이틀 남았어요. 막히는 부분 있으면 편하게 물어봐 주세요. | 1분 전 |
  | `moaplan-yunseul` | 모아플랜 | 모아메이커 | 윤슬 | 참여 확정됐어요. 접속 링크로 들어가서 일정 만들기부터 해 보시면 돼요. | 1일 전 |
  | `recipefit-yunseul` | 레시피핏 | 냉장고셰프 | 윤슬 | 추천 결과에 남겨 주신 의견 반영해서 다음 주에 업데이트할게요. | 2일 전 |
  | `ledger-yunseul` | 가계부 노트 | 도현랩 | 윤슬 | 보내 주신 분류 오류 확인했어요. 다음 버전에서 고칠게요. | 4일 전 |
  | `meeting-yunseul` | 회의록 정리 | 도현랩 | 윤슬 | 요약 기능 써 보셨나요? 불편한 점 있으면 알려 주세요. | 9일 전 |
  | `ledger-saebyeok` | 가계부 노트 | 도현랩 | 새벽코더 | 영수증 사진이 흐리면 금액을 못 읽는 것 같아요. | 5분 전 |
  | `booklog-dohyeon` | 북로그 | 서재지기 | 도현랩 | 피드백 잘 받았어요. 참여해 주셔서 감사해요. | 6일 전 |

  - tester(윤슬)는 위 5개 방, developer(도현랩)는 `ledger-saebyeok`, `ledger-yunseul`, `booklog-dohyeon`, `meeting-yunseul` 4개 방에 들어가 있다.
  - 메시지 내용은 마이페이지 목업과 맞췄다: 북로그 피드백 제출 D-2, 모아플랜 참여 확정, 윤슬의 레시피핏·가계부 노트·회의록 정리 보상, 도현랩의 북로그 보상 6일 전.
  - 서재지기, 모아메이커, 냉장고셰프, 새벽코더는 기존 목업에 없어서 새로 정한 시연용 닉네임이다. 윤슬, 도현랩은 마이페이지 목업의 닉네임이다.
- 가계부 노트와 회의록 정리는 모집 목업에서 일반 모집(`isSubscription: false`)이지만, 마이페이지 목업에는 구독 기능인 "지원자 선정"과 피드백 확인이 있다. 채팅 목업은 마이페이지 쪽을 따라 두 프로젝트를 도현랩의 구독 모집으로 본다. 모집 목업을 고칠지는 따로 정한다.
- 운영자는 서비스 이용 회원이 아니라고 보고(마이페이지 문서와 같다) 채팅방이 없다.
- 채팅방 키(`roomKey`)는 시연용으로 "프로젝트-응답자"로 만든다. 실제 키 형식은 API를 붙일 때 정한다.
- 디자인은 `DESIGN.md` 토큰과 `components/ui`만 쓴다. 새 hex·px 값을 넣지 않는다. 새 값은 겹침 토큰 `--z-popover` 하나다.

## 변경 이력
- 10-30 1차: 채팅함 목록 계획. 카드 요소 7개(프로젝트 사진, 프로젝트명, 요청자, 응답자, 최근 메시지 미리보기, 최근 일시, 더보기)는 요청대로 넣었다.
- 10-30 2차: "모달"은 카드로 확인. 목록 위 검색·프로젝트별 보기·정렬(R4)을 넣고, 샘플을 7개 방으로 늘렸다. 아직 구현 전이라 S번호를 S114~S135로 다시 매겼다. 새 컴포넌트는 디자인 토큰 문서에 올린다.

## 참고 (2026-10-30 확인)
- 페이지 URL: `docs/page-urls.md` 채팅 섹션 (`/my/chats` 채팅함, `/my/chats/:roomKey` 채팅방, 둘 다 확정)
- 채팅 정의와 구독 혜택: `README.md` 주요 서비스 구성, 개발자 구독, 기능 후보 우선순위 3번
- 한 계정 원칙, 마이페이지 메뉴가 없는 페이지: `docs/2026-10-30-frontend-my.md` 맥락, S97
- 활자 썸네일: `frontend/src/features/recruitment/components/RecruitmentThumb.tsx`, `docs/frontend-home.md` S74
- 검색·필터 URL 상태 패턴: `frontend/src/features/recruitment/query.ts`, `RecruitmentFilters.tsx`, `docs/frontend-home.md` R9
- 디자인: `frontend/DESIGN.md`, `docs/design-tokens.html`
- 프로젝트 사진 데이터: `backend/src/main/java/com/testmoa/backend/domain/entity/ProjectImage.java` (`url`, `sortOrder`). 채팅 엔티티는 아직 없다.
- 세션 목업: `src/lib/session.ts`, 시연용 데이터 전환: `src/lib/demo.ts`
