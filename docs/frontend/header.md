# 프론트엔드 헤더 정리와 로그아웃

시나리오 제목 끝의 태그가 확인 방법이다. `[테스트]`만 e2e 테스트와 1:1이고, `[테스트: 파일 번호]`는 그 테스트가 대신 확인한다. `[명령]`은 명령 한 번, `[직접]`은 사람이 화면을 보고 확인한다. (고침 #56: `docs/test-cleanup.md`)

## 한눈에
- 끝나면: 헤더 카테고리 탭은 참여 테스트·내 프로젝트·채팅(운영자는 운영자 페이지 추가)만 남는다. 홈은 로고로 간다. "홈"·"테스트 모집" 탭과 헤더 검색창(모바일 메뉴 검색 포함)은 없어진다. 오른쪽은 로그인하면 보유 크레딧·"마이페이지"·"로그아웃", 비로그인이면 "로그인"·"회원가입"이다. 로그아웃하면 비로그인이 되고 홈으로 간다. 로그인 상태에서 탭·버튼 글자가 두 줄로 깨지지 않는다.
- 결정 필요: 없음 (11-01 확정: "내 정보" 삭제, "마이페이지"는 탭에서 오른쪽으로 옮김, 크레딧 버튼 유지하되 보이는 글자는 동전 아이콘과 숫자만("크레딧" 글자 삭제, 화면 낭독기에는 "보유 크레딧 12,480"으로 읽힘), 로그아웃 뒤 홈, "테스트 모집" 탭·헤더 검색 삭제 — 검색은 홈 전체 테스트 그리드에서 한다, "홈" 탭 삭제 — 로고가 홈으로 간다)
- 브랜치: `feature/frontend-header` (`feature/frontend-auth`에서 분기). PR base는 `feature/frontend-auth`, Draft로 올리고 auth PR 병합 뒤 Ready로 바꾼다
- 규모: 5단계, 약 3~4시간

## 맥락
- 헤더는 `src/components/layout/`의 `AppHeader`(배치), `NavList`·`MainNav`(탭), `HeaderSearch`(검색창), `UserMenu`(오른쪽), `MobileMenu`(좁은 화면 패널)로 되어 있고, 탭 정의는 `src/lib/nav.ts`의 `NAV`다.
- 지금 1280px 이상에서는 로고·탭·검색창(최대 384px)·오른쪽을 한 줄에 줄바꿈 없이 놓는다. 한 줄에 필요한 폭은 비로그인 1241px, 테스터 1306px, 운영자 1373px(11-01 측정)라서, 로그인 상태에서 1280~1372px일 때 자리가 모자라 띄어쓰기마다 글자가 줄바꿈된다("테스트 / 모집", "test / moa", "12,480 / 크레딧").
- 로그인은 `demo-role` 쿠키를 바꾸는 목업이다(`docs/frontend/auth.md`). 쿠키가 없으면 테스터로 보므로, 로그아웃은 쿠키를 지우지 않고 `guest`로 넣는다.
- 홈 전체 테스트 그리드에는 검색창이 따로 있다(`docs/frontend/home.md` S69). 헤더 검색은 그 그리드로 보내는 입구였다.
- "테스트 모집" 탭이 가던 `/recruitments`는 아직 준비 중 페이지다. 페이지는 남기고 헤더 진입점만 없앤다.

## 1. 오른쪽 계정 영역 (R175)
S341 로그인 [테스트]
- Given `demo-role=tester`
- Then  헤더에 보유 크레딧(`/my/credits`), "마이페이지"(`/my`), "로그아웃" 버튼이 이 순서로 있다 (고침 11-02: 로그아웃이 바탕색 없는 글자 버튼이라, 바탕색 있는 크레딧을 앞에 두고 글자 버튼인 마이페이지·로그아웃을 나란히 둠)
- Then  크레딧 링크의 보이는 글자는 "12,480"(동전 아이콘 + 숫자)이고 "크레딧"이라는 글자는 보이지 않는다
- Then  크레딧 링크의 이름(접근성 이름)은 "보유 크레딧 12,480"이고, 마우스를 올리면 같은 문구가 보인다(`title`)
- Then  "내 정보" 링크는 없다

S342 비로그인 [테스트]
- Given `demo-role=guest`
- Then  헤더에 "로그인"(`/login`), "회원가입"(`/signup`)이 있고 "마이페이지"·크레딧·"로그아웃"은 없다

S343 운영자·개발자 [직접]
- Given `demo-role=admin` 또는 `developer`
- Then  "마이페이지", 보유 크레딧(이름 "보유 크레딧 0", "보유 크레딧 3,260"), "로그아웃"이 있다

S344 마이페이지 현재 위치 [직접]
- Given `demo-role=tester`
- When  `/my` 또는 `/my/profile/edit`에 접속한다
- Then  헤더의 "마이페이지"에 `aria-current="page"`가 있다
- When  `/my/credits` 또는 `/my/projects`에 접속한다
- Then  "마이페이지"에 `aria-current`가 없다 (크레딧은 별도 버튼, 내 프로젝트는 탭이 따로 있다)
- Then  `docs/frontend/my.md` S84의 "마이페이지 탭이 현재 탭"은 헤더 "마이페이지"로 확인한다

## 2. 로그아웃 (R176)
S345 로그아웃 [테스트]
- Given `demo-role=tester`, `/my/credits`
- When  헤더의 "로그아웃"을 누른다
- Then  URL이 `/`다
- Then  헤더에 "로그인"·"회원가입"이 있다
- Then  `demo-role` 쿠키 값이 `guest`다

S346 로그아웃 뒤 보호 페이지 [테스트]
- Given S345처럼 로그아웃했다
- When  `/my`에 접속한다
- Then  URL이 `/login?next=%2Fmy`다

## 3. 카테고리 탭 (R177)
S323 일반 사용자 [테스트]
- Given `demo-role=tester`
- Then  "주요 메뉴" 탭은 "참여 테스트"(`/my/participations`), "내 프로젝트"(`/my/projects`), "채팅"(`/my/chats`) 3개다
- Then  "홈", "테스트 모집", "마이페이지" 탭은 없다
- Then  "Test Moa" 로고 링크가 `/`로 간다

S334 홈에서는 현재 탭이 없다 [테스트]
- Given `demo-role=tester`, `/`
- Then  "주요 메뉴"의 어떤 탭에도 `aria-current`가 없다
- When  `/my/projects`에 접속한다
- Then  "내 프로젝트"에 `aria-current="page"`가 있다

S324 운영자 [테스트]
- Given `demo-role=admin`
- Then  탭은 4개이고 마지막이 "운영자 페이지"(`/admin`)다

S325 비로그인 보호 탭 (기존 S9 유지) [테스트: pages.spec.ts #56-S2]
- Given `demo-role=guest`
- When  "참여 테스트" 탭을 누른다
- Then  URL이 `/login?next=%2Fmy%2Fparticipations`다

## 4. 검색 진입점 정리 (R178)
S326 헤더·모바일 메뉴 검색 없음 [직접]
- Given 너비 1440px, 그리고 너비 375px에서 메뉴를 연 상태
- Then  `banner`와 모바일 메뉴 패널 안에 `searchbox`가 없다
- Then  홈(`/`)에서 "테스트 검색" 검색창은 전체 테스트 그리드의 1개뿐이다

## 5. 모바일 메뉴 (R179)
좁은 화면(768px 미만)에서는 헤더에 로고·크레딧·메뉴 버튼만 두고, "마이페이지"와 "로그아웃"은 메뉴 패널로 옮긴다. 비로그인은 지금처럼 헤더에 "로그인"·"회원가입"을 둔다.

S327 로그인 상태 패널 [직접]
- Given `demo-role=tester`, 너비 375px
- Then  헤더에 "마이페이지"·"로그아웃"이 보이지 않고 보유 크레딧("12,480")은 보인다
- When  "메뉴 열기"를 누른다
- Then  패널에 탭 3개("참여 테스트", "내 프로젝트", "채팅")와 "마이페이지"(`/my`) 링크, "로그아웃" 버튼이 있다
- Then  패널에 "홈", "테스트 모집", "내 정보"가 없다. 패널이 열려 있어도 헤더의 로고는 보이고 누르면 홈으로 가며 패널이 닫힌다

S328 패널에서 로그아웃 [테스트]
- When  패널의 "로그아웃"을 누른다
- Then  URL이 `/`이고 패널이 닫혀 있으며 헤더에 "로그인"이 있다

S329 비로그인 패널 [직접]
- Given `demo-role=guest`, 너비 375px
- When  "메뉴 열기"를 누른다
- Then  패널에 탭 3개만 있고 "마이페이지"·"로그아웃"은 없다

## 6. 깨지지 않는 배치 (R180)
S330 글자 줄바꿈 없음 [직접]
- Given 역할 guest·tester·developer·admin × 너비 768·1024·1280·1366·1440px
- Then  헤더 안의 링크·버튼은 모두 한 줄이다 (각 요소 높이 44px 이하)
- Then  헤더에 가로 스크롤이 없다 (`scrollWidth <= clientWidth`)

S331 한 줄 배치 기준 [직접]
- Given 너비 1024px 이상
- Then  로고·탭·오른쪽 영역이 한 줄에 있다 (세 요소의 세로 중심 차이 4px 이하)
- Given 너비 768~1023px
- Then  탭은 로고 아래 줄에 있고 글자는 깨지지 않는다

## 7. 기존 테스트와 문서 (R181)
S332 기존 시나리오 정리 [직접]
- Then  `docs/frontend/home.md`와 e2e를 아래처럼 고친다
  - S2·S3(`header.spec.ts`): "내 정보" → "마이페이지"(`/my`)와 "로그아웃" (S341·S342로 대체)
  - S4·S5(`header.spec.ts`): 크레딧 링크 이름 "12,480 크레딧" → "보유 크레딧 12,480"
  - S6·S7·S8(`nav.spec.ts`): 탭 6·7개 → 3·4개, 홈이 현재 탭이던 확인은 S334로 대체, 탭 이동 예시는 "참여 테스트"
  - S11·S12(`mobile-menu.spec.ts`): 패널 탭 수 3개, 링크 이동 예시는 "참여 테스트"
  - S81(`mobile-menu.spec.ts`): "내 정보 위치" → S327로 대체
  - S59(`home-gallery.spec.ts`)·S82(`mobile-menu.spec.ts`): 헤더·패널 검색 삭제 (S326으로 대체)
  - S79(`home-gallery.spec.ts`): 검색창 2개 → 1개
  - S36(`a11y.spec.ts`): 포커스 링 확인 탭을 "참여 테스트"로
  - `auth.spec.ts`의 로그인 확인: "내 정보" → "마이페이지"
- Then  `docs/frontend/auth.md` 범위 밖의 "로그아웃"을 이 문서로 옮겼다고 적는다

S333 구조 [명령]
- When  `grep -rn "HeaderSearch" src`
- Then  결과가 없다 (파일 삭제)
- When  `grep -rl '"use client"' src`
- Then  `HeaderSearch`가 빠지고 `MyPageLink`(현재 위치 표시에 경로를 읽음)가 더해져 개수(19개)는 같다. `MobileMenu`는 그대로 클라이언트 컴포넌트다

## 범위 밖
- `/recruitments` 페이지 자체(준비 중 그대로), 홈 그리드 검색 동작
- 사용자 메뉴 드롭다운, 알림, 프로필 사진
- 실제 세션 만료·토큰 폐기 (목업)

## 작업 순서
1. 탭과 검색 정리 — S323~S326, S334
   - `src/lib/nav.ts`의 `NAV`에서 "홈"·"테스트 모집"·"마이페이지" 삭제
   - `src/components/layout/HeaderSearch.tsx` 삭제, `AppHeader`·`MobileMenu`에서 사용처 삭제
2. 로그아웃 — S345, S346
   - `src/features/auth/actions.ts`에 `logout()`: `demo-role`을 `guest`로(로그인과 같은 쿠키 속성) 넣고 `redirect("/")`
3. 오른쪽 영역과 모바일 메뉴 — S341~S344, S327~S329
   - `UserMenu`: "내 정보" → "마이페이지"(`/my`, 768px 미만 숨김), 크레딧 버튼은 아이콘 + 숫자만 보이고 `aria-label`·`title`은 "보유 크레딧 12,480"(숫자는 `formatCredits` 대신 숫자만 포맷하는 함수를 `lib/format.ts`에 추가), `<form action={logout}>`의 "로그아웃" 보조(ghost) 버튼(768px 미만 숨김). 마이페이지 현재 위치 표시는 `usePathname`이 필요해 작은 클라이언트 컴포넌트로 분리하거나 `MainNav`처럼 처리
   - `MobileMenu`: 계정 링크 자리에 "마이페이지"와 로그아웃 폼. 로그아웃 액션은 `features/auth/actions`에서 가져온다
   - `AppHeader`의 `getAccountLinks` 정리
4. 배치 — S330, S331
   - 한 줄 기준을 `xl`(1280px)에서 `lg`(1024px)로 내린다 (11-02 측정: 한 줄에 필요한 폭은 비로그인 612px, 테스터 750px, 개발자 741px, 운영자 813px. 768px 기준은 운영자가 넘쳐서 1024px로 확정)
   - 탭·로고·오른쪽 버튼 글자에 `whitespace-nowrap`을 걸어, 폭이 모자라도 글자가 쪼개지지 않게 한다
5. 테스트·문서 — S332, S333
   - `e2e/header.spec.ts`(새 S341~S346 포함), `nav.spec.ts`, `mobile-menu.spec.ts`, `home-gallery.spec.ts`, `a11y.spec.ts`, `auth.spec.ts`, 새 `e2e/header-layout.spec.ts`(S330·S331)
   - `docs/frontend/home.md` R2~R5·R12 갱신, `docs/frontend/auth.md` 범위 밖 갱신
   - 확인: `cd frontend && npm run lint && npx tsc --noEmit && npm run test:e2e`, 개발 서버에서 375·1024·1280·1440px와 다크 모드 확인

## 가정
- 로그아웃 버튼은 보조(ghost) 버튼이다. 헤더의 주 버튼은 비로그인일 때 "회원가입" 하나뿐이다 (DESIGN.md The One Green Rule).
- 768px 미만에서 크레딧 버튼은 헤더에 남긴다. 테스터가 가장 자주 보는 값이라서다.
- S번호는 S323~S334와 S341~S346을 쓴다. 처음에는 로그인·회원가입 문서의 마지막 번호(S316) 다음인 S317~S334를 썼지만, 채팅(PR #20)의 S317~S322와 겹쳐 11-02에 앞의 여섯 개(로그인, 비로그인, 운영자·개발자, 마이페이지 현재 위치, 로그아웃, 로그아웃 뒤 보호 페이지)를 S341~S346으로 옮겼다.

## 참고 (2026-11-01 확인)
- 헤더 코드: `frontend/src/components/layout/AppHeader.tsx`, `NavList.tsx`, `UserMenu.tsx`, `MobileMenu.tsx`, `HeaderSearch.tsx`, `frontend/src/lib/nav.ts`
- 기존 시나리오: `docs/frontend/home.md` R2~R5, R12
- 로그인 목업: `docs/frontend/auth.md`, `frontend/src/features/auth/actions.ts`
