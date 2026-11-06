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
| [#83](https://github.com/likelion-backendschool-9th/test-moa/issues/83) | Google·GitHub 로그인과 계정 연동 API | |
| [#84](https://github.com/likelion-backendschool-9th/test-moa/issues/84) | 내 정보 수정·비밀번호·탈퇴 | |
| [#85](https://github.com/likelion-backendschool-9th/test-moa/issues/85) | 회원 신고·증거 첨부 API | |
| [#86](https://github.com/likelion-backendschool-9th/test-moa/issues/86) | 운영자 제재·해제 API (#34와 역할 나누기 확정 후) | |
| [#87](https://github.com/likelion-backendschool-9th/test-moa/issues/87) | 테스트 서버 `JWT_SECRET`과 스키마 생성 방식 | |

진행 상태는 이슈와 PR에서 본다.

프론트: [로그인·회원가입](../../frontend/auth/auth.md), [신고·제재 관리](../../frontend/admin/reports.md), [회원 관리](../../frontend/admin/users.md)

## 정한 것
- 백엔드는 브라우저에 열려 있지 않다(BFF). 브라우저 → nginx → Next → 백엔드. Next가 토큰을 httpOnly 쿠키로 들고, 백엔드를 부를 때 `Authorization: Bearer`로 붙인다.
- access 토큰(30분)에는 회원 id(`sub`)와 로그인 세션 id(`sid`)만 넣는다. 권한·상태·구독·세션은 요청마다 DB에서 읽어서 바뀌면 바로 반영된다.
- refresh 토큰(14일)은 무작위 32바이트이고, SHA-256 해시만 `refresh_tokens`에 저장한다. 쓰면 다시 쓸 수 없게 표시하고(`used_at`) 새로 준다.
- 로그인 한 번이 로그인 세션 하나(`refresh_tokens.session_id`)다. 갱신으로 이어진 토큰은 같은 세션이고, 로그아웃하면 그 세션의 토큰을 모두 지운다. access 토큰도 세션이 없어지면 401이 된다. 다른 기기의 로그인(다른 세션)은 그대로다.
- 유효 시간은 환경 변수 `JWT_ACCESS_TOKEN_TTL`(기본 `30m`), `JWT_REFRESH_TOKEN_TTL`(기본 `14d`)로 바꿀 수 있다.
- 서명 키는 환경 변수 `JWT_SECRET`(32바이트 이상)으로만 넘긴다.

| 계층 | 위치 |
| --- | --- |
| 공통 | `global/exception`(`ErrorCode`, `BusinessException`, `GlobalExceptionHandler`), `global/security`(`SecurityConfig`, `JwtProvider`, `UserAuthenticationConverter`) |
| API | `AuthController`(`/api/auth/**`), `UserController`(`/api/users/me`) |
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

#80-S5 정지 회원은 403 `SUSPENDED`, 탈퇴 회원은 없는 계정과 같다 [테스트]

#80-S6 refresh 토큰으로 새 토큰 쌍을 받고, 쓴 refresh 토큰은 다시 쓸 수 없다 [테스트]

#80-S7 로그아웃하면 refresh 토큰이 버려진다 [테스트]

#80-S9 로그아웃하면 그 로그인 세션이 끝나서, 로그아웃 전에 갱신으로 받은 토큰도 쓸 수 없다 [테스트]
- Given 로그인해 R0를 받고, 다른 기기에서도 로그인한다
- When  R0로 갱신해 R1·A1을 받은 뒤(응답이 브라우저에 늦게 닿는 상황), R0로 로그아웃한다
- Then  R1로 갱신하면 401, A1로 `GET /api/users/me`를 부르면 401이다. 다른 기기의 access 토큰은 그대로 200이다
- PR #102 리뷰에서 찾은 경쟁 상황이다. 로그아웃이 토큰 하나만 버리면 늦게 도착한 R1·A1이 로그인을 되살렸다

#80-S8 BCrypt 한도(72바이트)를 넘는 비밀번호는 500이 아니다 [테스트]
- 가입: 비밀번호는 영문·숫자·특수문자(ASCII)만 받아 64자여도 64바이트다. 한글이 섞이면 칸별 400 "영문·숫자·특수문자로, 영문과 숫자를 섞어 8~64자로 써 주세요"
- 로그인: 같은 비밀번호로 로그인하면 401 `INVALID_CREDENTIALS`

## 3. 내 정보·구독 여부 확인 (#81)

#81-S1 `GET /api/users/me`로 내 정보, 연동된 로그인 방식, 비밀번호 유무, 구독 상태를 받는다 [테스트]

#81-S2 지금 시각이 기간 안에 들어가는 ACTIVE 구독이 있으면 `subscription.active`가 true이고 플랜·만료일이 온다 [테스트]
- 판단 기준은 [결제·구독·크레딧](../payment/entities.md#6-내-구독-45-r6)과 같다(#69와 `SubscriptionChecker`를 같이 쓰자는 제안)

#81-S3 기간이 끝났거나 해지(CANCELLED)한 구독은 구독이 아니다 [테스트]

#81-S4 운영자는 구독 대상이 아니라서 `subscription`이 null이다 [테스트]

#81-S5 구독자 전용 기능은 `subscriptionChecker.require(userId)`로 막고, 아니면 403 `SUBSCRIPTION_REQUIRED` [직접]
- 아직 부르는 API가 없다. 첫 사용처가 생기면 그 기능 테스트가 확인한다

## 범위 밖
- 알림(공통 알림 기능 때), 허위 신고자 제재, 이메일 인증, 비밀번호 찾기, 만료된 refresh 토큰 정리
