# 백엔드 구독 플랜·내 구독 상태

시나리오 제목 끝의 태그가 확인 방법이다. `[테스트]`만 이 문서 시나리오와 백엔드 테스트가 1:1이고, `[직접]`은 사람이 API·화면·코드로 확인한다.

이슈: [#69](https://github.com/likelion-backendschool-9th/test-moa/issues/69). 요구·시나리오는 `#69-R…`, `#69-S…`부터 센다. 엔티티는 [entities.md](entities.md), 도메인 결정은 [README.md](README.md).

## 한눈에
- 끝나면: 서버가 지금 파는 구독 플랜 목록, 내 구독 상태(구독 중인지·만료일·남은 날·이용 중인 플랜), 구독 결제에 쓸 수 있는 크레딧을 돌려주고, 운영자가 API로 플랜을 등록한다. 경로는 팀 API 표를 따르되, 플랜 목록은 구독 설명 페이지에서도 쓰므로 `/api/v1/plans`로 둔다.
- 선행: #45(`Plan`·`Subscription`), #66(지갑 `payable()`).
- 화면: `/my/subscription`, 마이페이지 대시보드 구독 카드 — [subscription.md](../../frontend/payment/subscription.md)
- 프론트 목업 제거와 API 연동은 이 이슈 범위 밖이다. 결제 화면 조회는 #70, 결제 실행은 #71이다.

## 정한 것 (#69, 2026-11-07)
- **모집 한도는 없다.** 팀에서 모집 인원을 없애기로 해서([프로젝트 #78-R1](../../frontend/project/projects.md)) `Plan.monthlyRecruitLimit`을 지웠고, 무료 한도·이번 달 사용량도 이 API에 없다. 이슈 본문의 해당 시나리오는 뺐다.
- **구독 상태에 `EXPIRED`는 없다.** 상태는 `ACTIVE`·`CANCELLED`뿐이고, 기간이 끝났는지는 날짜로 판단한다. 만료로 바꾸는 배치는 두지 않는다.
- **`Plan.tier`는 `String`으로 둔다.** 무료는 `Plan` 행이 아니고 유료 등급이 하나라서 `enum`이 필요 없다. 등급이 늘어 코드가 등급 이름으로 갈라져야 할 때 `enum`을 더한다.
- 무료는 행으로 두지 않는다. 구독이 아니면 무료다.
- **경로는 팀 API 표를 따른다.** 내 구독 상태와 결제 가능 크레딧은 `/api/v1/my/subscription/…`이고 로그인이 필요하다. 토큰의 회원을 쓰고 경로에 회원 id를 받지 않는다.
- **플랜 목록은 `GET /api/v1/plans`이고 로그인 없이 읽는다.** 구독 설명 페이지(#76)와 구독 화면이 같이 쓰는 목록이라, 팀 API 표의 `GET /api/v1/my/subscription`(구독 플랜 조회) 대신 이 경로로 둔다. 이슈 본문의 `/api/plans`, `/api/users/{userId}/…`, 구독 화면을 한 번에 주는 `/page`는 쓰지 않는다.
- **플랜은 시드 없이 운영자 등록 API로 넣는다.** `POST /api/v1/admin/plans`로 만들고, 같은 등급을 다시 등록하면 `version`을 올린 새 행이 된다. 팀 API 표에는 없는 API라서 이 이슈에서 더한다. DB가 비어 있으면 플랜 목록은 빈 배열이다.
- **혜택은 `plans.description` 한 칼럼에 쉼표로 이어 넣는다.** 서버가 잘라 `benefits` 배열로 내려준다. 혜택 문구에는 쉼표를 쓰지 않는다(쓰면 등록할 때 400). 무료 열의 문구는 `Plan` 행이 없어서 프론트가 계속 가진다.
- **응답 필드 이름은 서버 이름을 쓴다.** 프론트의 `status`·`expiresAt`·`name`과 다른 이름(`active`·`endAt`·`tier`)은 프론트 `features/subscription/api.ts`가 변환한다. 구독 상태 응답에는 이용 중인 플랜 행의 `planId`를 넣는다.
- **마이페이지 대시보드의 구독 상태(`GET /api/v1/my/profile/subscription`)도 이 이슈에서 만든다.** 구독 화면의 `/status`와 같은 값이라 같은 서비스 메서드를 부른다.
- **`GET /api/users/me`의 `subscription`도 같은 계산을 쓴다.** `UserServiceImpl.getMe`가 `SubscriptionService.getStatus`를 불러서, 이어 붙은 기간에서도 `/me`와 `/status`의 만료일이 갈라지지 않는다. 운영자는 `subscription`이 `null`이다.

## API

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| `GET` | `/api/v1/plans` | 구독 플랜 조회(지금 파는 플랜 목록). 로그인 없이 읽는다 |
| `POST` | `/api/v1/admin/plans` | 플랜 등록. 운영자만 |
| `GET` | `/api/v1/my/subscription/status` | 내 구독 상태. 로그인 필요 |
| `GET` | `/api/v1/my/subscription/payable-credits` | 구독 결제에 쓸 수 있는 크레딧. 로그인 필요 |
| `GET` | `/api/v1/my/profile/subscription` | 마이페이지 대시보드의 구독 상태. `/status`와 같은 응답. 로그인 필요 |

인증은 토큰의 회원 id다(#66·#67과 같음). 컨트롤러와 서비스는 1:1로 둔다.

| 쌍 | 맡는 API |
| --- | --- |
| `SubscriptionController`·`SubscriptionService` | `/status`, `/payable-credits`, `/my/profile/subscription` |
| `PlanController`·`PlanService` | `GET /api/v1/plans` |
| `controller/admin/AdminPlanController`·`service/admin/AdminPlanService` | `POST /api/v1/admin/plans` |

회원용은 `PlanController`·`PlanService`, 운영자용은 `AdminPlanController`·`AdminPlanService`로 클래스 이름을 나눠서 빈 이름을 따로 지정하지 않는다(코드 리뷰 반영). 지금 있는 `SubscriptionChecker`는 "구독 중인지" 판단하는 도우미라 그대로 쓴다.

운영자는 구독 대상이 아니라서 로그인이 필요한 구독 API는 `eligible=false`만 돌려준다. 플랜 목록은 회원과 상관없이 같은 값이다. 공개로 열려면 `SecurityConfig`의 `PUBLIC_PATHS`에 `/api/v1/plans`를 더한다. `/api/v1/admin/**`는 이미 `ADMIN`만 허용한다([admin-cashout.md](admin-cashout.md)).

### 내 구독 상태 응답 (`/status`, `/my/profile/subscription`)

| 필드 | 의미 |
| --- | --- |
| `eligible` | 구독 대상인지. 운영자는 `false` |
| `active` | 지금 구독 중인지 |
| `planId` | 이용 중인 기간이 가리키는 플랜 행의 id(`plans.id`). 구독 중이 아니면 `null` |
| `plan` | 그 플랜의 `tier`(등급 이름). 구독 중이 아니면 `null` |
| `endAt` | 화면 만료일. 구독 중이 아니면 `null` |
| `remainingDays` | 만료일까지 남은 날(올림). 구독 중이 아니면 `null` |

`planId`는 구독이 산 당시의 플랜 행이다. 플랜 조건이 바뀌어 새 `version`이 생기면 목록(`/api/v1/plans`)에는 새 행만 나오고, 이미 산 구독은 옛 행을 계속 가리킨다. 그래서 `planId`로 목록에서 플랜을 못 찾을 수 있고, 화면에 보일 이름은 `plan`(`tier`)을 쓴다.

### 구독 플랜 응답 (`GET /api/v1/plans`)

지금 파는 플랜의 목록이다(배열). 회원 정보가 없어서 `eligible`이나 결제 화면 주소는 넣지 않는다.

플랜 한 건:

| 필드 | 의미 |
| --- | --- |
| `id` | 플랜 id(`plans.id`) |
| `tier` | 등급 이름. 화면의 상품 이름("구독") |
| `version` | 같은 등급의 몇 번째 조건인지 |
| `cashPrice`, `creditPrice` | 현금·크레딧 가격 |
| `periodDays` | 이용 기간(일) |
| `benefits` | 혜택 문구 목록. `description`을 쉼표로 자르고 앞뒤 공백을 지운다. 없으면 빈 배열 |

### 플랜 등록 (`POST /api/v1/admin/plans`)

| 본문 필드 | 규칙 |
| --- | --- |
| `tier` | 필수. 비어 있지 않고 255자까지 |
| `cashPrice`, `creditPrice` | 필수. 0 이상의 정수 |
| `periodDays` | 필수. 1 이상 3650 이하의 정수(10년). 상한이 없으면 결제(#71)에서 만료 시각이 DB 날짜 범위를 넘을 수 있다 |
| `benefits` | 선택. 문자열 목록. 최대 10개, 각 항목은 비어 있지 않고 100자까지, 쉼표가 없다 |

`version`은 서버가 정한다. 그 `tier`의 행이 없으면 1, 있으면 가장 큰 `version`에 1을 더한다. 옛 행은 고치지도 지우지도 않는다. 응답은 만든 플랜 한 건(위 플랜 응답과 같은 모양)이다. `benefits`는 쉼표로 이어 `description`에 저장한다.

### 결제 가능 크레딧 응답 (`/payable-credits`)

| 필드 | 의미 |
| --- | --- |
| `eligible` | 운영자는 `false`이고 `payableCredits`가 없다 |
| `payableCredits` | 구독 결제에 쓸 수 있는 크레딧 = 이벤트 + 적립, 출금 처리 중(잠김) 제외. 지갑이 없으면 0 |

## 규칙

| 규칙 | 내용 |
| --- | --- |
| 지금 파는 플랜 | 같은 `tier`에서 `version`이 가장 큰 행만 ([entities.md](entities.md)의 `uk_plans_tier_version`) |
| 구독 중 | `ACTIVE`이고 `startAt <= 지금 < endAt`인 행이 있다 (`SubscriptionChecker.findActive`) |
| 화면 만료일 | 지금 기간에서 빈틈없이 이어지는 `ACTIVE` 행(다음 행의 `startAt`이 앞 행의 `endAt`과 같거나 그보다 앞선) 중 가장 늦은 `endAt`. 겹치는 기간도 구독 중이라 함께 이어 붙는다 |
| 이용 중인 플랜 | 지금 기간의 행이 가리키는 플랜(산 당시 행) |
| 취소 | `CANCELLED` 행은 세지 않는다. 환불하면 만료일이 앞으로 돌아온다 |
| 구독 중이 아님 | 구독한 적이 없거나, 모든 기간이 끝났거나, 모두 취소된 경우다. 셋 다 `active=false`로 같다 |
| 운영자 | 구독 대상이 아니다(`eligible=false`) |

---

## 시나리오

#69-S1 지금 파는 플랜만 [테스트]
- Given 같은 `tier`에 `version` 1과 2 플랜이 있다. `version` 2의 `description`이 "지원자 중 직접 선정, 기본 + 추가 보상"이다
- When  `GET /api/v1/plans`
- Then  `version` 2만 나온다. 무료 행은 없다
- Then  `benefits`가 ["지원자 중 직접 선정", "기본 + 추가 보상"]이다. `description`이 비어 있으면 빈 배열이다

#69-S2 첫 플랜 등록 [직접]
- Given 플랜이 하나도 없는 DB
- When  `GET /api/v1/plans`
- Then  빈 배열이다
- When  운영자가 `POST /api/v1/admin/plans`로 "구독", 30일, 현금 10,000원, 크레딧 9,000을 등록한다
- Then  `GET /api/v1/plans`에 `version` 1인 한 건이 나온다

#69-S3 구독하지 않은 회원 [테스트]
- Given 구독 행이 없는 회원
- When  `GET /api/v1/my/subscription/status`
- Then  `active=false`, `planId`·`plan`·`endAt`·`remainingDays`는 `null`이다

#69-S4 구독 중 [테스트]
- Given 지금 기간(`startAt <= 지금 < endAt`)이 있는 회원
- Then  `active=true`, `planId`는 그 기간이 가리키는 플랜 행의 id, `plan`은 그 플랜의 `tier`, `endAt`은 그 기간의 끝, `remainingDays`는 남은 날(올림)이다

#69-S5 미리 결제해 이어 붙은 기간 [테스트]
- Given 11/1~12/1, 12/1~12/31 두 행(둘 다 `ACTIVE`)
- When  11/25와 12/10에 읽는다
- Then  둘 다 `active=true`, `endAt`은 12/31이다
- Given 12/1과 12/5 사이처럼 빈틈이 있는 행
- Then  빈틈 뒤의 행은 만료일에 이어 붙이지 않는다

#69-S6 기간이 끝난 구독 [테스트]
- Given `endAt`이 지났지만 상태는 `ACTIVE`인 행만 있는 회원
- Then  `active=false`, `planId`·`plan`·`endAt`은 `null`이다 (만료는 날짜로 판단한다)

#69-S7 취소된 구독은 세지 않는다 [테스트]
- Given 11/1~12/1 `ACTIVE`, 12/1~12/31 `CANCELLED`
- Then  11/25에 `endAt`은 12/1이다. 취소된 행은 `active`와 만료일에 들어가지 않는다

#69-S8 결제 가능 크레딧 [테스트]
- Given 지갑이 이벤트 3,000·적립 6,000·잠김 1,000
- When  `GET /api/v1/my/subscription/payable-credits`
- Then  `payableCredits=9000`이다. 잠긴 1,000은 빠진다
- Given 지갑이 없는 회원
- Then  `payableCredits=0`이다

#69-S9 운영자는 구독 대상이 아니다 [테스트]
- Given 운영자 토큰
- When  내 구독 상태와 결제 가능 크레딧을 읽는다
- Then  둘 다 `eligible=false`이고 구독 상태·`payableCredits`가 없다

#69-S10 로그인이 필요하다 [테스트]
- When  토큰 없이 내 구독 상태와 결제 가능 크레딧을 읽는다
- Then  401
- When  토큰 없이 `GET /api/v1/plans`를 읽는다
- Then  200. 플랜 목록은 로그인 없이 읽는다

#69-S11 전체 흐름 [직접]
- API: 위 표의 다섯 개
- Then  플랜 등록 → 플랜 목록 → 구독 전 → (결제 #71 뒤) 구독 중 → 이어 붙인 만료일 → 기간이 끝나면 다시 `active=false`로 이어진다. 결제는 #71이 만들어지기 전까지 DB에 `Subscription` 행을 직접 넣어 확인한다

#69-S12 플랜 등록과 새 version [테스트]
- Given 플랜이 없다
- When  운영자가 "구독"을 등록한다
- Then  `version`이 1이고, 응답이 플랜 한 건이다. 혜택 `["a", "b"]`는 `description`에 "a,b"로 저장된다
- When  같은 "구독"을 다른 가격으로 다시 등록한다
- Then  `version`이 2인 새 행이 생기고 `GET /api/v1/plans`에는 2만 나온다. `version` 1 행은 그대로 남는다(그 행을 가리키는 구독이 있어도 바뀌지 않는다)

#69-S13 플랜 등록 입력 검사 [테스트]
- When  `tier`가 비었거나 255자를 넘거나 가격이 음수거나 `periodDays`가 1 미만이거나 3650을 넘거나 혜택이 11개 이상이거나 혜택 항목이 비었거나 100자를 넘거나 쉼표를 담고 있다
- Then  400. 플랜 행이 늘지 않는다

#69-S14 플랜 등록은 운영자만 [테스트]
- When  토큰 없이 `POST /api/v1/admin/plans`
- Then  401
- When  일반 회원 토큰으로 부른다
- Then  403. 플랜 행이 늘지 않는다

#69-S15 마이페이지 구독 상태 [테스트]
- Given 구독 중인 회원과 구독하지 않은 회원
- When  `GET /api/v1/my/profile/subscription`
- Then  `/status`와 같은 값이다

#69-S16 `GET /api/users/me`의 구독 상태도 `/status`와 같다 [테스트]
- Given 이어 붙은 기간(빈틈 뒤의 기간 포함)이 있는 회원, 이어 붙은 기간 하나가 취소된 회원, 기간이 끝났거나 시작 전인 회원, 운영자
- When  `GET /api/users/me`와 `GET /api/v1/my/subscription/status`를 읽는다
- Then  `subscription`의 `active`·`plan`·`endAt`이 `/status`와 같다. 운영자는 `/me`의 `subscription`이 `null`이고 `/status`는 `eligible=false`다
- 인증 문서의 #81-S2(구독 중이면 플랜·만료일)가 이 이슈에서 바뀐 동작이다(고침 #69)

#69-S17 화면의 "구독 중"과 구독자 전용 기능의 권한 검사가 같은 답을 낸다 [테스트]
- Given 기간이 없는 회원, 지금 기간, 끝난 기간, 시작 전 기간, 취소된 지금 기간, 이어 붙은 기간, 빈틈 뒤 기간, 취소 뒤 미리 결제한 기간, 지금 기간과 취소된 이어 붙은 기간
- When  `SubscriptionService.getStatus`(화면)와 `SubscriptionChecker.isActive`(구독자 전용 기능의 권한 검사)를 읽는다
- Then  둘 다 규칙 표대로(지금 기간이 있어야 구독 중) 같은 값이다. 한쪽만 고치면 화면은 "구독 중"인데 API는 403이 되는 일을 막는다(코드 리뷰 반영)

---

## 시작 전에 정할 것

| # | 무엇을 | 추천 |
| --- | --- | --- |
| 1 | 같은 `tier`를 동시에 등록할 때 | `uk_plans_tier_version`이 한쪽을 막는다. 막힌 쪽의 응답(그대로 500이 될 수 있다)을 409로 바꿀지는 정하지 않았다. 운영자 한 명이 하는 일이라 이 이슈에서는 정하지 않고 둔다 |

## 배포 전에 할 것
- 이 변경이 들어간 서버를 배포하기 전에 [backend/scripts/drop-plans-monthly-recruit-limit.sql](../../../backend/scripts/drop-plans-monthly-recruit-limit.sql)을 한 번 실행한다(`ALTER TABLE plans DROP COLUMN IF EXISTS monthly_recruit_limit;`). `ddl-auto: update`는 칼럼을 지우지 않아서, 이 칼럼이 `NOT NULL`로 남은 DB는 플랜 등록이 500으로 실패한다. 플랜 행이 있든 없든 칼럼이 있는 DB는 모두 해당한다. 빈 DB(CI, `create-drop`)는 영향이 없다. 다시 실행해도 안전하다.

## 범위 밖
- 구독 결제 화면 조회(#70)와 결제 실행(#71)
- 프론트 목업 제거·API 연동, 목업의 월간 모집 인원 행·`monthlyLimit` 정리
- 공개 구독 소개 페이지(#76) 화면. 이 이슈는 `GET /api/v1/plans`까지만 만든다
- 만료 배치, 구독 연장·환불 처리
- 플랜 수정·삭제·판매 중지 API(조건을 바꾸려면 새로 등록해 `version`을 올린다)
- 플랜 이미지. `Plan.imageUrl` 컬럼은 있지만 쓰는 화면이 없어서 등록 본문과 응답에 넣지 않는다. 화면이 필요로 하면 그때 더한다

## 작업 순서
1. `Plan`·`PlanRepository`(지금 파는 플랜 쿼리, [entities.md](entities.md)에 있음)와 혜택 쉼표 변환
2. 플랜 목록·플랜 등록(`PlanService`·`AdminPlanService`와 컨트롤러, `SecurityConfig`에 `/api/v1/plans` 공개)
3. 이어 붙은 기간을 읽는 `SubscriptionRepository` 메서드와 만료일 계산
4. `SubscriptionService`·`SubscriptionController`(구독 상태, 결제 가능 크레딧, 대시보드 구독 상태)와 응답 DTO
5. 시나리오 S1·S3~S10, S12~S17 테스트
6. 문서 정리(README 이슈 표와 이 문서 링크, 진행 표기 확인)

## 가정
- `Plan`·`Subscription`·`SubscriptionChecker`·`CreditWallet.payable()`은 #45·#66에 있다.
- `SecurityConfig`는 `/api/auth/**`와 Swagger만 공개이고 나머지는 로그인이 필요하다. `/api/v1/admin/**`는 `ADMIN`만 허용한다.
- 구독 행이 만들어지는 곳은 #71 결제 실행뿐이다. 그 전에는 테스트와 SQL로만 행을 만든다.
