# 백엔드 환불 중 결제 조회·정리

시나리오 제목 끝의 태그가 확인 방법이다. `[테스트]`만 이 문서 시나리오와 백엔드 테스트가 1:1이고, `[직접]`은 사람이 PG 테스트 환경에서 확인한다. 테스트에서 PG 서버는 가짜 구현으로 바꿔 끼운다.

이슈: [#281](https://github.com/likelion-backendschool-9th/test-moa/issues/281). 요구·시나리오는 `#281-S…`부터 센다. 환불의 세 토막과 상태는 [admin-payment-refund.md](admin-payment-refund.md)(#275), 멈춘 시도 조회는 [pg-approve-recovery.md](pg-approve-recovery.md)(#274), 도메인 결정은 [README.md](README.md).

## 한눈에
- 끝나면: PG가 취소했는데 우리 쪽 ③이 실패해 `REFUNDING`으로 남은 결제를 운영자가 조회하고, 정리할 수 있다.
- 선행: #275(환불), #274(멈춘 시도 조회).
- 이 이슈 범위 밖: 자동 복구(스케줄러), 운영자 화면(프론트), 부분 환불.

## 정한 것 (#281)
- **조회 기준은 `updatedAt`이다.** `Payment`에는 환불을 시작한 시각 컬럼이 없다. `startRefund()`가 `REFUNDING`으로 바꿀 때 `updatedAt`이 갱신되고 그 뒤 PG 취소 중에는 바뀌지 않으므로, `REFUNDING`이면서 `updatedAt`이 기준 시간보다 오래된 결제를 "멈춘 것"으로 본다. 새 컬럼은 더하지 않는다.
- **기준 시간은 기존 `payment.stuck-minutes`(기본 15분)를 같이 쓴다.** 결제 시도와 기준이 다를 이유가 아직 없다.
- **조회 API는 #274의 `stuck`과 같은 모양이다.** `GET /api/v1/admin/payments/stuck-refunds`가 오래 멈춘 `REFUNDING` 결제와 시간과 상관없이 모든 `REFUND_FAILED` 결제를 최신순으로 준다(#274의 `stuck`이 `NEEDS_REVIEW`를 같이 주는 것과 같다). 운영자 결제 목록 API가 없어서, 환불 때 502를 받은 운영자가 결제 id를 기억하지 못해도 카카오 -710처럼 PG에서는 취소됐는데 `REFUND_FAILED`로 남은 건을 찾을 수 있게 한다. 일반적인 PG 거절로 `REFUND_FAILED`가 된 건도 다시 환불하기 전까지는 같이 나온다. `/api/v1/admin/**`이라 ADMIN만 허용된다.
- **방금 시작한 환불 중은 정리하지 않는다.** PG 응답을 기다리는 시간은 최대 15초(`PaymentRestClients`)이고 기준 시간은 15분이라, 기준을 넘긴 `REFUNDING`은 PG 호출이 끝난 뒤라 환불 ③과 겹치지 않는다.
- **정리는 운영자가 PG 취소 여부를 확인한 결과를 넘기는 방식이다.** 지금 `PaymentGateway`에는 거래 조회가 없어 서버가 PG 상태를 직접 확인할 수 없다. 그래서 `POST /api/v1/admin/payments/{paymentId}/refund/resolve`에 `canceled`(PG에서 취소됨 여부)를 받는다.
  - `true`: ③만 실행한다(결제 `REFUNDED`, 구독 `CANCELLED`, 처리 운영자 기록).
  - `false`: 결제를 `REFUND_FAILED`로 돌려 다시 환불할 수 있게 한다. 이미 `REFUND_FAILED`면 바뀌는 것이 없고 200을 준다(이미 다시 환불할 수 있는 상태). 누가 정리했는지는 남기지 않는다(`canceled=true`는 `refunded_by`로 남는다). 기록할 곳이 필요하면 #276과 같은 방식으로 후속에서 더한다.
  - 대상은 기준 시간보다 오래 `REFUNDING`으로 남은 결제와 `REFUND_FAILED`인 PG 결제이다. 방금 시작해 PG를 부르는 중일 수 있는 `REFUNDING`은 409로 막는다(환불 ③과 겹쳐 두 번 처리되지 않게). 이 호출은 PG를 부르지 않는다.
- **카카오 `REFUND_FAILED` 건도 같은 동작으로 정리한다.** PG에서는 취소됐는데 `REFUND_FAILED`로 남은 건(카카오 -710)은 환불 API로 정리되지 않으므로 `canceled=true`로 ③을 실행한다.
- **③은 환불 서비스와 같은 코드를 쓴다.** 회원 행 잠금 → 결제 `REFUNDED` → 구독 `CANCELLED` 순서와 `refundedBy` 기록을 중복해 만들지 않는다.

## API

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| `GET` | `/api/v1/admin/payments/stuck-refunds` | 오래 멈춘 `REFUNDING` 결제 목록. 운영자만 |
| `POST` | `/api/v1/admin/payments/{paymentId}/refund/resolve` | 멈춘 환불을 정리. 본문 `{ "canceled": true\|false }`. 운영자만 |

목록 항목: `paymentId`, `provider`, `amount`, `status`, `userEmail`, `pgTransactionId`, `updatedAt`(오프셋 포함, [server-time.md](../../server-time.md)). 이메일은 회원을 찾는 용도이고 PG 거래 식별자는 PG 가맹점 화면에서 취소 여부를 확인할 때 쓴다(#274의 `stuck`과 같다). 정리 응답은 환불 응답과 같고(`paymentId`, `status`, `refundedAt`), `canceled=false`면 환불되지 않았으므로 `refundedAt`이 null이다. 대상이 아닌 결제는 409 `PAYMENT_NOT_REFUNDABLE`, 없는 결제는 404.

## 시나리오

#281-S1 오래 멈춘 환불 중 결제와 환불 실패 결제만 조회된다 [테스트]
- Given `updatedAt`이 기준 시간보다 오래된 `REFUNDING` 결제, 방금 `REFUND_FAILED`가 된 결제, 방금 `REFUNDING`이 된 결제, `COMPLETED`·`REFUNDED` 결제
- When  운영자가 `GET /api/v1/admin/payments/stuck-refunds`
- Then  오래된 `REFUNDING` 결제와 `REFUND_FAILED` 결제만 최신순으로 나온다

#281-S2 PG에서 취소됐다고 정리하면 결제와 구독이 환불 상태가 된다 [테스트]
- Given 멈춘 `REFUNDING` 결제와 `ACTIVE` 구독
- When  `canceled=true`로 정리
- Then  200이고 결제 `REFUNDED`, 구독 `CANCELLED`, `refunded_by`에 로그인한 운영자가 남는다. PG를 부르지 않는다

#281-S3 PG에서 취소되지 않았다고 정리하면 다시 환불할 수 있게 된다 [테스트]
- Given 멈춘 `REFUNDING` 결제
- When  `canceled=false`로 정리
- Then  결제는 `REFUND_FAILED`, 구독은 `ACTIVE`이고 이어서 환불 API가 정상 처리된다
- 이미 `REFUND_FAILED`인 결제에 `canceled=false`를 보내면 바뀌는 것 없이 200이다

#281-S4 PG에서 취소됐는데 `REFUND_FAILED`로 남은 결제도 정리된다 [테스트]
- Given `REFUND_FAILED` 결제(조회에도 나온다)
- When  `canceled=true`로 정리
- Then  결제 `REFUNDED`, 구독 `CANCELLED`

#281-S5 정리할 수 없는 결제는 거절한다 [테스트]
- When  `COMPLETED`·`REFUNDED` 결제, 방금 시작한 `REFUNDING` 결제, 크레딧 결제를 정리한다
- Then  409 `PAYMENT_NOT_REFUNDABLE`(크레딧 결제는 400 `INVALID_INPUT`). 방금 `REFUNDING`이 된 결제도 409다
- When  없는 결제 id
- Then  404

#281-S6 같은 결제를 동시에 정리해도 한쪽만 처리된다 [테스트]
- Given 멈춘 `REFUNDING` 결제, 동시에 정리 요청 둘
- Then  한쪽은 200, 다른 쪽은 409이고 결제는 한 번만 바뀐다

#281-S7 운영자가 아니면 조회·정리할 수 없다 [테스트]
- When  일반 회원 토큰 / 토큰 없음
- Then  403 / 401

#281-S8 환불을 일부러 ③에서 실패시켜 만든 건을 조회하고 정리한다 [직접]
- Given 로컬 `docker compose`, 환불 직전에 `payments` 갱신이 실패하도록 일시 제약, PG 테스트 결제
- Then  환불 API가 500이고 PG 쪽은 취소, 결제는 `REFUNDING`으로 남는다. 기준 시간 뒤 조회에 나오고 `canceled=true`로 정리하면 `REFUNDED`가 된다. 조작한 제약은 되돌린다

## 범위 밖
자동 복구(스케줄러), 운영자 화면(프론트), PG 거래 조회로 상태를 서버가 직접 확인하는 것, 부분 환불.

## 작업 순서
1. `PaymentRepository`에 멈춘 `REFUNDING` 조회, 응답 DTO, 운영자 컨트롤러·서비스(조회)
2. 환불 서비스의 ③을 정리 동작과 공유하도록 뽑고, 정리 API와 `REFUND_FAILED` 되돌리기
3. 테스트: 위 `[테스트]` 시나리오(동시성 포함)
4. `[직접]` 확인(S8), 문서·README 표 정리

## 가정
- 정리 동작을 운영자가 호출한다는 전제로 PG 거래 조회는 만들지 않는다. 운영자는 PG 가맹점 화면에서 취소 여부를 확인한다.
- `REFUNDING`이 `updatedAt` 말고 다른 이유로 갱신되는 경로는 없다(환불 서비스만 이 상태를 만든다).
