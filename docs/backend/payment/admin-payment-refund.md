# 백엔드 운영자 결제 환불

시나리오 제목 끝의 태그가 확인 방법이다. `[테스트]`만 이 문서 시나리오와 백엔드 테스트가 1:1이고, `[직접]`은 사람이 PG 테스트 환경에서 확인한다. 테스트에서 PG 서버는 가짜 구현으로 바꿔 끼운다.

이슈: [#275](https://github.com/likelion-backendschool-9th/test-moa/issues/275). 요구·시나리오는 `#275-S…`부터 센다. PG 취소 호출은 [pg-approve-recovery.md](pg-approve-recovery.md)(#274)가 만든다. 결제 실행 규칙은 [subscription-payment.md](subscription-payment.md)(#71), 운영자 구독 해제와의 잠금 규칙은 [admin-subscription.md](admin-subscription.md)(#204), 도메인 결정은 [README.md](README.md).

## 한눈에
- 끝나면: 운영자가 PG 현금 결제 하나를 환불하면 PG에서 취소되고, 결제는 `REFUNDED`, 그 결제로 생긴 구독은 해제된다. 같은 요청을 두 번 보내도 한 번만 처리된다.
- 선행: #274(PG 취소 호출), #249(PG 연동), #204(회원 행 잠금).
- 이 이슈 범위 밖: 부분 환불, 크레딧 결제의 환불, 운영자 환불 화면(프론트), 회원의 환불 신청, 환불 사유 기록(#276에서 처리자와 함께 다룬다).

## 정한 것 (#275)
- **환불 대상은 PG 현금 결제만이다.** `provider`가 있는 `CASH` 결제다. 크레딧 결제(`provider` 없음)와 PG 연동 전의 현금 결제는 400 `INVALID_INPUT`이다(문구: "카카오페이·토스페이로 결제한 건만 환불할 수 있어요").
- **환불은 전액이다.** 결제 한 건 = 구독 한 건([entities.md](entities.md), 구독 1 : 결제 1)이라 환불하면 그 구독을 해제한다. 같은 회원의 다른 구독은 그대로 둔다.
- **크레딧은 건드리지 않는다.** PG 현금 결제는 크레딧을 쓰지 않으므로 지갑·장부는 바뀌지 않는다.
- **상태를 둘 더한다.** `Payment.Status`에 `REFUNDING`(환불 진행 중)과 `REFUND_FAILED`(PG 취소가 거절돼 되돌림)를 더한다. 기존 `REFUNDED` 값을 처음 쓴다. `ddl-auto: update`는 기존 허용 값 제약(`payments_status_check`, 지금은 `COMPLETED`·`REFUNDED`뿐)을 고치지 않으므로 배포 전에 아래 SQL을 테스트 서버와 로컬에서 한 번 실행한다(#274의 `payment_attempts_status_check`와 같은 경우, [pg-approve-recovery.md](pg-approve-recovery.md)).

```sql
alter table payments drop constraint if exists payments_status_check;
alter table payments add constraint payments_status_check
  check (status in ('COMPLETED','REFUNDING','REFUNDED','REFUND_FAILED'));
```
- **승인과 같이 세 토막으로 나눈다.** ① 회원 행을 잠근 안에서 결제를 `COMPLETED`인지 확인하고 `REFUNDING`으로 바꾼 뒤 커밋 ② 잠금 밖에서 PG 취소(#274의 `cancel`) ③ 회원 행을 다시 잠그고 결제를 `REFUNDED`로, 그 구독을 `CANCELLED`로 바꿈. 잠금 순서는 기존 규칙(회원 행 → 지갑 행)이며, 구독을 건드리므로 운영자 구독 해제와 같은 회원 행 잠금을 쓴다(#204).
- **PG가 취소를 거절하면 결제·구독은 그대로다.** 결제를 `REFUND_FAILED`로 두고 오류 응답(502 `PG_CANCEL_FAILED`)을 준다. 운영자가 다시 환불을 시도할 수 있다(`REFUND_FAILED`는 `COMPLETED`처럼 환불 대상이다).
- **PG가 취소했는데 ③이 실패하면** 결제는 `REFUNDING`으로 남고 오류 로그를 남긴다(#274와 같은 방식, 자동 복구는 범위 밖). 이렇게 남은 결제를 운영자가 찾는 조회는 이 이슈에 없고 후속 이슈 [#281](https://github.com/likelion-backendschool-9th/test-moa/issues/281)로 남긴다(#274의 멈춘 결제 시도 조회와 같은 종류).
- **구독 해제는 `CANCELLED`로 한다.** [README.md](README.md)에 적은 "환불 취소와 뜻이 겹친다"는 이 이슈에서 실제로 쓰이는 뜻이다. 새 구독 상태 값은 더하지 않는다.
- **환불 뒤 다시 결제할 수 있다.** 5초 더블클릭 검사는 마지막 결제 시각(`paidAt`)을 보므로 환불 처리와 상관없이 그대로다.

## API

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| `POST` | `/api/v1/admin/payments/{paymentId}/refund` | 결제 환불. 운영자만 |

응답(200): `paymentId`, `status`(`REFUNDED`), `refundedAt`(오프셋 포함, [server-time.md](../../server-time.md)). 이미 `REFUNDED`거나 `REFUNDING`이면 409 `PAYMENT_NOT_REFUNDABLE`, 없는 결제는 404.

## 시나리오

#275-S1 운영자가 PG 결제를 환불하면 결제는 REFUNDED, 구독은 해제된다 [테스트]
- Given 카카오페이로 결제한 `COMPLETED` 결제와 그 `ACTIVE` 구독, 가짜 PG
- When  운영자가 `POST /api/v1/admin/payments/{id}/refund`
- Then  200이고 가짜 PG의 취소가 그 거래 식별자로 한 번 불렸다
- Then  결제는 `REFUNDED`, 구독은 `CANCELLED`이고 회원의 구독 상태가 구독 중이 아니다. 지갑·장부는 그대로다
- 토스 결제도 같다

#275-S2 이미 환불한 결제를 다시 환불하면 거절한다 [테스트]
- Given `REFUNDED` 결제
- When  환불 요청
- Then  409 `PAYMENT_NOT_REFUNDABLE`이고 PG를 부르지 않는다

#275-S3 같은 결제를 동시에 두 번 환불해도 한쪽만 처리된다 [테스트]
- Given `COMPLETED` 결제, 동시에 환불 요청 둘
- Then  한쪽은 200, 다른 쪽은 409이고 PG 취소는 한 번만 불린다. 결제는 `REFUNDED`로 한 번만 바뀐다

#275-S4 PG 취소가 거절되면 결제와 구독은 그대로다 [테스트]
- Given 가짜 PG가 취소를 거절한다
- When  환불 요청
- Then  502 `PG_CANCEL_FAILED`이고 결제는 `REFUND_FAILED`, 구독은 `ACTIVE` 그대로다
- When  PG가 정상으로 돌아온 뒤 다시 환불한다
- Then  200이고 `REFUNDED`가 된다

#275-S5 환불할 수 없는 결제는 거절한다 [테스트]
- When  크레딧 결제, PG 연동 전의 현금 결제(`provider` 없음)
- Then  400 `INVALID_INPUT`이고 PG를 부르지 않는다
- When  없는 결제 id
- Then  404

#275-S6 운영자가 아니면 환불할 수 없다 [테스트]
- When  일반 회원 토큰
- Then  403
- When  토큰이 없다
- Then  401

#275-S7 같은 회원의 다른 구독은 환불로 해제되지 않는다 [테스트]
- Given 같은 회원의 이어 붙은 두 결제(구독 두 건)
- When  앞의 결제를 환불한다
- Then  그 구독만 `CANCELLED`이고 다른 구독은 `ACTIVE`로 남는다

#275-S8 환불 중에 같은 회원이 결제하거나 운영자가 구독을 해제해도 순서가 지켜진다 [테스트]
- Given 환불 처리 중(회원 행을 잠근 구간)인 회원
- When  같은 회원의 결제 또는 운영자 구독 해제가 동시에 온다
- Then  모두 회원 행 잠금으로 한 줄로 처리되어 교착이 없고, 구독 상태가 결제·환불의 결과와 어긋나지 않는다

#275-S9 환불 뒤 다시 결제하면 정상으로 구독이 된다 [테스트]
- Given 환불을 마친 회원
- When  5초가 지난 뒤 PG 결제(준비 → 승인)
- Then  새 결제·구독이 만들어진다

#275-S10 PG 테스트 환경에서 결제 뒤 환불이 실제로 된다 [직접]
- Given 로컬 `docker compose`, 개발용 키, 각 PG로 결제한 구독, 운영자 토큰
- Then  환불 API를 부르면 PG 테스트 결제 내역이 취소로 바뀌고 `payments`가 `REFUNDED`, 구독이 `CANCELLED`이며 `/my/subscription`에 구독 중이 아니라고 보인다
- 결과(2026-11-21, 로컬 `docker compose`, 개발용 키): 카카오페이 결제와 토스 결제를 각각 환불 API로 부르니 둘 다 200 `REFUNDED`였고 구독은 `CANCELLED`, 지갑·장부는 바뀌지 않았다. 환불 API는 PG 응답이 취소 상태(카카오 `CANCEL_PAYMENT`, 토스 `CANCELED`)일 때만 성공하므로 PG 쪽 취소도 확인된다. 같은 결제를 다시 부르면 409 `PAYMENT_NOT_REFUNDABLE`이었다. 이미 PG에서 취소된 옛 카카오 결제를 환불하면 502 `PG_CANCEL_FAILED`가 나오고 결제는 `REFUND_FAILED`, 구독은 `ACTIVE`로 남았다. 테스트 회원에게 다른 활성 구독이 남아 있어 `/my/subscription` 화면은 보지 못했다.

#275-S11 회원의 결제 내역에 환불한 결제가 표시된다 [테스트: tests/unit/subscription-pg.test.ts #275-S11]
- Given 환불해 `REFUNDED`가 되었거나 `REFUNDING`인 결제가 있는 회원
- Then  구독 화면의 결제 내역 줄에 "환불됨"·"환불 중"이 붙고 금액에 취소선이 그어진다. 그 줄이 여는 결제 내용 화면에는 구독 혜택 안내 대신 "환불된 결제예요."("환불을 처리하고 있어요.")와 "상태" 줄이 보인다. `REFUND_FAILED`와 상태가 없는 옛 응답은 정상 결제로 보인다
- 표시는 프론트 화면이며 서버는 이미 결제 이력 응답에 `status`를 준다. 화면은 [subscription.md](../../frontend/payment/subscription.md)에 적었다

## 범위 밖
부분 환불, 크레딧 결제의 환불, 운영자 환불 화면(프론트), 회원의 환불 신청, 환불 수수료·정산.

## 작업 순서
1. `Payment.Status`에 `REFUNDING`·`REFUND_FAILED`와 상태 전이 메서드(`startRefund`, `refund`, `failRefund`), `ErrorCode` 둘(`PAYMENT_NOT_REFUNDABLE`, `PG_CANCEL_FAILED`)
2. 환불 서비스(세 토막)와 운영자 컨트롤러, 응답 DTO
3. 테스트: 위 `[테스트]` 시나리오(동시성 포함)
4. `[직접]` 확인(S10), 문서·README 표 정리

## 가정
- #274의 `PaymentGateway.cancel`을 그대로 쓴다. 승인 뒤 시간이 지난 결제의 전액 취소를 두 PG의 테스트 환경이 지원하는지는 구현 때 확인한다.
- 이미 구독 기간 일부를 쓴 결제도 전액 환불한다. 사용 일수에 따른 차감은 하지 않는다(범위 밖).

## 참고
- 운영자 구독 해제(#204)는 결제와 크레딧을 건드리지 않는 시연용이다. 환불은 결제와 구독을 함께 되돌리는 별개의 기능이다.
