# 백엔드 PG 승인 뒤 저장 실패 복구

시나리오 제목 끝의 태그가 확인 방법이다. `[테스트]`만 이 문서 시나리오와 백엔드 테스트가 1:1이고, `[직접]`은 사람이 PG 테스트 환경에서 확인한다. 테스트에서 PG 서버는 가짜 구현으로 바꿔 끼운다.

이슈: [#274](https://github.com/likelion-backendschool-9th/test-moa/issues/274). 요구·시나리오는 `#274-S…`부터 센다. 결제 승인의 세 토막과 시도 상태는 [pg-checkout.md](pg-checkout.md)(#249), 도메인 결정은 [README.md](README.md).

## 한눈에
- 끝나면: PG가 승인한 뒤 우리 쪽 결제·구독 저장이 실패해도 그 결제는 PG에서 취소되고 구독은 켜지지 않는다. 취소까지 실패한 건은 `NEEDS_REVIEW`로 남아 운영자가 조회할 수 있다.
- 선행: #249(PG 연동), #71(결제 실행), #204(회원 행 잠금).
- 이 이슈 범위 밖: 환불(#275), 처리자 기록(#276), 운영자 화면, 멈춘 시도를 주기적으로 다시 처리하는 스케줄러.

## 정한 것 (#274)
- **저장 실패 보상은 승인 ③의 `catch`에서 한다.** PG를 부르는 동안 회원 행을 잡지 않는 #249의 세 토막 설계는 바꾸지 않는다. 취소 호출도 잠금 밖에서 한다.
- **시도 상태를 둘 더한다.** `CANCELED`(PG 취소까지 마침)와 `NEEDS_REVIEW`(취소도 실패해 사람이 봐야 함). 이미 `APPROVING`에 멈춘 옛 시도는 바꾸지 않고 조회 대상에 포함한다. 테스트 서버는 `ddl-auto: update`라 새 enum 값은 컬럼 문자열로 들어간다.
- **취소 호출은 `PaymentGateway`에 `cancel`을 더해 한다.** 카카오페이는 `tid`, 토스는 `paymentKey`(`Approved.pgTransactionId`)로 전액 취소한다. 구현은 `KakaoPayGateway`, `TossPaymentsGateway`이고 가짜 구현도 같이 고친다. 이 호출은 환불(#275)도 쓴다.
- **취소가 실패해도 예외를 삼키지 않는다.** 시도를 `NEEDS_REVIEW`로 바꾸고 오류 로그에 시도 id·주문번호·provider를 남긴다. 사용자에게는 결제 실패 오류(500)를 그대로 돌려준다.
- **멈춘 시도 조회 API를 운영자에게 준다.** `GET /api/v1/admin/payment-attempts/stuck`가 기준 시간보다 오래된 `APPROVING`과 모든 `NEEDS_REVIEW`를 최신순으로 돌려준다. 기준 시간은 설정 `payment.stuck-minutes`(기본 15분, 시도 유효 시간 10분보다 길게). `/api/v1/admin/**`은 SecurityConfig가 ADMIN만 허용한다.
- **보상 중 중복 승인은 막힌다.** 시도가 `APPROVING`인 동안 같은 시도의 둘째 승인은 이미 막혀 있다(#249). 보상이 끝나 `CANCELED`가 되면 그 시도는 다시 승인할 수 없다.

(고침 #274: #249-S12의 "자동 취소는 하지 않는다"를 바꾼다. 저장 실패 때 PG 취소를 시도하고 결과를 시도 상태로 남긴다.)

## API

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| `GET` | `/api/v1/admin/payment-attempts/stuck` | 오래 멈춘 `APPROVING`·`NEEDS_REVIEW` 시도 목록. 운영자만 |

응답 항목: `attemptId`, `orderId`, `provider`, `amount`, `status`, `userEmail`(운영자가 회원을 찾는 용도), `createdAt`, `updatedAt`(오프셋 포함, [server-time.md](../../server-time.md)). 목록은 짧아서 페이지를 나누지 않는다.

## 시나리오

#274-S1 승인 뒤 저장이 실패하면 PG 취소를 부르고 구독은 켜지지 않는다 [테스트]
- Given `PENDING` 시도 하나, 가짜 PG가 승인을 돌려주고 결제·구독 저장에서 예외가 난다
- When  `POST /api/v1/my/subscription/checkout/approve`
- Then  500이고, 가짜 PG의 취소가 그 거래 식별자로 한 번 불렸다
- Then  시도는 `CANCELED`이고 결제·구독 행도 크레딧 장부 변화도 없다

#274-S2 취소도 실패하면 `NEEDS_REVIEW`로 남고 로그가 남는다 [테스트]
- Given 승인 성공, 저장 실패, 가짜 PG의 취소도 실패
- Then  500이고 시도는 `NEEDS_REVIEW`다
- Then  오류 로그에 시도 id·주문번호·provider가 남는다

#274-S3 정상 결제는 바뀌지 않는다 [테스트]
- Given 승인과 저장이 모두 성공한다
- Then  결제·구독이 만들어지고 시도는 `APPROVED`이며 취소는 불리지 않는다. 기존 `PgPaymentTest`의 #249 시나리오가 그대로 통과한다

#274-S4 PG가 승인을 거절한 시도는 취소하지 않는다 [테스트]
- Given 가짜 PG가 승인을 거절한다
- Then  시도는 `FAILED`이고 취소는 불리지 않는다(#249-S7)

#274-S5 `CANCELED`가 된 시도는 다시 승인할 수 없다 [테스트]
- Given 보상으로 `CANCELED`가 된 시도
- When  같은 `orderId`로 다시 승인한다
- Then  409 `PAYMENT_NOT_APPROVABLE`이고 PG를 부르지 않는다

#274-S6 운영자가 오래 멈춘 시도만 조회한다 [테스트]
- Given 기준 시간보다 오래된 `APPROVING` 시도, `NEEDS_REVIEW` 시도, 최근 `APPROVING` 시도, `APPROVED` 시도
- When  운영자가 `GET /api/v1/admin/payment-attempts/stuck`
- Then  앞의 둘만 최신순으로 나오고 최근 `APPROVING`과 `APPROVED`는 나오지 않는다
- When  일반 회원 토큰
- Then  403. 토큰이 없으면 401이다

#274-S7 카카오페이·토스 취소 요청이 각 PG 규격으로 나간다 [테스트]
- Given 각 PG의 HTTP 가짜 서버
- Then  카카오페이는 `tid`와 취소 금액을, 토스는 `paymentKey`와 취소 사유를 보내고, 각 헤더(`Authorization`)가 맞다
- When  PG가 취소를 거절하거나 연결이 안 된다
- Then  취소 호출이 오류로 끝나 보상 쪽이 `NEEDS_REVIEW`로 처리한다

#274-S8 PG 테스트 환경에서 저장 실패 때 실제로 취소된다 [직접]
- Given 로컬 `docker compose`(`AUTH_MODE=backend`), 개발용 키, 결제 저장이 실패하도록 일시적으로 조작한 서버(예: DB 제약 위반을 만든 테스트 데이터)
- Then  각 PG에서 결제창 승인 뒤 오류 응답이 오고, PG 테스트 결제 내역이 취소로 보이며, `payment_attempts`가 `CANCELED`이고 구독이 없다
- 조작을 되돌린 뒤 정상 결제가 그대로 되는 것도 확인한다

## 범위 밖
환불(#275), 운영자 처리자 기록(#276), 운영자 화면, 멈춘 시도를 주기적으로 다시 처리하는 스케줄러, 부분 취소.

## 작업 순서
1. `PaymentAttempt.Status`에 `CANCELED`·`NEEDS_REVIEW`와 상태 전이 메서드, 설정 `payment.stuck-minutes`
2. `PaymentGateway.cancel`과 두 구현, 가짜 구현
3. `PgPaymentServiceImpl` 승인 ③ 실패 보상
4. 멈춘 시도 조회 서비스·컨트롤러·응답 DTO
5. 테스트: 위 `[테스트]` 시나리오, `PgPaymentTest`의 #249-S12를 이 이슈의 동작에 맞게 고침
6. `[직접]` 확인(S8), 문서 정리

## 가정
- 카카오페이 취소는 `POST https://open-api.kakaopay.com/online/v1/payment/cancel`(`cid`, `tid`, `cancel_amount`, `cancel_tax_free_amount`)이고, 토스 취소는 `POST https://api.tosspayments.com/v1/payments/{paymentKey}/cancel`(`cancelReason`)이다. 두 API의 필수 값은 구현할 때 공식 문서로 다시 확인한다.
- 승인 직후 같은 거래의 전액 취소를 두 PG의 테스트 환경이 지원한다. 지원하지 않으면 S8의 확인 방법을 고친다.
- 보상 취소는 한 번만 시도한다. 일시 오류 재시도는 하지 않고 `NEEDS_REVIEW`로 남긴다(운영자가 조회해 처리).

## 참고
- `PaymentAttempt`의 상태 값은 문자열로 저장한다. 테스트 서버(`compose.prod.yaml`)는 `ddl-auto: update`라 enum 값 추가에 SQL이 필요 없다. Flyway 도입은 별도 이슈(#162)다.
