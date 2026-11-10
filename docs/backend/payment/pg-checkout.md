# 백엔드 구독 현금 결제 PG 연동 (카카오페이·토스페이 테스트)

시나리오 제목 끝의 태그가 확인 방법이다. `[테스트]`만 이 문서 시나리오와 백엔드 테스트가 1:1이고, `[직접]`은 사람이 PG 테스트 결제창까지 눌러 확인한다. 테스트에서 PG 서버는 가짜 구현으로 바꿔 끼운다.

이슈: [#249](https://github.com/likelion-backendschool-9th/test-moa/issues/249). 요구·시나리오는 `#249-R…`, `#249-S…`부터 센다. 화면은 [subscription.md](../../frontend/payment/subscription.md)의 "PG 결제 (#249)". 결제 실행 규칙은 [subscription-payment.md](subscription-payment.md)(#71), 결제 화면 조회는 [subscription-checkout.md](subscription-checkout.md), 도메인 결정은 [README.md](README.md).

## 한눈에
- 끝나면: 현금 결제는 카카오페이·토스페이 테스트 결제창에서 승인된 뒤에만 구독이 된다. 결제 준비 → PG 결제창 → 서버가 PG 승인 → 구독과 결제 저장. 크레딧 결제는 PG 없이 지금처럼 한다.
- 선행: #71(결제 실행), #70(결제 화면 조회).
- 실제 돈은 오가지 않는다. 카카오페이는 테스트 CID(`TC0ONETIME`)와 개발용 시크릿 키, 토스는 테스트 키(`test_…`)만 쓴다.
- 이 이슈 범위 밖: 환불·결제 취소, 정기 결제(자동 갱신), 운영(실거래) 키, 웹훅.

## 정한 것 (#249)
- **결제 수단은 `CASH`/`CREDIT` 그대로이고 현금은 `provider`로 나뉜다.** 새 enum `PaymentProvider`(`KAKAO_PAY`, `TOSS_PAY`). `Payment.Method`는 바꾸지 않는다. 크레딧 결제의 `provider`는 null이다.
- **`CASH` 직접 결제는 거절한다.** 기존 `POST /api/v1/my/subscription/checkout`에 `method=CASH`를 보내면 400 `INVALID_INPUT`이다(문구: "현금 결제는 카카오페이·토스페이로만 할 수 있어요"). 승인 없이 구독이 되는 길을 없애기 위해서다. 이 길로 현금 결제를 하던 #71 시나리오와 테스트는 `CREDIT`이나 PG 승인 경로로 바꾼다. 크레딧 결제는 그대로다 (고침 #71: 현금 직접 결제 거절).
- **결제는 두 단계 API다.** `ready`가 금액을 서버가 정해 결제 시도를 저장하고 PG 결제창 정보를 준다. `approve`가 PG 승인을 호출하고 구독과 결제를 만든다. 금액은 화면이 보낸 값을 쓰지 않고 시도에 저장한 서버 값만 쓴다.
- **결제 시도는 `payment_attempts` 테이블에 둔다.** 한 행 = 한 번의 결제 시도. 열: `id`, `user_id`, `plan_id`, `provider`, `order_id`(우리가 만든 주문번호, unique), `amount`, `status`(`PENDING`·`APPROVING`·`APPROVED`·`FAILED`), `pg_tid`(카카오 `tid`, 토스는 승인 때 `paymentKey`), `created_at`, `updated_at`. `Payment`에는 `provider`와 `pg_transaction_id`를 null 허용 컬럼으로 더한다(기존 결제 행이 있어서 not null로 못 붙인다. 테스트 서버는 `ddl-auto: update`로 만들어진다).
- **승인은 세 토막으로 나눈다.** ① 회원 행 잠금 안에서 시도를 검증하고 `APPROVING`으로 바꾼 뒤 커밋 ② 잠금 밖에서 PG 승인 호출 ③ 회원 행 → 지갑 행 순서로 다시 잠그고 구독·결제를 저장하고 `APPROVED`로 바꿈. PG 호출 동안 회원 행을 잡고 있지 않기 위해서다. `APPROVING`으로 바꾸는 순간 같은 시도의 둘째 승인은 막힌다.
- **PG가 승인했는데 ③이 실패하면 시도는 `APPROVING`으로 남고 오류 로그를 남긴다.** 자동 취소(환불)는 이 이슈 밖이라 하지 않는다. 테스트 결제라 돈이 오가지 않는다.
- **5초 더블클릭 검사는 `ready`에서 한다.** 직전 결제가 5초 안이면 409 `DUPLICATE_PAYMENT`. 승인에서는 하지 않는다(PG가 이미 승인했는데 거절하면 안 된다). 승인의 중복은 시도 상태가 막는다.
- **결제 후 돌아올 주소는 서버 설정이 정한다.** 화면이 보낸 주소를 쓰지 않는다(엉뚱한 곳으로 돌려보내는 주소를 PG에 넣지 못하게). `PAYMENT_RETURN_BASE_URL`(기본 `http://localhost:3005`)에 경로를 붙인다. 이 도메인은 카카오페이 디벨로퍼스 앱의 사이트 도메인에 등록돼 있어야 한다.
- **키가 없으면 그 PG만 쓸 수 없다.** 서버는 키가 비어도 뜨고, `GET …/checkout`(#70)의 응답에 쓸 수 있는 `providers`를 더해 화면이 막는다. 쓸 수 없는 PG로 `ready`를 부르면 503 `PG_UNAVAILABLE`.
- **시도는 만료된다.** 만든 지 30분이 지난 `PENDING` 시도는 승인할 수 없다(PG의 결제 준비도 오래 못 간다). 배치로 지우지 않고 승인할 때 시각으로 판단한다.
- **PG 호출은 `PaymentGateway` 인터페이스 뒤에 둔다.** 구현은 `KakaoPayGateway`, `TossPaymentsGateway`이고 HTTP는 `RestClient`로 부른다(분석 서버 클라이언트와 같은 방식). 테스트는 가짜 구현을 끼운다.

## 설정
| 환경 변수 | 용도 | 비어 있으면 |
| --- | --- | --- |
| `KAKAOPAY_SECRET_KEY` | 카카오페이 개발용 Secret key(dev) | 카카오페이만 쓸 수 없음 |
| `KAKAOPAY_CID` | 가맹점 코드. 테스트는 `TC0ONETIME` | 카카오페이만 쓸 수 없음 |
| `TOSSPAYMENTS_CLIENT_KEY` | 토스 클라이언트 키(`test_ck_…`). 결제창을 여는 브라우저에 내려간다 | 토스만 쓸 수 없음 |
| `TOSSPAYMENTS_SECRET_KEY` | 토스 시크릿 키(`test_sk_…`) | 토스만 쓸 수 없음 |
| `PAYMENT_RETURN_BASE_URL` | 결제 뒤 돌아올 사이트 주소 | 기본값 |

값은 코드와 저장소에 두지 않는다. 배포 서버 `.env`에도 병합 전에 넣어야 한다. `.env.example`과 `compose.yaml`·`compose.prod.yaml`의 백엔드 환경 변수에 이름을 더한다.

## API

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| `POST` | `/api/v1/my/subscription/checkout/ready` | 결제 준비. 로그인 필요 |
| `POST` | `/api/v1/my/subscription/checkout/approve` | 결제 승인. 로그인 필요 |
| `GET` | `/api/v1/my/subscription/checkout` | (#70) 응답에 `providers`를 더한다 |
| `POST` | `/api/v1/my/subscription/checkout` | (#71) `CREDIT`만 받는다 |

### 결제 준비 (`POST …/ready`, 201)

| 본문 필드 | 규칙 |
| --- | --- |
| `planId` | 필수. 지금 파는 플랜의 id |
| `provider` | 필수. `KAKAO_PAY` 또는 `TOSS_PAY` |

| 응답 필드 | 의미 |
| --- | --- |
| `orderId` | 우리가 만든 주문번호(시도의 `order_id`) |
| `provider`, `amount` | 결제 대행사와 서버가 정한 현금 금액 |
| `orderName` | 결제창에 보일 이름(플랜 `tier`) |
| `redirectUrl`, `mobileRedirectUrl` | 카카오페이만. 이동할 결제창 주소 |
| `clientKey`, `customerKey` | 토스만. 브라우저에서 결제창을 여는 값. `customerKey`는 회원마다 정해진 무작위 값이고 이메일 같은 개인정보를 쓰지 않는다 |

### 결제 승인 (`POST …/approve`, 201)

| 본문 필드 | 규칙 |
| --- | --- |
| `orderId` | 필수. 준비에서 받은 주문번호 |
| `pgToken` | 카카오페이 승인 토큰(`pg_token`). 카카오페이면 필수 |
| `paymentKey`, `amount` | 토스가 돌려준 값. 토스면 필수. `amount`는 서버 값과 맞는지만 보고 승인에는 서버 값을 쓴다 |

응답은 #71의 결제 응답과 같다(`paymentId`, `method`, `amount`, `paidAt`, `period`, `payableCredits`). 결제 이력(`GET …/payments`)의 한 건에는 `provider`를 더한다(크레딧 결제는 null).

### 실패 응답

| 상황 | 상태 | 코드 |
| --- | --- | --- |
| 값이 없거나 잘못됨, `CASH` 직접 결제 | 400 | `INVALID_INPUT` |
| 토큰 없음 | 401 | `UNAUTHORIZED` |
| 운영자 | 403 | `FORBIDDEN` |
| 없는 플랜·없는 주문번호·남의 시도 | 404 | `NOT_FOUND` |
| 직전 결제 후 5초 안(준비) | 409 | `DUPLICATE_PAYMENT` |
| 이미 승인했거나 승인 중이거나 실패한 시도, 만료된 시도, 금액 불일치 | 409 | `PAYMENT_NOT_APPROVABLE` |
| PG가 승인을 거절함 | 502 | `PG_APPROVE_FAILED` |
| 키가 없는 PG | 503 | `PG_UNAVAILABLE` |

세 코드(`PAYMENT_NOT_APPROVABLE`, `PG_APPROVE_FAILED`, `PG_UNAVAILABLE`)는 `ErrorCode`에 더한다. 남의 시도는 있는지 알려 주지 않게 404로 답한다.

---

## 시나리오

#249-S1 카카오페이 결제 준비가 시도를 저장하고 결제창 주소를 준다 [테스트]
- Given 현금 10,000원 플랜, 일반 회원, 가짜 카카오페이 서버
- When  `POST …/ready` `provider=KAKAO_PAY`
- Then  201. `payment_attempts`에 `PENDING` 한 건(금액 10,000, `order_id` 유일)이 저장되고 결제창 주소 둘이 돌아온다
- Then  PG에 보낸 금액은 플랜의 `cashPrice`이고 결제 후 돌아올 주소는 서버 설정값에서 만든 것이다. 구독과 결제는 아직 없다

#249-S2 토스 결제 준비는 브라우저가 결제창을 열 값을 준다 [테스트]
- When  `POST …/ready` `provider=TOSS_PAY`
- Then  201. `PENDING` 한 건이 저장되고 `orderId`, `amount`, `orderName`, `clientKey`, `customerKey`가 돌아온다. 시크릿 키는 응답 어디에도 없다
- Then  같은 회원의 `customerKey`는 매번 같다. 다른 회원과는 다르다

#249-S3 결제 준비의 입력과 대상을 검사한다 [테스트]
- When  `planId`·`provider`가 없거나 모르는 값이다
- Then  400
- When  없는 플랜이거나 지금 파는 플랜이 아니다
- Then  404. 시도가 생기지 않는다
- When  운영자 토큰
- Then  403
- When  토큰이 없다
- Then  401

#249-S4 키가 없는 PG는 쓸 수 없다고 알린다 [테스트]
- Given 카카오페이 키가 비어 있다
- Then  `GET …/checkout`의 `providers`에 카카오페이가 없다(토스는 있다)
- When  `provider=KAKAO_PAY`로 준비한다
- Then  503 `PG_UNAVAILABLE`. 시도가 생기지 않는다
- Given 서버가 키 없이 뜬다
- Then  기동은 실패하지 않고 크레딧 결제는 그대로 된다

#249-S5 승인하면 구독과 결제가 만들어진다 [테스트]
- Given `PENDING` 시도 하나(카카오페이 또는 토스), 가짜 PG가 승인을 돌려준다
- When  `POST …/approve`
- Then  201. 결제 한 건(`CASH`, `provider`, `pg_transaction_id`, 서버 금액, `COMPLETED`)과 구독 한 건(`ACTIVE`)이 짝으로 저장되고 시도는 `APPROVED`가 된다
- Then  이용 기간은 #71과 같은 규칙이다(시작 = `max(지금, 가장 늦은 ACTIVE 끝)`, 끝 = 시작 + `periodDays`일). 지갑·크레딧 내역은 그대로다
- Given 이미 구독 중인 회원
- Then  새 기간이 기존 끝에서 이어 붙는다

#249-S6 승인할 수 없는 시도는 구독이 되지 않는다 [테스트]
- When  없는 `orderId`이거나 다른 회원의 시도다
- Then  404. PG를 부르지 않는다
- When  토스가 돌려준 `amount`가 시도의 금액과 다르다
- Then  409 `PAYMENT_NOT_APPROVABLE`. PG를 부르지 않고 구독이 생기지 않는다
- When  만든 지 30분이 지났다
- Then  409 `PAYMENT_NOT_APPROVABLE`
- When  카카오페이인데 `pgToken`이 없거나, 토스인데 `paymentKey`가 없다
- Then  400

#249-S7 PG가 승인을 거절하면 구독이 되지 않는다 [테스트]
- Given 가짜 PG가 승인을 거절한다
- When  `POST …/approve`
- Then  502 `PG_APPROVE_FAILED`. 결제·구독이 생기지 않고 시도는 `FAILED`가 된다
- When  같은 시도로 다시 승인한다
- Then  409 `PAYMENT_NOT_APPROVABLE`. 처음부터 다시 준비해야 한다

#249-S8 같은 시도를 두 번 승인해도 한 번만 된다 [테스트]
- Given 같은 시도의 승인 둘이 거의 동시에 온다
- Then  하나만 201이고 다른 하나는 409다. PG 승인 호출은 한 번이고 구독·결제는 한 건이다
- Given 이미 `APPROVED`인 시도를 다시 승인한다
- Then  409. 구독이 늘지 않는다

#249-S9 현금 직접 결제는 거절하고 크레딧 결제는 그대로다 [테스트]
- When  `POST …/checkout` `method=CASH`
- Then  400 `INVALID_INPUT`. 결제·구독이 생기지 않는다
- When  `method=CREDIT`
- Then  #71과 같다(201, 이벤트 먼저 차감, 내역 남김, 5초 더블클릭 거절 등)

#249-S10 결제 이력에 어느 PG로 결제했는지 남는다 [테스트]
- Given 카카오페이 한 건, 토스 한 건, 크레딧 한 건
- When  `GET …/payments`
- Then  최신순이고 각 건의 `provider`는 `KAKAO_PAY`, `TOSS_PAY`, null이다. 예전에 현금으로 직접 결제한 행(`provider` 없음)도 오류 없이 나온다

#249-S11 결제 준비도 5초 더블클릭을 거절한다 [테스트]
- Given 방금(5초 안) 결제한 회원
- When  `POST …/ready`
- Then  409 `DUPLICATE_PAYMENT`. 시도가 생기지 않는다
- When  마지막 결제가 5초보다 오래됐다
- Then  201

#249-S12 PG 승인 뒤 저장이 실패해도 돈이 오간 흔적을 알 수 있다 [테스트]
- Given 가짜 PG는 승인하는데 구독·결제 저장에서 예외가 난다
- Then  구독·결제는 저장되지 않고 시도는 `APPROVING`으로 남으며 오류 로그가 남는다. 응답은 500이다
- 자동 취소는 하지 않는다(범위 밖)

#249-S13 두 PG 테스트 결제창으로 끝까지 해 본다 [직접]
- Given 로컬 `docker compose`(`AUTH_MODE=backend`), 일반 회원, `.env`에 개발용 키
- Then  각 PG마다 확인한다
  1. 화면에서 현금 → 해당 PG를 골라 결제하면 PG 테스트 결제창이 열린다
  2. 결제창에서 승인하면 구독이 생기고 `/my/subscription?notice=paid`로 돌아온다
  3. DB의 `payments`에 `provider`·`pg_transaction_id`가 남고 `payment_attempts`는 `APPROVED`다
  4. 결제창을 닫거나 취소하면 구독이 생기지 않는다
  5. 승인 뒤 주소를 새로고침해도 구독이 늘지 않는다
- 카카오페이는 테스트 CID로 결제 준비(`ready`) 호출이 성공하는 것을 먼저 확인했다(2026-11-10, 사이트 도메인 `http://localhost:3005` 등록 필요). 승인(`approve`)과 토스는 구현 뒤에 확인한다

## 범위 밖
환불·결제 취소, 정기 결제(자동 갱신), 운영 키·실거래, 웹훅, PG 승인 뒤 저장 실패 때의 자동 취소, 만료된 시도 정리 배치.

## 작업 순서
1. 엔티티와 설정: `PaymentProvider`, `PaymentAttempt`, `Payment`의 `provider`·`pg_transaction_id`, 설정 클래스와 환경 변수, `ErrorCode` 세 개
2. `PaymentGateway`와 두 구현(`RestClient`), 가짜 구현
3. 서비스: 결제 준비, 세 토막 승인, 기존 `pay()`의 `CASH` 거절, `providers`
4. 컨트롤러와 응답 DTO, 결제 이력 `provider`
5. 테스트: 위 `[테스트]` 시나리오, 기존 `CASH` 직접 결제를 쓰던 #71·#204 테스트 정리
6. `[직접]` 확인(S13), 문서 정리

## 가정
- 카카오페이는 단건 결제 API(`https://open-api.kakaopay.com/online/v1/payment/ready`·`approve`, 헤더 `Authorization: SECRET_KEY {키}`)를 쓴다. 준비는 테스트 CID와 개발용 키로 호출이 성공했다(응답에 `tid`와 PC·모바일·앱 결제창 주소). 승인의 필수 값(`cid`, `tid`, `partner_order_id`, `partner_user_id`, `pg_token`)은 구현할 때 공식 문서로 다시 확인한다. 준비 응답의 `tms_result` 뜻은 확인하지 못했다.
- 토스는 결제 승인 API(`POST https://api.tosspayments.com/v1/payments/confirm`)를 `Basic base64(시크릿키:)` 인증으로 부른다. 결제창은 브라우저의 토스 SDK가 열고, 성공하면 `paymentKey`·`orderId`·`amount`가 성공 주소의 쿼리로 돌아온다. 토스페이 결제창의 정확한 SDK 호출 값과 테스트 키는 구현할 때 공식 문서로 확인한다(`test_ck_…`·`test_sk_…`로 시작해야 하고 `live_…`는 쓰지 않는다).
- 개발용 키와 테스트 CID는 짝이다. 한쪽만 운영 값으로 바꾸면 오류가 나므로 환경 변수를 따로 둔다.
- 결제 시도의 `order_id`는 PG에 중복 없이 넘길 수 있게 서버가 무작위로 만든다(회원 정보를 담지 않는다).
- 응답 시각에는 오프셋이 붙는다([server-time.md](../../server-time.md)).

## 참고
- 카카오 디벨로퍼스(developers.kakao.com)의 앱 키와 카카오페이 디벨로퍼스(developers.kakaopay.com)의 키는 다른 것이다. 결제는 카카오페이 디벨로퍼스의 애플리케이션 발급정보(Secret Key, Dev Secret Key)를 쓰고, 그 앱의 "플랫폼 → Web → 사이트도메인"에 결제 후 돌아올 주소의 도메인이 등록돼 있어야 한다. 등록하지 않으면 준비 호출이 400("등록된 도메인이 존재하지 않아 도메인 검증이 불가능")이다.
- 카카오페이 디벨로퍼스 애플리케이션 등록은 문서상 비즈니스 계정이 필요하다고 되어 있다.
- 테스트 서버(`compose.prod.yaml`)의 백엔드는 `SPRING_JPA_HIBERNATE_DDL_AUTO: update`라 새 테이블·컬럼이 배포 때 만들어진다. 기존 행이 있는 테이블에 컬럼을 더하면 null을 허용해야 한다. Flyway 도입은 별도 이슈(#162)다.
