# 백엔드 회원관리·인증 인가·회원 신고

JWT 로그인과 요청마다의 회원 상태·유료 구독 확인, Google·GitHub 가입·연동, 내 정보 수정·탈퇴, 회원 신고, 운영자 제재·해제의 백엔드 계획([#37](https://github.com/likelion-backendschool-9th/test-moa/issues/37)). 여러 이슈에 걸친 결정은 이 문서에 두고, 이슈별 계획은 이 폴더의 `<기능>.md`로 나눈다. 시나리오는 `#이슈-S1`부터 센다.

시나리오 제목 끝의 태그가 확인 방법이다. `[테스트]`만 이 문서 시나리오와 백엔드 테스트가 1:1이고(테스트 `@DisplayName`이 시나리오 번호로 시작), `[테스트: 파일 번호]`는 **다른** 테스트가 대신 확인할 때 쓴다. `[직접]`은 사람이 API·화면·코드로 확인한다.

## 이슈와 문서

| 이슈 | 내용 | 문서 |
| --- | --- | --- |
| [#79](https://github.com/likelion-backendschool-9th/test-moa/issues/79) | 공통 에러 응답과 JWT 인증·인가 | [아래 1](#1-공통-에러-응답과-jwt-인증인가-79) |
| [#80](https://github.com/likelion-backendschool-9th/test-moa/issues/80) | 이메일 가입·로그인·토큰 갱신 API | [아래 2](#2-이메일-가입로그인토큰-갱신-80) |
| [#81](https://github.com/likelion-backendschool-9th/test-moa/issues/81) | 내 정보·구독 여부 확인 API | [아래 3](#3-내-정보구독-여부-확인-81) |
| [#82](https://github.com/likelion-backendschool-9th/test-moa/issues/82) | 프론트 로그인·가입·로그아웃 백엔드 연결 | [로그인·회원가입](../../frontend/auth/auth.md) 9장 |
| [#83](https://github.com/likelion-backendschool-9th/test-moa/issues/83) | Google·GitHub 로그인과 계정 연동 API | [아래 4](#4-googlegithub-로그인과-계정-연동-83) |
| [#84](https://github.com/likelion-backendschool-9th/test-moa/issues/84) | 내 정보 수정·비밀번호·탈퇴 | [아래 5](#5-내-정보-수정과-비밀번호-84), [아래 6](#6-회원-탈퇴-84) |
| [#85](https://github.com/likelion-backendschool-9th/test-moa/issues/85) | 회원 신고·증거 첨부 API | [reports.md](reports.md) |
| [#86](https://github.com/likelion-backendschool-9th/test-moa/issues/86) | 운영자 제재·해제 API (#34와 역할 나누기 확정 후) | [sanctions.md](sanctions.md) |
| [#87](https://github.com/likelion-backendschool-9th/test-moa/issues/87) | 테스트 서버 `JWT_SECRET`과 스키마 생성 방식 | |

진행 상태는 이슈와 PR에서 본다.

프론트: [로그인·회원가입](../../frontend/auth/auth.md), [신고·제재 관리](../../frontend/admin/reports.md), [회원 관리](../../frontend/admin/users.md)

## 정한 것
- 백엔드는 브라우저에 열려 있지 않다(BFF). 브라우저 → nginx → Next → 백엔드. Next가 토큰을 httpOnly 쿠키로 들고, 백엔드를 부를 때 `Authorization: Bearer`로 붙인다.
- access 토큰(30분)에는 회원 id(`sub`)와 로그인 세션 id(`sid`)만 넣는다. 권한·상태·구독·세션은 요청마다 DB에서 읽어서 바뀌면 바로 반영된다.
- refresh 토큰(14일)은 무작위 32바이트이고, SHA-256 해시만 `refresh_tokens`에 저장한다. 쓰면 다시 쓸 수 없게 표시하고(`used_at`) 새로 준다. 쓴 토큰 행은 만료될 때까지 남겨서, 몇 번을 갱신했든 예전 토큰으로 온 로그아웃도 세션을 찾는다.
- 로그인 한 번이 로그인 세션 하나(`refresh_tokens.session_id`)다. 갱신으로 이어진 토큰은 같은 세션이고, 로그아웃하면 그 세션의 토큰을 모두 지운다. access 토큰도 세션이 없어지면 401이 된다. 다른 기기의 로그인(다른 세션)은 그대로다.
- 갱신과 로그아웃은 그 세션의 토큰 행을 잠그고(`select ... for update`) 처리해서 같은 세션의 요청은 하나씩 처리된다. 같은 토큰으로 동시에 갱신하면 하나만 성공하고, 갱신과 로그아웃이 겹쳐도 로그아웃이 끝나면 그 세션의 토큰은 모두 못 쓴다.
- 유효 시간은 환경 변수 `JWT_ACCESS_TOKEN_TTL`(기본 `30m`), `JWT_REFRESH_TOKEN_TTL`(기본 `14d`)로 바꿀 수 있다.
- 서명 키는 환경 변수 `JWT_SECRET`(32바이트 이상)으로만 넘긴다.

| 계층 | 위치 |
| --- | --- |
| 공통 | `global/exception`(`ErrorCode`, `BusinessException`, `GlobalExceptionHandler`), `global/security`(`SecurityConfig`, `JwtProvider`, `UserAuthenticationConverter`) |
| API | `AuthController`(`/api/auth/**`), `UserController`(`/api/users/me`, `/api/users/me/accounts/{provider}`) |
| 소셜 로그인 | `global/security/OAuthClient`(제공자와 통신), `JwtProvider`(소셜 가입 토큰) |
| 서비스 | `AuthService`, `UserService`, `SubscriptionChecker` |

### 다른 기능에서 쓰는 법
- 요청한 회원: 컨트롤러 인자에 `@AuthenticationPrincipal Long userId`
- 실패: `throw new BusinessException(ErrorCode.X)` → `{"success":false,"data":null,"error":{"code","message","fields?"}}`
- 구독 여부: `subscriptionChecker.isActive(userId)`, 구독자 전용이면 `subscriptionChecker.require(userId)`
- 로그인 없이 여는 조회 API: `SecurityConfig.PUBLIC_PATHS`에 더한다

## 1. 공통 에러 응답과 JWT 인증·인가 (#79)

#79-S1 실패는 같은 모양이고, 입력 검사 실패는 칸별 문구를 담는다 [테스트]
- Then `BusinessException`은 `ErrorCode`의 상태·코드로, `@Valid` 실패와 잘못된 JSON은 400 `INVALID_INPUT`으로 응답한다. 칸별 문구는 `error.fields`에 칸마다 첫 문구 하나

#79-S2 예상하지 못한 오류는 500이고 내부 내용을 숨긴다 [테스트]

#79-S3 토큰 없이 로그인이 필요한 API를 부르면 401 `UNAUTHORIZED` [테스트]
- 공개 주소(`/api/auth/**`, Swagger)는 토큰 없이 열린다

#79-S4 위조·만료 토큰, 없는 회원·정지 회원의 토큰은 401 [테스트]
- 탈퇴 회원도 ACTIVE가 아니라 같은 경로로 막힌다

#79-S5 일반 회원이 `/api/admin/**`을 부르면 403 `FORBIDDEN`, 운영자는 통과 [테스트]

#79-S6 컨트롤러는 `@AuthenticationPrincipal Long userId`로 회원 id를 받는다 [테스트]

#79-S7 Swagger의 Authorize에 access 토큰을 넣으면 로그인이 필요한 API를 시험할 수 있다 [직접]
- `/swagger-ui.html` → `POST /api/auth/login` → 받은 `accessToken`을 Authorize에 넣고 `GET /api/users/me`

## 2. 이메일 가입·로그인·토큰 갱신 (#80)

#80-S1 가입하면 회원과 이메일 로그인 계정이 함께 생기고, 비밀번호는 BCrypt로 저장한다 [테스트]

#80-S2 이미 쓰는 이메일·닉네임은 409 `EMAIL_TAKEN`·`NICKNAME_TAKEN`, 형식이 틀리면 프론트와 같은 문구 [테스트]
- 형식 규칙과 문구는 프론트 `lib/validation.ts`와 같다

#80-S3 로그인하면 access·refresh 토큰과 유효 시간(1800초, 1209600초)을 받는다. 이메일 대소문자는 가리지 않는다 [테스트]

#80-S4 이메일이 없거나 비밀번호가 틀리면 같은 401 `INVALID_CREDENTIALS` [테스트]

#80-S5 정지 회원은 403 `SUSPENDED`, 탈퇴 회원은 없는 계정과 같다 [테스트] (고침 #84: 탈퇴 유예 회원은 403 `WITHDRAWAL_PENDING`과 되돌리기 토큰을 받는다. 파기된 회원은 로그인 계정이 없어 401 `INVALID_CREDENTIALS`)

#80-S6 refresh 토큰으로 새 토큰 쌍을 받고, 쓴 refresh 토큰은 다시 쓸 수 없다 [테스트]

#80-S7 로그아웃하면 refresh 토큰이 버려진다 [테스트]

#80-S9 로그아웃하면 그 로그인 세션이 끝나서, 로그아웃 전에 갱신으로 받은 토큰도 쓸 수 없다 [테스트]
- Given 로그인해 R0를 받고, 다른 기기에서도 로그인한다
- When  R0로 갱신해 R1·A1을 받은 뒤(응답이 브라우저에 늦게 닿는 상황), R0로 로그아웃한다
- Then  R1로 갱신하면 401, A1로 `GET /api/users/me`를 부르면 401이다. 다른 기기의 access 토큰은 그대로 200이다
- PR #102 리뷰에서 찾은 경쟁 상황이다. 로그아웃이 토큰 하나만 버리면 늦게 도착한 R1·A1이 로그인을 되살렸다

#80-S10 여러 번 갱신한 뒤에도 처음 토큰으로 로그아웃하면 그 세션이 끝난다 [테스트]
- Given 로그인해 R0를 받고, R0 → R1 → R2로 두 번 갱신한다
- When  R0를 담고 있던 늦은 로그아웃 요청이 도착한다
- Then  R2로 갱신하면 401, A2로 `GET /api/users/me`를 부르면 401이다
- PR #102 리뷰에서 찾았다. 갱신할 때 예전에 쓴 토큰 행을 지우면 R0로 세션을 찾지 못했다

#80-S11 같은 세션에 요청이 동시에 와도 토큰은 한 번만 쓰이고 로그아웃이 지켜진다 [테스트]
- Given 로그인해 refresh 토큰을 받는다
- When  같은 토큰으로 갱신 세 번을 동시에 보낸다
- Then  하나만 200이고 나머지는 401이다
- When  같은 토큰으로 갱신과 로그아웃을 동시에 보낸다
- Then  로그아웃은 200이다. 갱신이 먼저 끝나 200을 받았어도 그 새 access·refresh 토큰은 401이다
- PR #102 리뷰에서 찾았다. 확인과 사용 표시 사이에 잠금이 없어 같은 토큰으로 동시에 갱신하면 모두 성공했다
- 여러 탭이 같은 토큰으로 갱신하는 것은 프론트(`proxy.ts`)가 한 번으로 모아 보낸다(`docs/frontend/auth/auth.md` #82-S8)

#80-S12 로그인하면 그 회원의 만료된 refresh 토큰 행을 지운다 [테스트]
- Given 회원에게 만료된 refresh 토큰 행이 있다(로그아웃하지 않고 끝난 세션)
- When  그 회원이 로그인한다
- Then  만료된 행이 지워진다. 쓴 토큰 행을 만료까지 남기므로 행이 끝없이 쌓이지 않게 한다

#80-S8 BCrypt 한도(72바이트)를 넘는 비밀번호는 500이 아니다 [테스트]
- 가입: 비밀번호는 영문·숫자·특수문자(ASCII)만 받아 64자여도 64바이트다. 한글이 섞이면 칸별 400 "영문·숫자·특수문자로, 영문과 숫자를 섞어 8~64자로 써 주세요"
- 로그인: 같은 비밀번호로 로그인하면 401 `INVALID_CREDENTIALS`

## 3. 내 정보·구독 여부 확인 (#81)

#81-S1 `GET /api/users/me`로 내 정보, 연동된 로그인 방식, 비밀번호 유무, 구독 상태를 받는다 [테스트]

#81-S2 지금 시각이 기간 안에 들어가는 ACTIVE 구독이 있으면 `subscription.active`가 true이고 플랜·만료일이 온다 [테스트] (고침 #69: 만료일은 `/api/v1/my/subscription/status`와 같은, 지금 기간에서 이어 붙은 기간의 끝이다)
- 판단 기준은 [결제·구독·크레딧](../payment/entities.md#6-내-구독-45-r6)과 같다. `UserServiceImpl.getMe`가 `SubscriptionService.getStatus`를 불러 구독 화면과 같은 계산을 쓴다([subscription.md](../payment/subscription.md))

#81-S3 기간이 끝났거나 해지(CANCELLED)한 구독은 구독이 아니다 [테스트]

#81-S4 운영자는 구독 대상이 아니라서 `subscription`이 null이다 [테스트]

#81-S5 구독자 전용 기능은 `subscriptionChecker.require(userId)`로 막고, 아니면 403 `SUBSCRIPTION_REQUIRED` [직접]
- 아직 부르는 API가 없다. 첫 사용처가 생기면 그 기능 테스트가 확인한다

## 4. Google·GitHub 로그인과 계정 연동 (#83)

백엔드는 브라우저에 열려 있지 않아서 제공자 콜백은 Next(`/auth/callback/{provider}`)가 받고, 받은 code를 백엔드에 넘겨 백엔드가 제공자와 교환한다. 제공자 토큰은 저장하지 않고, 회원 정보만 읽고 버린다. 프론트 흐름은 [로그인·회원가입](../../frontend/auth/auth.md) 10장.

- API
  - `GET /api/auth/oauth/{provider}/authorize-url?redirectUri=&state=`: 제공자 동의 화면 주소. 앱 id는 백엔드만 안다
  - `POST /api/auth/oauth/{provider}` `{code, redirectUri}`: 로그인. 처음 온 사람이면 `signupRequired: true`와 가입 토큰
  - `POST /api/auth/oauth/signup` `{signupToken, name}`: 소셜 가입하고 로그인
  - `POST·DELETE /api/users/me/accounts/{provider}`: 로그인한 회원의 연동·해제 (화면은 #84의 내 정보 수정에서)
- `provider`는 `google`, `github`. 그 밖은 404
- 앱 값은 환경 변수 `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`. 비어 있으면 소셜 로그인만 실패한다. 내 컴퓨터에서는 `backend/config/application-local.yml`(커밋하지 않음)에 같은 이름으로 넣어도 된다
- 소셜 가입 토큰은 서명한 JWT(10분)이고 제공자·제공자 회원 id·확인된 이메일·닉네임 후보를 담는다. 회원 id(`sub`)가 없어 access 토큰으로 쓸 수 없고, access 토큰은 가입 토큰으로 쓸 수 없다
- GitHub 이메일은 확인된 대표 이메일(`/user/emails`의 primary·verified)만 쓴다

#83-S1 이미 연동된 소셜 계정으로 오면 바로 로그인된다 [테스트]
- Given 그 제공자 계정이 연동된 회원이 있다
- When  같은 제공자 계정으로 소셜 로그인한다
- Then  `signupRequired: false`와 로그인 토큰이 온다

#83-S2 처음 온 사람은 이름을 입력해 가입한다 [테스트]
- Given 제공자가 확인한 이메일이 있고, 그 이메일·제공자 계정으로 가입한 회원이 없다
- When  소셜 로그인한다
- Then  `signupRequired: true`와 가입 토큰·이메일·닉네임이 온다. 가입 토큰과 이름으로 가입하면 로그인 토큰이 온다
- 이름은 필수(20자까지), 닉네임은 입력받지 않는다. GitHub 사용자명이나 Google 이름에서 닉네임 규칙(한글·영문·숫자 1~39자)에 맞는 글자만 남기고, 비면 "회원", 겹치면 숫자 네 자리를 붙인다
- 닉네임은 소셜 로그인 때 한 번 정해 가입 토큰에 넣어서, 이름 입력 화면에 보인 닉네임 그대로 가입된다(그사이 누가 가져갔을 때만 숫자를 다시 붙인다)

#83-S3 제공자가 확인한 이메일과 같은 소셜 회원이 있으면 그 회원에 연동해 로그인한다 [테스트]
- 예: 구글로 가입한 회원이 같은 이메일의 GitHub으로 오면 GitHub을 연동한다
- 확인되지 않은 이메일이면 연동도 가입도 하지 않고 400 `OAUTH_EMAIL_REQUIRED`
- 이메일 가입(비밀번호가 있는) 회원은 #83-S13
- 그 회원에 같은 제공자의 다른 계정이 이미 연동돼 있으면 연동하지 않고 409 `PROVIDER_ALREADY_LINKED`. 로그인 화면에 이유가 보인다

#83-S4 로그인한 회원이 소셜 계정을 연동·해제한다 [테스트]
- 마지막 로그인 방법은 해제할 수 없다(409 `LAST_LOGIN_METHOD`). 제공자마다 계정 하나(같은 제공자의 다른 계정이 있으면 409 `PROVIDER_ALREADY_LINKED`)

#83-S5 다른 회원에 이미 연동된 소셜 계정은 연동할 수 없다(409 `ACCOUNT_ALREADY_LINKED`) [테스트]

#83-S6 가입 토큰은 위조하거나 access 토큰과 바꿔 쓸 수 없다 [테스트]
- 위조·만료는 401 `INVALID_SIGNUP_TOKEN`, 가입 토큰을 Bearer로 쓰면 401, 이미 가입한 가입 토큰을 다시 쓰면 409

#83-S7 정지된 회원은 소셜 로그인도 403 `SUSPENDED` [테스트]
- 탈퇴 유예 회원은 401 `OAUTH_FAILED`로 막기만 한다. 되돌리기는 #84 (고침 #84: 이메일 로그인과 같이 403 `WITHDRAWAL_PENDING`과 되돌리기 토큰)

#83-S8 동의 화면 주소에는 앱 id·돌아올 주소·state·scope가 들어가고 비밀번호는 없다 [테스트]
- scope: Google `openid email profile`, GitHub `read:user user:email`

#83-S13 이메일 가입(비밀번호가 있는) 회원에는 같은 이메일이어도 자동 연동하지 않는다 [테스트]
- Given 어떤 이메일로 이메일 가입한 회원이 있다
- When  같은 이메일이 확인된 구글·GitHub 계정으로 소셜 로그인한다
- Then  409 `EMAIL_ACCOUNT_EXISTS`("이메일로 로그인한 뒤 마이페이지에서 연동해 주세요")이고 연동하지 않는다
- 이메일 가입은 이메일 인증이 없어서, 남이 그 이메일로 먼저 가입해 두었을 수 있다. 자동 연동하면 그 사람이 비밀번호로 같은 계정에 들어올 수 있다. 이메일 인증이 생기면 인증된 계정에는 자동 연동해도 된다
- 연동은 이메일로 로그인한 뒤 마이페이지에서 한다(#83-S4, 화면은 #84)

#83-S14 소셜 로그인과 계정 연동은 제공자와 통신하는 동안 DB 트랜잭션을 잡지 않는다 [테스트]
- 제공자를 2~3번(한 번에 5초까지) 부르는 동안 연결 풀을 잡고 기다리지 않게, 컨트롤러가 트랜잭션 밖에서 회원 정보를 받고 서비스는 받은 정보로 조회·저장만 한다

## 5. 내 정보 수정과 비밀번호 (#84)

개인정보 수정 화면(`/my/profile/edit`)이 쓰는 API다. DB 변경은 없다. 탈퇴는 [아래 6](#6-회원-탈퇴-84)에 있다. #84-S1~S8은 프론트 탈퇴 화면이 쓴다.

- API
  - `PATCH /api/users/me` `{name, nickname}`: 이름·닉네임 수정. 바뀐 내 정보(`GET /api/users/me`와 같은 모양)를 돌려준다
  - `PATCH /api/users/me/password` `{currentPassword, newPassword}`: 비밀번호 변경. 이메일 로그인 계정이 없는 소셜 회원은 `currentPassword` 없이 비밀번호를 만든다(이메일 로그인이 더해진다)
- 입력 규칙과 문구는 이메일 가입(#80)과 같다. 이름 20자까지, 닉네임 한글·영문·숫자 1~39자, 비밀번호 영문·숫자를 섞은 8~64자
- 이메일은 바꿀 수 없다(이번 범위 밖)
- 프로필 이미지 변경(이슈 시나리오 1)은 파일 저장 공용 코드가 생기면 붙인다. 신고 증거 첨부(#85)와 같은 저장 코드를 쓴다

#84-S9 이름·닉네임을 바꾼다 [테스트]
- Given 로그인한 회원
- When  `PATCH /api/users/me`로 새 이름·닉네임을 보낸다
- Then  200이고 응답과 `GET /api/users/me`에 바뀐 이름·닉네임이 보인다
- 닉네임을 그대로 두면 바꾸지 않은 것으로 보고 통과한다. 다른 회원의 닉네임이면 409 `NICKNAME_TAKEN`(칸 `nickname`), 규칙에 맞지 않으면 400 `INVALID_INPUT`(칸별 문구)

#84-S10 비밀번호를 바꾸면 새 비밀번호로만 로그인되고, 지금 기기 말고 다른 기기의 로그인은 끊긴다 [테스트]
- Given 이메일로 가입한 회원이 두 기기(로그인 세션 둘)에서 로그인했다
- When  한 기기에서 현재 비밀번호와 새 비밀번호로 바꾼다
- Then  200이고, 옛 비밀번호로는 로그인되지 않고 새 비밀번호로 로그인된다
- Then  바꾼 기기의 refresh 토큰은 그대로 쓰이고, 다른 기기의 refresh 토큰과 access 토큰은 401이다

#84-S11 현재 비밀번호가 틀리거나 새 비밀번호가 지금과 같으면 바꾸지 않는다 [테스트]
- 현재 비밀번호가 비거나 틀리면 400 `INVALID_INPUT`(칸 `currentPassword`: "현재 비밀번호가 맞지 않아요"), 새 비밀번호가 지금과 같으면 400(칸 `newPassword`: "지금 쓰는 비밀번호와 달라야 해요"), 새 비밀번호 규칙 위반은 400(칸별 문구)

#84-S12 소셜로만 가입한 회원은 현재 비밀번호 없이 비밀번호를 만들고, 그 뒤 이메일로도 로그인한다 [테스트]
- Given 깃허브로만 가입해 `hasPassword`가 false인 회원
- When  `currentPassword` 없이 새 비밀번호를 보낸다
- Then  200이고 `GET /api/users/me`의 `hasPassword`가 true, `providers`에 LOCAL이 더해지고, 가입 이메일과 새 비밀번호로 로그인된다

#84-S13 로그인하지 않으면 두 API 모두 401 [테스트]

### 연동한 계정의 이메일 (#84-R4)
- 소셜 계정(`accounts`)에 제공자가 알려 준 이메일(`provider_email`, null 가능)을 둔다. 연동·소셜 가입 때 저장하고, 그 계정으로 소셜 로그인할 때마다 바뀌었으면 새 값으로 바꾼다. 제공자가 이메일을 주지 않으면 그대로 둔다. 확인되지 않은 이메일도 화면 표시용으로만 저장하고 로그인·가입 판단에는 쓰지 않는다
- 이 칸이 생기기 전에 연동한 계정은 null이고, 다음 소셜 로그인 때 채워진다. 테스트 서버는 `ddl-auto: update`라 칸이 자동으로 더해진다
- `GET /api/users/me`에 `accounts: [{provider, email}]`를 더한다. LOCAL은 가입 이메일, 소셜은 제공자 이메일(모르면 null). 기존 `providers`는 그대로 둔다
- 파기(30일 뒤)는 계정 행을 지우므로 제공자 이메일도 함께 사라진다

#84-S30 연동한 소셜 계정의 이메일이 내 정보에 보이고, 그 계정으로 로그인하면 바뀐 이메일로 갱신된다 [테스트]
- 깃허브로 가입하면 `accounts`의 GITHUB 이메일이 가입 이메일이다. 구글을 연동하면 GOOGLE에 구글 이메일(소문자)이 보인다
- 구글 쪽 이메일이 바뀐 뒤 구글로 로그인하면 새 이메일로 바뀌고, 이메일을 주지 않는 로그인은 값을 지우지 않는다
- 칸이 생기기 전에 연동한 계정은 null이고, 다음 소셜 로그인 때 채워진다

## 6. 회원 탈퇴 (#84)

탈퇴는 바로 지우지 않고 30일 유예(`WITHDRAWN`) 뒤 개인정보를 파기한다(`DELETED`).

- API
  - `DELETE /api/users/me` `{password}` 또는 `{confirmText: "탈퇴합니다"}`: 탈퇴 신청. 비밀번호가 있으면 비밀번호, 소셜로만 가입했으면 확인 문구를 확인한다. 모든 기기의 로그인(refresh 토큰)을 지운다
  - `POST /api/auth/restore` `{restoreToken}`: 탈퇴 되돌리기. 로그인 토큰을 준다
- 되돌리기 흐름: 유예 회원이 이메일·소셜 로그인에 성공하면 403 `WITHDRAWAL_PENDING`과 `error.fields.restoreToken`(10분), `error.fields.purgeAt`(파기 예정 일시)을 받는다. 프론트가 "되돌릴까요?"를 묻고 `restoreToken`으로 되돌린다
  - 이슈의 `POST /api/users/me/restore` 대신 이 주소로 했다. 유예 회원은 로그인 전이라 access 토큰이 없다
  - 되돌리기 토큰은 회원 id를 `sub`가 아닌 `uid`에 넣어 access 토큰으로 쓸 수 없다
  - 토큰에 탈퇴 신청 일시(`wat`)를 넣어 그 탈퇴에만 쓴다. 되돌린 뒤 다시 탈퇴하면 예전 토큰은 401 `INVALID_RESTORE_TOKEN`
  - 30일이 지나면 파기 작업(04:00) 전이라도 되돌릴 수 없다. 로그인은 파기된 회원과 같이 401 `INVALID_CREDENTIALS`, 되돌리기는 401 `INVALID_RESTORE_TOKEN`
- 출금 처리 중(`cashouts.status = REQUESTED`)이면 409 `CASHOUT_IN_PROGRESS`
  - 출금 신청도 회원 행을 먼저 잠가서(`findByIdForUpdate`), 탈퇴와 출금이 동시에 와도 둘 중 하나만 된다. 탈퇴가 먼저 끝났으면 출금 신청은 401
- 파기: 매일 04:00(`withdrawal.purge-cron`) 탈퇴 신청 뒤 30일이 지난 회원의
  - 회원마다 되돌리기와 같은 행 잠금(`findByIdForUpdate`)을 잡고 상태와 기한을 다시 확인한다. 목록을 읽은 뒤 되돌린 회원은 건너뛴다
  - 로그인 계정(`accounts`)과 로그인 세션(`refresh_tokens`)을 지운다
  - 이름·프로필 이미지는 비우고, 이메일은 `deleted-{id}@withdrawn`, 닉네임은 `탈퇴한 회원#{id}`로 바꾼다. 이메일이 바뀌어 같은 이메일로 다시 가입할 수 있다. 바꾼 이메일은 도메인에 점이 없어 가입 형식 검사를 통과하지 못하므로, 누가 먼저 그 주소로 가입해 파기가 막히는 일이 없다
  - 피드백·결제·크레딧·출금 기록은 회원 행(id)을 그대로 가리켜 남는다
- 남은 크레딧은 로그인할 수 없어 쓸 수 없게 된다. 지갑과 원장은 기록으로 남는다
- DB 변경: `users.withdrawn_at` 컬럼(자동 추가), `users.status`에 `DELETED`. `ddl-auto: update`는 기존 check 제약을 고치지 않으므로 테스트 서버에서 한 번 실행한다

```sql
alter table users drop constraint if exists users_status_check;
alter table users add constraint users_status_check
  check (status in ('ACTIVE', 'SUSPENDED', 'WITHDRAWN', 'DELETED'));
```

#84-S14 비밀번호를 확인하고 탈퇴하면 탈퇴 유예가 되고 모든 기기의 로그인이 끊긴다 [테스트]
- 틀린 비밀번호는 400(칸 `password`). 탈퇴하면 `withdrawn_at`이 남고, 그 access 토큰과 다른 기기의 refresh 토큰은 401

#84-S15 소셜로만 가입한 회원은 확인 문구 "탈퇴합니다"로 탈퇴한다 [테스트]
- 다른 문구는 400(칸 `confirmText`). 앞뒤 공백은 무시한다

#84-S16 출금 처리 중인 요청이 있으면 탈퇴할 수 없다 [테스트]
- 409 `CASHOUT_IN_PROGRESS`, 상태는 그대로

#84-S17 유예 기간에 로그인하면 되돌리기 안내를 받고, 되돌리면 그대로 다시 쓴다 [테스트]
- 로그인은 403 `WITHDRAWAL_PENDING`과 `restoreToken`·`purgeAt`. 되돌리면 `ACTIVE`, `withdrawn_at`은 비고 로그인 토큰을 받는다
- 되돌리기 토큰을 Bearer로 쓰면 401, 틀린 토큰과 이미 되돌린 토큰은 401 `INVALID_RESTORE_TOKEN`

#84-S18 유예 회원은 소셜 로그인에서도 되돌리기 안내를 받는다 [테스트]

#84-S19 유예 기간에는 같은 이메일로 가입할 수 없다 [테스트]
- 409 `EMAIL_TAKEN`

#84-S20 30일이 지나면 개인정보와 로그인 계정을 파기하고, 같은 이메일로 다시 가입할 수 있다 [테스트]
- 30일이 안 됐으면 파기하지 않는다. 파기 뒤 로그인은 401, 같은 이메일 가입은 201

#84-S21 탈퇴 신청과 출금 신청이 동시에 와도 둘 중 하나만 된다 [테스트]
- 탈퇴 유예이면서 처리 중인 출금 요청이 있는 회원이 생기지 않는다

#84-S26 파기 작업과 되돌리기가 동시에 와도 되돌린 회원은 파기하지 않는다 [테스트]
- 되돌리기가 성공했으면 `ACTIVE`, 아니면 `DELETED`. 되돌리기 성공 응답 뒤 파기되는 일이 없다

#84-S27 30일이 지나면 파기 작업 전이라도 로그인·되돌리기를 할 수 없다 [테스트]
- 로그인은 401 `INVALID_CREDENTIALS`, 받아 둔 되돌리기 토큰은 401 `INVALID_RESTORE_TOKEN`. 상태는 `WITHDRAWN` 그대로이고 파기 작업이 지운다

#84-S28 되돌린 뒤 다시 탈퇴하면 예전 되돌리기 토큰은 쓸 수 없다 [테스트]
- 예전 토큰은 401 `INVALID_RESTORE_TOKEN`. 새로 로그인해 받은 토큰으로는 되돌린다

#84-S29 파기한 회원의 이메일 주소로는 가입할 수 없어, 파기가 가입 이메일과 겹치지 않는다 [테스트]
- `deleted-1@withdrawn`으로 가입하면 400(칸 `email`)

## 범위 밖
- 알림(공통 알림 기능 때), 허위 신고자 제재, 이메일 인증, 비밀번호 찾기, 만료된 refresh 토큰 정리
