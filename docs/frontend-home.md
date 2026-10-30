# 프론트엔드 서비스 홈 (`/`)

지금 홈 화면이 지켜야 하는 요구사항(R)과 시나리오(S)를 모은 문서다. S번호는 `frontend/e2e`의 테스트 이름과 1:1로 맞는다. 테스트를 추가하거나 바꾸면 이 문서도 함께 고친다.

## 한눈에
- 스택: Next.js 16(App Router, Cache Components), Tailwind CSS v4, TypeScript, Playwright E2E. 실행 방법은 `frontend/README.md`를 본다.
- 화면 구성(위에서부터):
  1. 한 줄 헤더: 로고, 카테고리 탭, 검색창, 계정 영역
  2. 히어로 배너(소개 → 이벤트 → 공지 순환)와 "마감 임박 테스트 1~5" 패널
  3. 구독 모집: 구독 개발자의 모집 글
  4. 전체 테스트: 검색·카테고리·모집 중·정렬이 되는 그리드
- 디자인: uibowl 갤러리 문법에 교정쇄 소재를 입혔다. 라이트는 교정쇄 바탕, 다크는 uibowl 바탕이고, 강조는 두 모드 모두 에메랄드 계열이다. 글꼴은 Wanted Sans 하나다. 토큰과 규칙은 `frontend/DESIGN.md`와 `docs/design-tokens.html`에 있다.
- 데이터: 로그인과 API는 아직 목업이다. 쿠키 `demo-role`과 `demo-data`로 상태를 바꾼다. 개발 서버에서는 푸터의 "시연용" 선택 상자를 쓴다.
- 페이지 URL: `docs/page-urls.md`

## 1. 테마와 글꼴 (R1)
라이트·다크는 OS 설정을 따르고, 색·모션 값은 `globals.css` 토큰에만 정의하며, 글꼴은 Wanted Sans 하나다.

S56 라이트
- Given `prefers-color-scheme: light`
- Then  `body` 배경이 `rgb(239, 239, 236)`이다
- Then  `--accent`가 `#0f7c4a`이다

S57 다크
- Given `prefers-color-scheme: dark`
- Then  `body` 배경이 `rgb(0, 0, 0)`이다
- Then  `--accent`가 `#129357`이다

S58 글꼴
- Then  `body`의 `font-family`가 Wanted Sans로 시작한다

S80 공유 이미지
- Then  `og:image` 메타 태그가 있다
- Then  그 주소가 200, `image/png`로 열린다

## 2. 헤더와 계정 (R2)
헤더 오른쪽은 로그인 상태에 따라 계정 버튼이나 내 정보·보유 크레딧을 보여 준다.

S2 로그인
- Given `demo-role=tester` (크레딧 12480)
- Then  "Test Moa" 로고 링크(`/`), "내 정보"(`/my/profile/edit`), "12,480 크레딧"(`/my/credits`)이 있다
- Then  "로그인"은 없다

S3 비로그인
- Given `demo-role=guest`
- Then  "로그인"(`/login`), "회원가입"(`/signup`)이 있고 "내 정보"와 크레딧은 없다

S4 쿠키 없음
- Then  tester로 본다

S5 알 수 없는 역할
- Given `demo-role=foo`
- Then  HTTP 200이고 tester로 본다

## 3. 카테고리 탭 (R3)
탭은 page-urls.md의 섹션을 따르고, 현재 탭을 표시하며, 운영자 탭은 운영자에게만 보인다.

S6 일반 사용자
- Then  탭 6개가 순서대로 있다: 홈 `/`, 테스트 모집 `/recruitments`, 참여 테스트 `/my/participations`, 내 프로젝트 `/my/projects`, 채팅 `/my/chats`, 마이페이지 `/my`
- Then  "운영자 페이지" 탭은 없고, "홈"에 `aria-current="page"`가 있다

S7 운영자
- Given `demo-role=admin`
- Then  7번째 탭 "운영자 페이지"가 `/admin`을 가리킨다

S8 탭 이동
- When  "테스트 모집"을 누른다
- Then  URL이 `/recruitments`이고 그 탭이 현재 탭이다

S9 비로그인 보호 탭
- Given `demo-role=guest`
- When  "참여 테스트"를 누른다
- Then  URL이 `/login?next=%2Fmy%2Fparticipations`이다

## 4. 모바일 메뉴 (R4)
너비 768px 미만에서는 탭 대신 메뉴 버튼이 나오고, 화면 전체 높이 패널이 열린다.

S10 메뉴 버튼
- Given 너비 375px
- Then  탭 줄은 없고 "메뉴 열기" 버튼이 있다

S11 열기와 닫기
- When  "메뉴 열기"를 누른다
- Then  패널 높이가 뷰포트와 같고, 탭 링크 6개가 있으며, 버튼 이름이 "메뉴 닫기"다
- When  Esc를 누른다
- Then  패널이 닫히고 포커스가 메뉴 버튼으로 돌아온다

S12 링크 이동 후 닫힘
- When  패널에서 "테스트 모집"을 누른다
- Then  URL이 `/recruitments`이고 패널이 닫힌다

S81 내 정보 위치
- Then  좁은 화면 헤더에는 "내 정보"가 없고, 패널 안에 있다(`/my/profile/edit`)

## 5. 검색 (R5)
헤더 검색과 모바일 메뉴 검색은 홈의 전체 테스트 그리드를 검색한다.

S59 헤더 검색
- Given 너비 1440px
- When  헤더 검색창에 "가계부"를 입력하고 Enter를 누른다
- Then  URL이 `/?q=%EA%B0%80%EA%B3%84%EB%B6%80#all-tests`이다
- Then  전체 테스트에 "가계부 노트" 카드 1개만 보인다

S82 모바일 메뉴 검색
- Given 너비 375px, 메뉴가 열려 있다
- When  패널 검색창에 "가계부"를 입력하고 Enter를 누른다
- Then  URL에 `q=%EA%B0%80%EA%B3%84%EB%B6%80`가 붙고 패널이 닫힌다

## 6. 히어로 배너 (R6)
배너는 서비스 소개, 이벤트, 공지를 5초마다 순환한다. hover·focus 중이거나 reduced motion이면 멈춘다.

S61 첫 화면
- Then  제목이 "새 서비스를 먼저 써 보고 크레딧을 받으세요"이고 "1 / 3"이 보인다
- Then  "테스트 둘러보기"가 `#all-tests`를 가리킨다

S62 이벤트
- Given `data-autoplay="on"`
- When  5초가 지난다
- Then  "2 / 3", "이벤트", "시연용"이 보이고 "자세히 보기"가 `/events`를 가리킨다

S63 공지
- When  소개에서 "이전"을 누른다
- Then  "3 / 3", "공지"가 보이고 "자세히 보기"가 `/notices`를 가리킨다

S64 멈춤
- Given 배너 위에 마우스가 있다 (또는 `prefers-reduced-motion: reduce`)
- When  10초가 지난다
- Then  여전히 "1 / 3"이다

## 7. 마감 임박 패널 (R7)
배너 옆 패널은 마감 전이고 정원이 남은 모집 글을 마감이 가까운 순서로 5개 보여 준다.

S65
- Then  목록이 5개이고 첫 항목은 "회의록 정리", "D-1"이다
- Then  정원이 찬 "포트폴리오 빌더"는 없다

## 8. 구독 모집 (R8)
배너 아래에는 구독 개발자의 모집 글만 모아 보여 준다. 모든 방문자에게 보인다.

S66 정상
- Then  "구독 모집" 영역에 카드 3개("북로그", "모아플랜", "레시피핏")가 있고, 모두 "추가 보상"이 있다

S67 없음
- Given `demo-data=empty`
- Then  "구독하면 이 자리에 모집 글이 노출돼요"와 "구독 알아보기"(`/my/subscription`)가 보인다

## 9. 전체 테스트 (R9)
전체 모집 글 그리드에서 검색, 카테고리, 모집 중만 보기, 정렬을 홈에서 바로 바꾸고, 상태는 URL(`q`, `type`, `open`, `sort`)에 남는다.

S68 기본
- Then  카드 10개가 최신순이고 첫 카드는 "가계부 노트", "10개"가 보인다

S69 검색
- When  그리드 검색창에 "일정"을 입력한다 (300ms 뒤 반영)
- Then  URL에 `q=%EC%9D%BC%EC%A0%95`가 붙고 "모아플랜"만 보인다

S70 카테고리와 초기화
- When  "게임"을 누른다
- Then  URL에 `type=game`이 붙고 "조건에 맞는 테스트가 없어요"가 보인다
- When  "조건 초기화"를 누른다
- Then  URL이 `/`이고 카드 10개가 다시 보인다

S71 모집 중만
- When  "모집 중만 보기"를 켠다
- Then  URL에 `open=1`이 붙고 카드 9개, "포트폴리오 빌더"는 없다

S72 정렬
- When  "마감 임박순"을 누른다
- Then  첫 카드가 "회의록 정리"다
- When  "보상 많은순"을 누른다
- Then  첫 카드가 "북로그"다

S73 URL로 열기
- Given `/?type=web&open=1&sort=deadline`으로 연다
- Then  "웹서비스", "모집 중만 보기", "마감 임박순"이 눌린 상태이고 첫 카드가 "회의록 정리"다

S74 활자 썸네일과 도장
- Then  카드에 이미지 파일이 없다 (썸네일은 서비스 이름 활자)
- Then  정원이 찬 카드에 "모집 완료" 도장(`role="img"`)이 있다

## 10. 로딩 (R10)
배너는 데이터를 기다리지 않고, 목록은 카드 모양 스켈레톤을 먼저 보여 준다.

S75
- Given `demo-data=slow` (1.5초 지연)
- When  `/`에 접속한다 (응답 시작 직후)
- Then  소개 배너 제목이 이미 보이고 카드 스켈레톤이 보인다
- Then  응답 뒤 카드 10개가 보이고 스켈레톤은 없다

## 11. 빈 링크와 404 (R11)
홈의 모든 링크는 404 없이 열리고, 아직 없는 페이지는 "준비 중" 화면을 보여 준다.

S26 준비 중 페이지와 내부 링크
- Given `/recruitments`, `/recruitments/:slug`, `/my/participations`, `/my/projects`, `/my/chats`, `/my/credits`, `/my/credits/withdrawals`, `/my/subscription`, `/login`, `/signup`, `/terms`, `/privacy`, `/events`, `/notices`
- Then  각각 HTTP 200이고 "준비 중" 제목과 "홈으로" 링크가 있다
- Then  홈의 내부 링크는 모두 200으로 열린다

S27 없는 주소
- When  `/nope`에 접속한다
- Then  HTTP 404이고 맞춤 404에 "홈으로" 링크가 있다

## 12. 접근성 (R12)
키보드만으로 홈을 쓸 수 있고, 상태는 보조 기술에 알려진다.

S35 본문 바로가기
- When  Tab을 한 번 누른다
- Then  "본문으로 건너뛰기"가 보이고 포커스된다
- When  Enter를 누른다
- Then  포커스가 `main`으로 간다

S36 포커스 링
- When  Tab으로 "테스트 모집" 탭에 간다
- Then  `outline-style`이 `none`이 아니다

S79 이름과 상태
- Then  검색창 두 개 모두 이름이 "테스트 검색"이다
- Then  결과 수가 `aria-live="polite"`로 읽힌다
- Then  카테고리 칩은 `aria-pressed`로 선택 상태를 알린다

## 13. 구조 (R13)
필터 조작만 클라이언트에서 하고, 검색·정렬과 목업 데이터는 데이터 접근 계층에만 둔다. 확인은 grep으로 한다.

S78
- When  `grep -rl '"use client"' src`
- Then  Carousel, HeaderSearch, MainNav, MobileMenu, DemoSwitcher, RecruitmentFilters 6개에 다른 페이지 문서가 더한 7개, 모두 13개만 나온다: AccountNav(`docs/2026-10-30-frontend-my.md`), ProjectForm·RecruitmentForm·ApplicantList·FeedbackList(`docs/frontend-projects.md` S134), ProfileForm·PasswordForm(`docs/2026-10-30-frontend-profile-edit.md` S181)
- When  `grep -rnE '#[0-9a-fA-F]{3,6}\b|\[[0-9]+px\]' src/components src/features`
- Then  결과가 없다
- When  `grep -rln "mock" src --include='*.tsx'`
- Then  결과가 없다 (`mock.ts`는 각 `api.ts`만 불러온다)

## 데모 데이터와 가정
- 모집 글 10개(구독 3, 일반 7)와 이벤트·공지 각 1개는 시연용 샘플이다. 날짜는 접속 시각 기준으로 계산해서, 언제 열어도 마감 전으로 보인다.
- 보상 크레딧, 배너 순환 간격(5초), 상단 노출 슬롯 수는 기획에서 미정이라 임시로 정한 값이다.
- 이벤트·공지 문구는 금액이나 혜택을 약속하지 않는다.
- 마감 임박 순위의 기준은 모집 마감일이다.
- 카테고리 중 웹서비스 외에는 모집 글이 없어서 빈 상태가 보인다.

## 범위 밖
- 홈 외 페이지의 실제 내용 (준비 중 화면만 있다. 마이페이지 `/my`는 `docs/2026-10-30-frontend-my.md`)
- 실제 로그인, API, 결제 연동
- 페이지 나누기·무한 스크롤
- 실제 서비스 스크린샷 썸네일
- 아직 확인하지 않은 것: 768~1023px 폭(그리드 2열 구간), hover·focus 상태의 화면 검토

## 브랜치·커밋
- 브랜치: `feature/frontend-home` (`develop`에서 분기)
- 커밋 메시지: README의 `유형: 변경 내용` 규칙

## 변경 이력
- 2026-10-30
  - 홈을 와이어프레임(헤더, 탭 줄, 배너, 카드 5개 한 줄) 기준으로 처음 만들었다. 첫 마케팅 랜딩안(혜택, FAQ, 태그라인 리빌)은 쓰지 않았다.
  - URL을 바꿨다: 모집 `tests` → `recruitments`, 참여 테스트 `/my/tests` → `/my/participations`, 프로젝트 하위 모집도 `recruitments`
  - 배너 첫 장에 서비스 소개를 넣었다. 이용 방법 3단계와 FAQ를 넣었다가 리디자인 때 뺐다.
  - redesign 점검(A 항목)을 반영했다: 다크 강조색 채도 낮춤, z-index 토큰, 공유 이미지 등
  - impeccable 리디자인: uibowl 참고 갤러리형(라이트 교정쇄, 다크 uibowl)으로 바꿨다. 배너는 소개·이벤트·공지, 그 아래 구독 모집과 전체 테스트 그리드다. 마무리 리뷰는 fix 판정 후 7개 수정, ship.
  - 강조색을 라이트·다크 모두 에메랄드 계열로 통일했다(`#0f7c4a` / `#129357`).
  - 문서를 이 파일 하나로 합쳤다. 테스트 묶음 번호를 R1~R13으로 다시 매기고, 공유 이미지·내 정보 위치·모바일 검색에 S80~S82를 붙였다. 지난 변경을 확인하던 S77(이용 방법·FAQ 없음)은 지웠다.

## 참고
- 제품 기록: `frontend/PRODUCT.md`
- 디자인 시스템: `frontend/DESIGN.md`, `frontend/.impeccable/design.json`, `docs/design-tokens.html`
- 방향 계약서: `frontend/.impeccable/surfaces/src-app-page-tsx.md`
- 기획 근거: `project-lion/.scratch/tester-platform-planning/spec.md` 91행(상단 순환 노출), `README.md`(크레딧·보상 규칙)
