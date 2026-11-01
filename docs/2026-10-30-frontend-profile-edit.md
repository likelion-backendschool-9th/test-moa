# 프론트엔드 개인정보 수정 (`/my/profile/edit`)

## 한눈에
- 끝나면: `/my/profile/edit`에서 이름·닉네임을 고쳐 저장하고, 현재 비밀번호를 확인한 뒤 새 비밀번호로 바꾼다. 이메일은 보이기만 한다. 입력이 틀리면 칸 아래에 이유가 보인다. 저장은 목업이라 성공 메시지만 보이고 새로고침하면 원래 값이다.
- 결정 필요: 없음 (수정 항목: 이름·닉네임 + 비밀번호 변경, 브랜치: develop에서 새로 — 10-30 확정)
- 규모: 5단계, 약 3~4시간

## 맥락
- 지금 `/my/profile/edit`은 "준비 중"이다. 마이페이지 메뉴 "개인정보 수정", 대시보드 프로필의 "개인정보 수정", 헤더·모바일 메뉴의 "내 정보"가 여기로 온다.
- 회원 정보는 이름·닉네임·이메일 세 가지다 (`features/my/types.ts`의 `Profile`). 기획서에 수정 규칙은 없다.
- 개발자와 테스터는 한 계정이다. 화면을 역할로 나누지 않는다.
- 백엔드는 고려하지 않는다. 데이터와 제출은 모두 목업이다.
- 크레딧 PR(#9)의 출금 폼 `Field` 패턴, `Button shape="field"`, `.select-field`는 쓰지 않는다 (금액 폼이 아니므로 알약 규칙). (고침 11-01: PR #9가 develop에 병합됨)

## 1. 접근 제어 (R1)
비로그인 사용자는 개인정보 수정을 볼 수 없고 로그인으로 이동한다.

S163 비로그인
- Given `demo-role=guest`
- When  `/my/profile/edit`에 접속한다
- Then  URL이 `/login?next=%2Fmy%2Fprofile%2Fedit`이다

S164 로그인
- Given `demo-role=tester`
- Then  h1 "개인정보 수정"이 있다
- Then  "마이페이지 메뉴"의 "개인정보 수정"에 `aria-current="page"`가 있다

## 2. 기본 정보 보기 (R2)
현재 이름·닉네임을 칸에 채워 보여 주고, 이메일은 고칠 수 없는 값으로 보여 준다. 값은 대시보드 프로필과 같다.

S165 테스터
- Given `demo-role=tester`
- Then  "기본 정보" 카드의 이름 칸은 "한서윤", 닉네임 칸은 "윤슬"이다
- Then  이메일 "seoyun@example.com"이 보이고 입력 칸이 아니다 (또는 `readonly`)
- Then  "이메일은 바꿀 수 없어요"가 보인다

S166 개발자
- Given `demo-role=developer`
- Then  이름 칸 "박도현", 닉네임 칸 "도현랩"이다

## 3. 기본 정보 저장 (R3)
이름·닉네임을 고쳐 저장한다. 서버 액션에서 검사하고, 틀리면 칸 아래에 이유를 보여 준다. 오류가 나도 입력은 남는다.

S167 성공
- Given `demo-role=tester`
- When  닉네임을 "서윤테스트"로 바꾸고 "저장"을 누른다
- Then  "개인정보를 저장했어요"가 보인다 (`role="status"`)
- Then  닉네임 칸은 "서윤테스트" 그대로다

S168 빈 칸
- When  이름·닉네임을 지우고 저장한다
- Then  "이름을 입력해 주세요", "닉네임을 입력해 주세요"가 보이고 두 칸에 `aria-invalid="true"`가 있다

S169 형식
- When  이름 21자, 닉네임 40자를 넣고 저장한다 (고침 11-01: 닉네임 길이를 깃허브 사용자명과 같은 1~39자로 바꿈, `docs/2026-11-01-frontend-auth.md` S314)
- Then  "이름은 20자까지 쓸 수 있어요", "닉네임은 한글·영문·숫자 1~39자예요"가 보인다
- When  닉네임 "윤슬!!"을 넣고 저장한다
- Then  "닉네임은 한글·영문·숫자 1~39자예요"가 보인다

S170 사용 중인 닉네임
- When  닉네임 "도현랩"을 넣고 저장한다
- Then  "이미 쓰고 있는 닉네임이에요"가 보인다

S171 바뀐 내용 없음
- When  아무것도 고치지 않고 저장한다
- Then  "바뀐 내용이 없어요"가 보인다

## 4. 비밀번호 변경 (R4)
현재 비밀번호를 확인하고 새 비밀번호로 바꾼다. 성공하면 세 칸을 모두 비운다. 오류가 나면 입력이 남는다.

S172 성공
- Given `demo-role=tester`
- When  현재 `test1234`, 새 `moa2026pw`, 확인 `moa2026pw`를 넣고 "비밀번호 변경"을 누른다
- Then  "비밀번호를 바꿨어요"가 보인다 (`role="status"`)
- Then  세 칸이 비어 있다

S183 성공 뒤 다시 실패 (고침 10-30: 리뷰 — 성공 뒤 실패하면 폼이 다시 그려져 입력이 비워졌음)
- Given S172처럼 한 번 바꿨다
- When  현재 `test1234`, 새 `moa2026pw`, 확인 `moa2026px`를 넣고 제출한다
- Then  "새 비밀번호가 서로 달라요"가 보이고 세 칸에 입력한 값이 그대로 있다

S173 현재 비밀번호 틀림
- When  현재 `wrong123`을 넣고 나머지는 S172와 같게 제출한다
- Then  "현재 비밀번호가 맞지 않아요"가 현재 비밀번호 칸 아래에 보인다

S174 새 비밀번호 규칙
- When  새 `abc`를 넣고 제출한다
- Then  "영문과 숫자를 섞어 8자 이상 써 주세요"가 보인다
- When  새 `test1234`(현재와 같음)를 넣고 제출한다
- Then  "지금 쓰는 비밀번호와 달라야 해요"가 보인다

S175 확인 불일치
- When  새 `moa2026pw`, 확인 `moa2026px`를 넣고 제출한다
- Then  "새 비밀번호가 서로 달라요"가 확인 칸 아래에 보인다

S176 빈 칸
- When  아무것도 넣지 않고 제출한다
- Then  "현재 비밀번호를 입력해 주세요", "새 비밀번호를 입력해 주세요", "새 비밀번호를 한 번 더 입력해 주세요"가 보인다

S177 입력 속성
- Then  세 칸은 `type="password"`이고, 현재 칸은 `autocomplete="current-password"`, 새·확인 칸은 `autocomplete="new-password"`다

## 5. 로딩과 화면 (R5)
제목과 메뉴는 바로 보이고, 데이터를 받는 동안 스켈레톤을 보여 준다. 기본 정보와 비밀번호 변경은 한 장의 면을 줄로 나눠 위아래로 놓고, 넓은 화면(1024px 이상)에서는 각 줄의 제목·설명을 왼쪽 1/3, 칸을 오른쪽 2/3에 한 열로 둔다. (고침 10-30: 두 카드에 칸 2열 → 설정 화면 패턴)

S178 지연
- Given `demo-data=slow`
- Then  h1 "개인정보 수정"과 스켈레톤(`aria-busy="true"`)이 먼저 보이고, 응답 뒤 "기본 정보"가 보인다

S179 모바일
- Given 너비 375px
- Then  모든 입력 칸과 "저장", "비밀번호 변경" 버튼 너비가 카드 안쪽 너비와 같다

S182 넓은 화면 배치 (고침 10-30: 칸이 카드 너비로 늘어나 빈 공간이 많다는 피드백)
- Given 너비 1440px
- Then  "기본 정보", "비밀번호 변경" 각 줄에서 칸이 모두 제목보다 오른쪽에 있다
- Then  한 줄의 칸들은 왼쪽 끝과 너비가 같고 위에서 아래로 쌓인다

S184 주 버튼 하나 (고침 10-30: 리뷰 — DESIGN.md The One Green Rule)
- Then  "저장"은 주 버튼(강조색)이고 "비밀번호 변경"은 보조 버튼이다

## 6. 기존 테스트와 구조 (R6)

S180 준비 중 목록
- Then  `/my/profile/edit`은 S26 "준비 중" 목록과 `e2e/links.spec.ts` 준비 중 목록에서 빠지고, 헤더·메뉴 링크 테스트는 그대로 통과한다

S181 구조 (기존 S78)
- When  `grep -rl '"use client"' src`
- Then  기존 목록에 `ProfileForm`, `PasswordForm` 2개가 더해진다
- When  `grep -rln "mock" src --include='*.tsx'`
- Then  결과가 없다

## 범위 밖
- 이메일 변경 (인증 절차 미정)
- 프로필 사진, 휴대전화, 알림 설정
- 회원 탈퇴, 신고·제재 내역
- 저장 후 헤더·대시보드 닉네임 반영 (목업이라 데이터가 바뀌지 않음)
- 실제 비밀번호 저장·암호화, 백엔드 API 연동

## 작업 순서
0. 브랜치 — `git switch -c feature/frontend-profile origin/develop && git branch --unset-upstream`, 이 계획을 `docs/2026-10-30-frontend-profile-edit.md`로 저장
1. 데이터 계층 — S165, S166의 데이터
   - 파일: `src/features/my/api.ts`에 `getProfile(next)` 추가 (세션 확인은 `lib/auth.ts`의 `requireMember`, 시연 지연은 `lib/demo.ts`의 `waitIfSlow`를 씀) (고침 11-01: develop 병합 후 공용 함수로 바꿈)
   - 파일: `src/features/my/mock.ts`에 `DEMO_PROFILES`(시연 회원 프로필, 닉네임 중복 검사에도 씀), `DEMO_PASSWORD = "test1234"` 추가. 검사 함수 `isNicknameTaken`·`isCurrentPassword`는 `api.ts`에 둔다 (`mock.ts`는 `api.ts`만 불러온다)
   - 확인: `npx tsc --noEmit`
2. 페이지와 보기 — S163, S164, S165, S166, S178
   - 파일: `src/app/my/(account)/profile/edit/page.tsx` (출금 페이지처럼 h1 + `Suspense` + 스켈레톤; 재사용: `components/ui/Skeleton`, `features/my/components/card-styles.ts`)
3. 기본 정보 저장 — S167~S171
   - 파일: `src/features/my/actions.ts` (`"use server"`, `updateProfile`; 크레딧 PR의 `features/credit/actions.ts` 상태 타입 패턴 `idle | error(errors) | success(message, submittedAt)`을 따름)
   - 파일: `src/features/my/components/ProfileForm.tsx` (`"use client"`, `useActionState`, 직접 제출해 오류 시 입력 유지)
   - 칸 공통: `features/my/components/FormField.tsx`(`FormField` 라벨·안내·오류·`aria-describedby`, `FormMessage` 성공·실패 문구)를 두 폼이 함께 씀
   - 먼저 `node_modules/next/dist/docs/`에서 Server Actions·`useActionState` 확인
4. 비밀번호 변경 — S172~S177
   - 파일: `actions.ts`에 `changePassword`, `src/features/my/components/PasswordForm.tsx` (`"use client"`, 성공 응답에서만 `form.reset()`으로 칸 비움) (고침 10-30: `key`로 비우면 성공 뒤 오류에서도 칸이 비워졌음)
5. 테스트·문서 — S179, S180, S181
   - 파일: `e2e/profile.spec.ts` 새로 만듦 (테스트 이름은 S번호로 시작), `e2e/links.spec.ts`, `docs/frontend-home.md` S26·S78, `docs/2026-10-30-frontend-my.md` 범위 밖에서 "개인정보 수정" 제거
   - 확인: `cd frontend && npm run test:e2e && npm run lint && npm run build`, 개발 서버에서 1440px·375px·다크 모드 눈으로 확인

## 브랜치·커밋
- 브랜치: `feature/frontend-profile` (`origin/develop`에서 분기, upstream 해제)
- 커밋:
  - `Feat: 개인정보 수정 화면` — 단계 1~4
  - `Test: 개인정보 수정 E2E 시나리오` — 단계 5 테스트
  - `Docs: 개인정보 수정 계획 문서, 홈 문서 S26·S78 갱신` — 문서

## 가정
- 화면: h1 아래 한 장의 면에 "기본 정보" 줄, 그 아래 "비밀번호 변경" 줄. 폼이 둘이고 버튼도 각자 있다 (한쪽 오류가 다른 쪽 저장을 막지 않게). 넓은 화면은 Tailwind Plus 설정 화면처럼 제목·한 줄 설명 왼쪽, 칸 오른쪽이다. (고침 10-30: 빈 공간 피드백)
- 모양: 금액 폼이 아니므로 DESIGN.md 기본 규칙(누르는 것은 알약)을 따른다. 입력 칸도 검색창과 같은 알약, 높이 48px. 새 hex·px 값은 넣지 않는다.
- 이름: 필수, 앞뒤 공백 제거 후 1~20자.
- 닉네임: 필수, 한글·영문·숫자 1~39자 (`/^[가-힣a-zA-Z0-9]{1,39}$/`, 고침 11-01: 2~12자 → 깃허브 사용자명 길이). 규칙은 `src/lib/validation.ts`에서 회원가입과 함께 쓴다. 다른 시연 회원의 닉네임("윤슬", "도현랩", 운영자 닉네임)은 사용 중으로 본다. 자기 닉네임은 그대로 둘 수 있다.
- 비밀번호: 시연 회원 모두 현재 비밀번호는 `test1234`다. 새 비밀번호는 8~64자, 영문과 숫자를 모두 포함, 현재와 달라야 한다.
- 저장은 목업이라 데이터는 바뀌지 않는다. 기본 정보는 성공 뒤 입력한 값이 칸에 남고, 새로고침하면 원래 값이다.
- 운영자도 같은 화면을 쓴다.
- 오류 문구는 칸 바로 아래, 경고 아이콘과 함께, 글자 크기는 입력과 같은 위치에서 시작한다 (출금 폼과 같은 방식).
- S번호는 S163~S184를 쓴다. 다른 문서·열린 PR의 최대 번호(S162)와 겹치지 않게 다음 번호부터.

## 참고 (2026-10-30 확인)
- 페이지 URL: `docs/page-urls.md` 55행 "개인정보 수정 `/my/profile/edit` 확정"
- 프로필 데이터: `frontend/src/features/my/types.ts` `Profile`, `mock.ts` `buildMyPageSummary`
- 세션·접근 제어: `frontend/src/lib/session.ts`, `frontend/src/lib/auth.ts` `requireMember`
- 폼 패턴: `frontend/src/features/credit/actions.ts`, `components/WithdrawalForm.tsx` (PR #9)
- 모양 규칙: `frontend/DESIGN.md` 260~265행 (알약 / The Money Field Rule)
- 설정 화면 레퍼런스 (10-30 확인): Tailwind Plus 설정 화면 https://tailwindcss.com/plus/ui-blocks/application-ui/page-examples/settings-screens , SaaS 설정 페이지 패턴 https://www.saasui.design/blog/saas-settings-page-ux-patterns
- 기존 링크 테스트: `e2e/header.spec.ts`, `e2e/mobile-menu.spec.ts`, `e2e/my.spec.ts`, `e2e/links.spec.ts`
