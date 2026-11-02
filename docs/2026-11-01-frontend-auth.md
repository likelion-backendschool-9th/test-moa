# 프론트엔드 로그인·회원가입 (`/login`, `/signup`)

## 한눈에
- 끝나면: `/login`에서 시연 계정 이메일·비밀번호로 로그인하면 그 역할로 바뀌고, 들어오기 전 페이지(`next`)로 돌아간다. 깃허브·구글 버튼은 목업이라 누르면 테스터로 로그인한다. `/signup`에서 이름·닉네임·이메일·비밀번호를 넣고 약관에 동의하면 로그인 화면으로 가서 "가입했어요"가 보인다. 입력이 틀리면 칸 아래에 이유가 보인다.
- 결정 필요: 없음 (가입 항목: 이름·닉네임·이메일·비밀번호 + 약관 동의, 소셜 버튼은 깃허브·구글 목업(11-01 변경, 추후 바뀔 수 있음), 닉네임 길이는 깃허브 사용자명과 같은 1~39자(11-01 변경), 로그인은 시연 계정으로 쿠키 설정, 브랜치: develop에서 새로, 로그인·회원가입 한 브랜치 — 11-01 확정)
- 규모: 6단계, 약 5~6시간 (공통 코드 분리 포함)

## 맥락
- 지금 `/login`, `/signup`은 "준비 중"이다. 헤더의 "로그인"·"회원가입" 버튼과, 보호된 페이지(마이페이지, 크레딧, 관리자 등)가 비로그인 사용자를 보내는 `/login?next=…`가 모두 여기로 온다.
- 세션은 목업이다. `src/lib/session.ts`가 쿠키 `demo-role`(guest·tester·developer·admin)로 상태를 정하고, 값이 없으면 tester로 본다. 시연 전환기(`DemoSwitcher`)도 같은 쿠키를 쓴다.
- 시연 회원은 셋이다 (`features/my/mock.ts` `DEMO_PROFILES`): 테스터 seoyun@example.com, 개발자 dohyun@example.com, 운영자 admin@example.com. 비밀번호는 모두 `DEMO_PASSWORD` = `test1234`.
- 개발자와 테스터는 한 계정이다. 가입할 때 역할을 고르지 않는다.
- 개인정보 수정(`docs/2026-10-30-frontend-profile-edit.md`)에 이름·닉네임·비밀번호 검사 규칙과 칸(`FormField`)이 이미 있다. 같은 규칙과 문구를 쓴다. 닉네임 길이만 깃허브 사용자명(username)의 허용 범위인 1~39자로 넓히고, 글자 종류(한글·영문·숫자)는 그대로 둔다. 규칙을 함께 쓰므로 개인정보 수정도 같이 바뀐다.
- 백엔드는 고려하지 않는다. 가입은 데이터를 만들지 않는다.

## 모듈 배치 (고침 11-01: 구조 리뷰 반영)
로그인·가입·개인정보 수정이 함께 쓰는 코드는 한 기능 안에 두지 않는다. 기능끼리는 서로의 `mock.ts`와 내부 구현을 직접 부르지 않는다.

| 위치 | 하는 일 | 의존해도 되는 것 |
| --- | --- | --- |
| `components/ui/FormField.tsx` | `FormField`·`FormMessage` (지금 `features/my/components/FormField.tsx`에서 옮김) | `components/ui`, 아이콘. 기능 코드는 모른다 |
| `lib/validation.ts` | 이름·닉네임·이메일·비밀번호 형식 검사. 값을 받아 오류 문구나 `undefined`를 돌려주는 순수 함수 | 없음 (`next/*`, React, 쿠키, 데이터 모듈을 부르지 않는다) |
| `lib/form.ts` | 서버 액션 폼 상태 타입 `FormState<Field>` (지금 `features/my/actions.ts`에서 옮김) | 없음 |
| `lib/next-path.ts` | `safeNextPath(value)`: 아래 규칙을 모두 지킬 때만 그 경로(경로+쿼리)를 돌려주고, 아니면 `/`. ① 문자열이고 `/`로 시작 ② `//`로 시작하지 않음 ③ 역슬래시(`\`)와 제어문자(U+0000~U+001F, U+007F)가 없음 ④ `new URL(value, 기준)`으로 해석한 출처가 기준 출처와 같음. 기준은 고정값(`http://localhost`)으로 두고 출처 비교에만 쓴다. 돌려주는 값은 해석한 `pathname + search`이고, ⑤ 이 반환값도 ①~④를 다시 통과해야 한다. 못 지키면 `/` (고침 11-01: 리뷰 — `/\evil.com`, `/\t/evil.com`이 ①②를 통과해도 URL 파서는 `evil.com`으로 해석함. 또 `/a/..//evil.com`, `/a/%2e%2e//evil.com`은 ①~④를 통과하지만 정규화한 `pathname`이 `//evil.com`이 됨. 둘 다 로컬에서 확인) | 없음. 로그인·가입 페이지와 서버 액션이 같은 함수를 쓴다 |
| `features/member/mock.ts` | 시연 회원 데이터 `DEMO_PROFILES`·`DEMO_PASSWORD` (지금 `features/my/mock.ts`에서 옮김). `import "server-only"` | `member/types.ts`. `member/api.ts`에서만 import한다 |
| `features/member/api.ts` | 회원 조회 인터페이스 하나: `getMemberProfile(role)`, `findRoleByCredentials(email, password)`, `isEmailTaken(email)`, `isNicknameTaken(nickname, own?)`, `isCurrentPassword(password)`. `import "server-only"` (서버 액션·서버 컴포넌트에서만 쓴다) | `member/mock.ts` |
| `features/auth/` | `actions.ts`(로그인·소셜·가입, 쿠키 설정), `components/` | `member/api.ts`, `lib/*`, `components/ui`. `features/my`는 부르지 않는다 |
| `features/my/` | 개인정보 수정·마이페이지 | 회원 정보는 `member/api.ts`로 받는다. `my/mock.ts`의 `buildMyPageSummary`는 프로필을 빼고 만들고, `my/api.ts`가 `getMemberProfile`로 채운다 |

- 중복 조회·현재 비밀번호 확인·쿠키 설정은 검사 함수 밖, 서버 액션에서 한다.
- 이 규칙의 공통 부분은 `frontend/README.md` "폴더 구조와 규칙"에 적고, 이 문서에는 차이만 둔다 (작업 순서 6).
- 이미 있는 예외 `features/project/api.ts → features/recruitment/mock`, `features/credit → features/my/components/card-styles`는 이번 범위에서 고치지 않고 README에 알려진 예외로 적는다.

## 1. 로그인 보기 (R1)
비로그인 사용자에게 이메일 로그인 폼과 소셜 버튼을 보여 준다. 이미 로그인했으면 보지 않고 돌아간다.

S347 비로그인 (고침 11-02: 처음 S285는 develop의 참여 상세와(11-02 번호 정리 전 번호), 옮긴 S335는 채팅방과 겹쳐 비어 있는 다음 번호로 옮김)
- Given `demo-role=guest`
- When  `/login`에 접속한다
- Then  h1 "로그인"이 있다
- Then  "이메일", "비밀번호" 칸과 "로그인" 버튼이 있다
- Then  "깃허브로 계속하기", "구글로 계속하기" 버튼이 있다
- Then  "회원가입" 링크가 `/signup`으로 간다
- Then  "시연 계정" 안내에 세 이메일과 비밀번호 `test1234`가 보인다

S286 `next` 유지
- Given `demo-role=guest`
- When  `/login?next=%2Fmy` 에 접속한다
- Then  "회원가입" 링크가 `/signup?next=%2Fmy`로 간다

S287 이미 로그인
- Given `demo-role=tester`
- When  `/login?next=%2Fmy`에 접속한다
- Then  URL이 `/my`다
- When  `/login`에 접속한다
- Then  URL이 `/`다

S288 입력 속성
- Then  이메일 칸은 `type="email"`, `autocomplete="email"`이고, 비밀번호 칸은 `type="password"`, `autocomplete="current-password"`다
- Then  JS 번들이 아직 없을 때 제출해도 POST로 가고 주소에 비밀번호가 남지 않는다 (폼에 서버 액션 `action`을 둔다. 고침 11-02: PR #21 리뷰)

## 2. 이메일 로그인 (R2)
시연 계정이 맞으면 그 역할로 `demo-role` 쿠키를 넣고 `next`로 보낸다. 서버 액션에서 검사하고, 틀리면 이메일 입력은 남는다.

S289 테스터
- Given `demo-role=guest`, `/login`
- When  seoyun@example.com / test1234로 로그인한다
- Then  URL이 `/`다
- Then  헤더에 "내 정보"가 있고 "로그인"이 없다

S290 돌아가기
- Given `demo-role=guest`, `/login?next=%2Fmy%2Fcredits`
- When  dohyun@example.com / test1234로 로그인한다
- Then  URL이 `/my/credits`다

S291 운영자
- Given `demo-role=guest`, `/login?next=%2Fadmin`
- When  admin@example.com / test1234로 로그인한다
- Then  URL이 `/admin`이고 운영자 화면 h1이 보인다

S292 빈 칸
- When  아무것도 넣지 않고 로그인한다
- Then  "이메일을 입력해 주세요", "비밀번호를 입력해 주세요"가 보이고 두 칸에 `aria-invalid="true"`가 있다

S293 이메일 형식
- When  이메일 "seoyun"을 넣고 로그인한다
- Then  "이메일 형식이 맞지 않아요"가 보인다

S294 맞지 않는 계정
- When  seoyun@example.com / wrong123으로 로그인한다
- Then  "이메일 또는 비밀번호가 맞지 않아요"가 보인다 (`role="alert"`)
- Then  이메일 칸에 seoyun@example.com이 남아 있다
- When  nobody@example.com / test1234로 로그인한다
- Then  같은 문구가 보인다 (어느 쪽이 틀렸는지 알리지 않는다)

S295 바깥 주소로 보내지 않음
- Given `next` 값(디코딩된 문자열)이 다음 중 하나다: `https://evil.com`, `//evil.com`, `/\evil.com`, `/` + 실제 탭 문자(U+0009) + `/evil.com`(테스트 코드에서는 `"/\t/evil.com"`), `/a/..//evil.com`, `/a/%2e%2e//evil.com`, `javascript:alert(1)`, `my`(슬래시 없음)
- When  seoyun@example.com / test1234로 로그인한다
- Then  URL이 `/`다 (각 값을 `encodeURIComponent`로 한 번만 인코딩해 `/login?next=…`로 넘긴다. 탭은 `%09`로 넘어가 서버에서 실제 탭으로 디코딩된다)
- Note  `%09`라는 글자 자체(이중 인코딩 `%2509`)는 같은 출처 경로 `/%09/evil.com`이라 허용된다. 외부로 가지 않으므로 막지 않는다 (고침 11-01: 리뷰 — 탭 입력 표현을 실제 탭으로 명시)
- Then  이미 로그인한 상태로 같은 `/login?next=…`에 접속해도 `/`로 간다

S316 쿼리가 있는 경로 (고침 11-01: 리뷰)
- Given `/login?next=%2Fmy%2Fparticipations%3Ftab%3Dongoing%26sort%3Drecent`
- When  seoyun@example.com / test1234로 로그인한다
- Then  URL이 `/my/participations?tab=ongoing&sort=recent`다

## 3. 소셜 로그인 (R3)
깃허브·구글 버튼은 목업이다. 누르면 테스터 시연 계정으로 로그인하고 `next`로 보낸다. 제공자는 추후 바뀔 수 있어 목록 한 곳(`SOCIAL_PROVIDERS`)만 고치면 버튼이 바뀌게 한다. (고침 11-01: 카카오·구글 → 깃허브·구글)

S296 깃허브
- Given `demo-role=guest`, `/login?next=%2Fmy`
- When  "깃허브로 계속하기"를 누른다
- Then  URL이 `/my`이고 헤더에 "내 정보"가 있다

S297 구글
- Given `demo-role=guest`, `/signup`
- When  "구글로 계속하기"를 누른다
- Then  URL이 `/`이고 헤더에 "내 정보"가 있다

## 4. 회원가입 보기 (R4)

S298 비로그인
- Given `demo-role=guest`
- When  `/signup`에 접속한다
- Then  h1 "회원가입"이 있다
- Then  "이름", "닉네임", "이메일", "비밀번호", "비밀번호 확인" 칸과 "가입하기" 버튼이 있다
- Then  "이용약관 동의(필수)", "개인정보처리방침 동의(필수)" 체크박스가 있고, 각 문서 링크가 `/terms`, `/privacy`로 간다
- Then  "깃허브로 계속하기", "구글로 계속하기" 버튼이 있다
- Then  "로그인" 링크가 `/login`으로 간다 (`next`가 있으면 유지)

S299 이미 로그인
- Given `demo-role=developer`
- When  `/signup`에 접속한다
- Then  URL이 `/`다

S300 입력 속성
- Then  이름 `autocomplete="name"`, 닉네임 `autocomplete="nickname"`, 이메일 `type="email"`·`autocomplete="email"`, 비밀번호·확인 `type="password"`·`autocomplete="new-password"`다
- Then  비밀번호 칸 아래에 "영문과 숫자를 섞어 8자 이상"이 보인다
- Then  JS 번들이 아직 없을 때 제출해도 POST로 가고 주소에 비밀번호가 남지 않는다 (고침 11-02: PR #21 리뷰)

## 5. 회원가입 검사 (R5)
서버 액션에서 검사하고 칸 아래에 이유를 보여 준다. 문구는 개인정보 수정과 같다. 오류가 나도 입력은 남는다.

S301 빈 칸
- When  아무것도 넣지 않고 "가입하기"를 누른다
- Then  "이름을 입력해 주세요", "닉네임을 입력해 주세요", "이메일을 입력해 주세요", "비밀번호를 입력해 주세요", "비밀번호를 한 번 더 입력해 주세요"가 보인다
- Then  "이용약관과 개인정보처리방침에 동의해 주세요"가 보인다
- Then  오류 칸에 `aria-invalid="true"`가 있다

S302 형식
- When  이름 21자, 닉네임 40자, 이메일 "moa", 비밀번호 "abc"를 넣고 제출한다
- Then  "이름은 20자까지 쓸 수 있어요", "닉네임은 한글·영문·숫자 1~39자예요", "이메일 형식이 맞지 않아요", "영문과 숫자를 섞어 8자 이상 써 주세요"가 보인다

S303 확인 불일치
- When  비밀번호 `moa2026pw`, 확인 `moa2026px`를 넣고 제출한다
- Then  "비밀번호가 서로 달라요"가 확인 칸 아래에 보인다

S304 이미 쓰는 값
- When  이메일 seoyun@example.com, 닉네임 "윤슬"을 넣고 제출한다
- Then  "이미 가입한 이메일이에요", "이미 쓰고 있는 닉네임이에요"가 보인다

S305 동의 하나만
- When  나머지는 올바르게 넣고 이용약관만 체크해 제출한다
- Then  "이용약관과 개인정보처리방침에 동의해 주세요"가 보인다

S306 입력 유지
- Given S304처럼 오류가 났다
- Then  모든 칸과 체크 상태가 제출한 그대로다

## 6. 가입 성공 (R6)
가입은 목업이라 데이터를 만들지 않는다. 로그인 화면으로 보내 로그인하게 한다. (바로 로그인시키면 헤더에 시연 회원 이름이 떠서 방금 넣은 닉네임과 다르다)

S307 성공
- Given `demo-role=guest`, `/signup`
- When  이름 "김모아", 닉네임 "모아", 이메일 moa@example.com, 비밀번호·확인 `moa2026pw`, 동의 둘 다 체크 후 "가입하기"를 누른다
- Then  URL이 `/login?joined=1`이다
- Then  "가입했어요. 로그인해 주세요"가 보인다 (`role="status"`)

S308 `next` 넘기기
- Given `/signup?next=%2Fmy`
- When  S307처럼 가입한다
- Then  URL이 `/login?joined=1&next=%2Fmy`다
- Given `/signup?next=%2Fmy%3Ftab%3Dongoing%26sort%3Drecent`
- When  S307처럼 가입한다
- Then  URL이 `/login?joined=1&next=%2Fmy%3Ftab%3Dongoing%26sort%3Drecent`다 (쿼리가 `joined`와 섞이지 않는다)
- Given `/signup?next=%2F%5Cevil.com`
- When  S307처럼 가입한다
- Then  URL이 `/login?joined=1`이다 (안전하지 않은 `next`는 넘기지 않는다)

S314 닉네임 길이 (고침 11-01: 깃허브 사용자명 허용 범위)
- When  회원가입·개인정보 수정에서 닉네임 "a"(1자)를 넣고 제출한다
- Then  닉네임 오류가 없다
- When  닉네임 39자를 넣는다
- Then  닉네임 오류가 없다
- When  닉네임 40자, 또는 "윤슬!!"을 넣는다
- Then  "닉네임은 한글·영문·숫자 1~39자예요"가 보인다
- 참고: 개인정보 수정(`e2e/profile.spec.ts`)도 같은 규칙이라 이 번호로 한 번 더 확인한다. 한 시나리오를 두 화면에서 확인하는 경우다.

## 7. 화면 (R7)

S309 모바일
- Given 너비 375px
- Then  모든 입력 칸과 "로그인"·"가입하기"·소셜 버튼 너비가 카드 안쪽 너비와 같다

S310 넓은 화면
- Given 너비 1440px
- Then  카드는 가운데에 있고 너비가 28rem(448px) 이하다

S311 주 버튼 하나 (DESIGN.md The One Green Rule)
- Then  "로그인"·"가입하기"만 주 버튼(강조색)이고 소셜 버튼은 보조 버튼이다

## 8. 기존 테스트와 구조 (R8)

S312 준비 중 목록
- Then  `/login`, `/signup`은 `docs/frontend-home.md` S26과 `e2e/links.spec.ts` 준비 중 목록에서 빠지고, 헤더·메뉴·보호 페이지의 `/login?next=…` 테스트는 그대로 통과한다

S313 구조 (기존 S78)
- When  `grep -rl '"use client"' src`
- Then  기존 목록에 `LoginForm`, `SignupForm` 2개가 더해진다
- When  `grep -rln "mock" src --include='*.tsx'`
- Then  결과가 없다

S315 의존 방향 (고침 11-01: 구조 리뷰 — 파일 수만으로는 기능 간 결합을 못 잡음)
- When  `grep -rn "@/features" src/components/ui src/lib`
- Then  결과가 없다 (공통 UI·유틸은 기능 코드를 모른다)
- When  `grep -rnE "from \"[^\"]*mock\"" src`
- Then  각 기능의 `api.ts`가 자기 `./mock`을 부르는 줄과, 알려진 예외 `features/project/api.ts → @/features/recruitment/mock` 한 줄만 나온다. `member/mock`은 `features/member/api.ts`만 부른다
- When  `grep -rn "@/features/my" src/features/auth src/features/member`
- Then  결과가 없다
- When  `grep -nE "from \"(next|react)|cookies|@/features" src/lib/validation.ts src/lib/form.ts src/lib/next-path.ts`
- Then  결과가 없다
- When  `grep -rn "DEMO_PROFILES\|DEMO_PASSWORD" src`
- Then  `features/member/mock.ts`, `features/member/api.ts`에서만 나온다

## 범위 밖
- 로그아웃 (고침 11-02: `docs/2026-11-01-frontend-header.md`에서 만들었다)
- 비밀번호 찾기·재설정, 이메일 인증
- 실제 소셜 로그인(OAuth) 연동, 카카오·네이버 등 다른 제공자, 가입 데이터 저장, 비밀번호 암호화
- 가입 크레딧 지급 표시 (금액 미정)
- 이용약관·개인정보처리방침 본문 (`/terms`, `/privacy`는 준비 중 그대로)
- 로그인 시도 횟수 제한

## 작업 순서
0. 브랜치 — `git switch -c feature/frontend-auth origin/develop && git branch --unset-upstream`, 이 계획을 `docs/2026-11-01-frontend-auth.md`로 저장
1. 공통 코드 분리 (동작 변화 없음) — S315 일부
   - `features/my/components/FormField.tsx` → `components/ui/FormField.tsx`로 옮기고 `ProfileForm`·`PasswordForm` import 수정
   - `features/my/actions.ts`의 `FormState` → `lib/form.ts`
   - `features/my/actions.ts`의 이름·닉네임·비밀번호 형식 검사 → `lib/validation.ts`의 `validateName`·`validateNickname`·`validatePassword`(+ 가입용 `validateEmail`). 중복·현재 비밀번호 확인은 액션에 남긴다
   - `features/my/mock.ts`의 `DEMO_PROFILES`·`DEMO_PASSWORD`와 `my/api.ts`의 `isNicknameTaken`·`isCurrentPassword` → `features/member/{types,mock,api}.ts`. `Profile` 타입도 `member/types.ts`로 옮기고 `my/types.ts`는 그것을 쓴다
   - 확인: `npx tsc --noEmit`, `npx playwright test e2e/profile.spec.ts e2e/my.spec.ts`
2. 닉네임 길이 변경 — S314
   - `lib/validation.ts`의 닉네임 규칙을 `/^[가-힣a-zA-Z0-9]{1,39}$/`로, `e2e/profile.spec.ts` S169, `docs/2026-10-30-frontend-profile-edit.md` S169·가정을 고침 (고침 11-01)
3. 로그인 — S347, S286~S296, S316
   - 먼저 `node_modules/next/dist/docs/01-app/02-guides/authentication.md`, `forms.md`에서 서버 액션의 `cookies().set`·`redirect` 확인
   - `lib/next-path.ts` `safeNextPath`
   - `features/member/api.ts`에 `findRoleByCredentials`, `isEmailTaken`
   - `features/auth/actions.ts` (`"use server"`): `login`, `socialLogin`. 형식은 `lib/validation`, 계정 확인은 `member/api`, 쿠키는 `DEMO_ROLE_COOKIE`를 `DemoSwitcher`와 같은 속성(`path=/`, 1년, `sameSite=lax`)으로 넣고 `redirect(safeNextPath(next))`
   - `features/auth/components/LoginForm.tsx` (`"use client"`, `useActionState`, `PasswordForm`처럼 직접 제출해 오류 시 입력 유지, `next`는 hidden input, 칸은 `components/ui/FormField`), `SocialButtons.tsx` (서버 컴포넌트, `SOCIAL_PROVIDERS` 배열 `[{ id: "github", label: "깃허브" }, { id: "google", label: "구글" }]`을 돌며 `<form action={socialLogin}>`을 하나씩 그림. 제공자 id는 hidden input으로 넘기고, 액션은 목록에 있는 id만 받음), `AuthCard.tsx` (가운데 좁은 카드)
   - `src/app/login/page.tsx` (h1은 정적 셸, `searchParams`·세션을 읽는 부분은 `Suspense` 안. 로그인 상태면 `redirect(safeNextPath(next))`)
4. 회원가입 — S297~S308
   - 파일: `actions.ts`에 `signup` (성공 시 `const params = new URLSearchParams({ joined: "1" })`, `safeNextPath(next)`가 `/`가 아니면 `params.set("next", 그 값)`, `redirect(\`/login?${params}\`)`. 문자열을 이어 붙이지 않는다), `components/SignupForm.tsx`, `src/app/signup/page.tsx`
   - 동의 체크박스는 칸 모양이 달라 `SignupForm` 안에 둔다
5. 화면 확인 — S309~S311
   - 개발 서버에서 1440px·375px·다크 모드 눈으로 확인
6. 테스트·문서 — S312, S313, S315
   - 파일: `e2e/auth.spec.ts` 새로 만듦 (테스트 이름은 S번호로 시작, 비로그인은 `setDemo(context, { role: "guest" })`), `e2e/links.spec.ts`, `docs/frontend-home.md` S26·S78
   - `frontend/README.md` "폴더 구조와 규칙"에 의존 방향을 공통 규칙으로 적는다: `components/ui`·`lib`는 기능을 모른다, `mock.ts`는 같은 기능의 `api.ts`에서만 import한다, 다른 기능은 `api.ts`·`types.ts`·공개 컴포넌트로만 쓴다, 여러 기능이 쓰는 코드는 `components/ui`·`lib`나 별도 기능(`member`)에 둔다, 알려진 예외 2개. `docs/frontend-projects.md` 3계층 절은 README를 가리키고 차이(`service.ts` 로직 계층)만 남기며, "`api.ts`는 `service.ts`만 import한다"를 "프로젝트 영역에서는 `service.ts`만 `api.ts`를 import하며, 페이지와 액션은 `service.ts`를 호출한다"로 고친다 (고침 11-01: 리뷰 — 앞 문구도 호출 방향이 반대로 읽혔음. 실제 코드도 `features/project/service.ts`만 `./api`를 import함)
   - 확인: `cd frontend && npm run test:e2e && npm run lint && npm run build`

## 브랜치·커밋
- 브랜치: `feature/frontend-auth` (`origin/develop`에서 분기, upstream 해제). 로그인과 회원가입은 검사 규칙·카드·소셜 버튼을 같이 쓰고 가입 성공이 로그인 화면으로 이어져서 한 브랜치로 한다
- 커밋:
  - `Docs: 로그인·회원가입 계획 문서` — 이 문서
  - `Refactor: 입력칸·폼 상태·검사 규칙을 공용으로, 시연 회원 데이터를 member로 분리` — 단계 1
  - `Feat: 닉네임 길이를 깃허브 사용자명과 같은 1~39자로 변경` — 단계 2 (`profile.spec.ts` S169는 Test 커밋, 개인정보 수정 문서는 Docs 커밋에 넣음)
  - `Feat: 로그인 화면` — 단계 3
  - `Feat: 회원가입 화면` — 단계 4
  - `Test: 로그인·회원가입 E2E 시나리오` — 단계 6 테스트
  - `Docs: 홈 문서 S26·S78, 개인정보 수정 닉네임 규칙 갱신`
  - `Docs: 프론트엔드 의존 방향 규칙을 README로 모음`

## 가정
- 화면: 헤더·푸터는 그대로 두고, 본문 가운데에 카드 하나. 카드 안 순서는 h1 → 이메일 폼 → "또는" 구분선 → 소셜 버튼 → 다른 페이지 링크("계정이 없나요? 회원가입" / "이미 계정이 있나요? 로그인"). 로그인 화면은 카드 아래에 "시연 계정" 안내.
- 모양: 금액 폼이 아니므로 DESIGN.md 기본 규칙(누르는 것은 알약)을 따른다. 칸은 개인정보 수정과 같은 알약, 높이 48px. 새 hex·px 값은 넣지 않는다. 깃허브·구글 브랜드 색은 쓰지 않고 보조 버튼에 이름만 쓴다.
- 이메일: 필수, 앞뒤 공백 제거, 소문자로 비교. 형식은 `x@y.z` 정도로만 본다.
- 이름: 필수, 1~20자 그대로 (깃허브 가입 화면은 이름을 받지 않아 맞출 기준이 없다).
- 닉네임: 필수, 한글·영문·숫자 1~39자. 길이만 깃허브 사용자명에서 가져왔다. 깃허브는 영문·숫자·하이픈만 허용하지만 시연 회원 닉네임이 한글이라 글자 종류는 바꾸지 않는다. 깃허브 가입 페이지는 자동 확인이 막혀 있어 39자는 알려진 기준으로 적었다.
- 이름·닉네임·비밀번호 규칙은 개인정보 수정과 같다. 비밀번호 확인 문구만 "비밀번호가 서로 달라요"(개인정보 수정은 "새 비밀번호가 서로 달라요").
- 로그인 오류는 칸이 아니라 폼 전체 문구로 보여 준다 (이메일이 있는지 알리지 않기 위해).
- 오류 뒤 비밀번호 칸도 입력이 남는다 (개인정보 수정과 같음).
- `next`가 없거나 안전하지 않으면 `/`로 간다.
- S번호는 S286~S316과 S347을 쓴다. 처음에는 S285부터 매겼지만 develop의 참여 상세가 S285를 먼저 써서(11-02 번호 정리 전 번호) S335로 옮겼는데, 채팅방(PR #20)의 S335와 또 겹쳐 11-02에 S347로 옮겼다 (고침 11-02: PR #21 리뷰, 번호 정리).

## 참고 (2026-11-01 확인)
- 페이지 URL: `docs/page-urls.md` "로그인 `/login` 확정", "회원가입 `/signup` 확정"
- 세션·접근 제어: `frontend/src/lib/session.ts`, `frontend/src/lib/auth.ts` `requireMember`, `frontend/src/components/layout/DemoSwitcher.tsx`
- 시연 회원: `frontend/src/features/my/mock.ts` `DEMO_PROFILES`, `DEMO_PASSWORD`
- 폼 패턴: `frontend/src/features/my/actions.ts`, `components/PasswordForm.tsx`, `components/FormField.tsx`
- 모양 규칙: `frontend/DESIGN.md` (알약, The One Green Rule)
- 기존 링크 테스트: `e2e/header.spec.ts`, `e2e/links.spec.ts`, `e2e/nav.spec.ts`
