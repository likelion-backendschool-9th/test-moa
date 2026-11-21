# 백엔드 운영자 처리 기록

시나리오 제목 끝의 태그가 확인 방법이다. `[테스트]`만 이 문서 시나리오와 백엔드 테스트가 1:1이고, `[직접]`은 사람이 API·화면으로 확인한다.

이슈: [#276](https://github.com/likelion-backendschool-9th/test-moa/issues/276). 요구·시나리오는 `#276-S…`부터 센다. 운영자 구독 부여·해제는 [admin-subscription.md](admin-subscription.md)(#204), 출금 처리는 [admin-cashout.md](admin-cashout.md)(#68), 플랜·혜택 수정은 [subscription.md](subscription.md)(#69)와 [free-plan.md](free-plan.md)(#203), 환불은 [admin-payment-refund.md](admin-payment-refund.md)(#275), 도메인 결정은 [README.md](README.md).

## 한눈에
- 끝나면: 운영자가 한 구독 부여·해제, 출금 지급·반려, 플랜·혜택 수정, 환불에 처리한 운영자(회원 id)가 남는다. 구독 부여·해제는 사유도 남는다.
- 선행: #275(환불에도 처리자를 남긴다), #204, #68, #69, #203.
- 이 이슈 범위 밖: 감사 로그 조회 화면, 별도 감사 테이블, 일반 회원 행위의 기록, 기존 데이터의 소급 채움, 프론트 변경.

## 정한 것 (#276)
- **별도 테이블을 만들지 않고 처리 행에 컬럼을 더한다.** DB는 ERD보다 복잡하게 만들지 않는다. 모두 null을 허용한다(기존 행이 있고, 결제로 생긴 구독은 운영자가 없다).

| 테이블 | 더하는 컬럼 | 채우는 때 |
| --- | --- | --- |
| `subscriptions` | `granted_by`, `grant_reason` | 운영자가 부여할 때 |
| `subscriptions` | `revoked_by`, `revoke_reason` | 운영자가 해제할 때(끝나지 않은 기간마다) |
| `cashouts` | `processed_by` | 지급·반려할 때 |
| `payments` | `refunded_by` | 환불할 때(#275) |
| `plans`, `free_plans` | `updated_by` | 새 버전 행을 만들거나 무료 플랜을 저장할 때 |

- **처리자는 서버가 로그인 정보에서 정한다.** 요청 본문으로 받지 않는다(다른 운영자 이름을 쓰는 위조를 막는다). 컬럼에는 운영자의 회원 id를 저장하고 연관 관계는 걸지 않는 `Long`이다(탈퇴해도 기록이 남게 하고 FK 부담을 줄인다).
- **구독 부여·해제는 시연용이라 사유를 받아도 안 받아도 된다.** 구독 부여 요청에 `reason`(선택, 200자 이하)을 더한다. 없거나 비어 있으면 "시연용 부여"를 기록하고, 200자를 넘으면 400이다. 해제는 사유를 받지 않고 늘 "시연용 해제"를 남긴다. 출금 반려는 기존 `rejectReason`·`rejectMemo`가 있어 사유 컬럼을 더하지 않는다.
- **기존 데이터는 소급하지 않는다.** 이미 있는 행의 처리자는 null이고 조회·동작은 그대로다.
- **응답은 바꾸지 않는다.** 처리자와 사유는 DB에만 남기고 운영자 화면 응답에는 더하지 않는다(조회 화면은 범위 밖).
- **새 컬럼은 SQL 없이 만들어진다.** 모두 null을 허용하는 컬럼이라 `ddl-auto: update`가 테스트 서버·로컬에 그대로 추가한다(상태 허용 값 제약을 고쳐야 했던 #274·#275와 다르다). 운영 DB에 반영하는 시점은 사용자가 정한다. Flyway 도입은 별도 이슈(#162)다.
- **엔티티 메서드가 처리자를 받는다.** 운영자 해제용으로 `Subscription.revoke(adminId, reason)`을 새로 만들고, `Cashout.pay(...)`·`reject(...)`, `Payment.refund(adminId)`, 플랜 등록·무료 플랜 저장이 운영자 id를 인자로 받아 컬럼을 채운다. `Subscription.cancel()`은 환불용으로 그대로 둔다(환불은 `refunded_by`로 남긴다). setter는 두지 않는다.

## 시나리오

#276-S1 구독 부여 때 처리 운영자와 사유가 남는다 [테스트]
- Given 운영자 토큰, 일반 회원
- When  `POST /api/v1/admin/subscriptions`에 `reason: "시연 준비"`
- Then  새 구독의 `granted_by`가 그 운영자 id이고 `grant_reason`이 "시연 준비"다
- When  `reason`을 보내지 않거나 빈 문자열이다
- Then  `grant_reason`이 "시연용 부여"다
- When  `reason`이 201자다
- Then  400이고 구독이 생기지 않는다

#276-S2 구독 해제 때도 같다 [테스트]
- Given 끝나지 않은 구독이 두 건 이어진 회원
- When  `DELETE /api/v1/admin/subscriptions?email=…`(사유 없음)
- Then  취소된 모든 구독의 `revoked_by`가 그 운영자 id이고 `revoke_reason`이 "시연용 해제"다
- 해제할 구독이 없으면 아무 행도 바뀌지 않는다

#276-S3 출금 지급·반려 때 처리 운영자가 남는다 [테스트]
- When  운영자가 출금 요청을 `PAID`로, 다른 요청을 `REJECTED`로 처리한다
- Then  두 `cashouts` 행의 `processed_by`가 그 운영자 id이고 `processed_at`도 채워진다
- 이미 처리한 요청을 다시 처리하면 기존 규칙대로 거절하고 `processed_by`를 바꾸지 않는다

#276-S4 플랜·혜택 수정 때 수정한 운영자가 남는다 [테스트]
- When  운영자가 구독 플랜 혜택을 고쳐 새 버전을 등록한다
- Then  새 `plans` 행의 `updated_by`가 그 운영자 id이고 이전 버전 행은 바뀌지 않는다
- When  운영자가 무료 플랜을 저장한다
- Then  `free_plans` 행의 `updated_by`가 그 운영자 id로 바뀐다

#276-S5 환불 때 환불한 운영자가 남는다 [테스트]
- When  운영자가 결제를 환불한다(#275)
- Then  그 `payments` 행의 `refunded_by`가 그 운영자 id다

#276-S6 요청에 운영자 id를 넣어도 무시한다 [테스트]
- When  요청 본문에 `grantedBy`·`processedBy` 같은 값을 넣어 보낸다
- Then  무시되고 로그인한 운영자 id가 남는다

#276-S7 처리자가 비어 있는 행도 조회와 동작이 그대로다 [테스트]
- Given 처리자 컬럼이 null인 옛 구독·출금·결제·플랜 행, 결제로 만든 구독
- Then  구독 상태 조회, 출금 목록, 결제 이력, 구독 소개가 오류 없이 이전과 같은 값을 준다

#276-S8 운영자 화면의 구독 부여·해제가 그대로 동작한다 [직접]
- Given 로컬 `docker compose`(`AUTH_MODE=backend`), 운영자 로그인
- When  `/admin/plans?tab=subscriptions`에서 구독을 주고 뺀다(사유 입력칸이 없다)
- Then  화면은 이전과 똑같이 동작하고, DB의 `subscriptions`에 처리 운영자와 "시연용 부여"·"시연용 해제"가 남는다
- 결과(2026-11-21, 로컬 `docker compose`, 운영자 화면에서 구독을 주고 뺌): 화면은 이전과 같이 동작했고 부여한 구독에 `granted_by`(운영자 id)와 "시연용 부여"가, 해제로 취소된 끝나지 않은 구독 모두에 `revoked_by`와 "시연용 해제"가 남았다. 해제는 끝나지 않은 구독을 모두 취소하므로 결제로 생긴 구독도 같이 취소되어 해제 기록이 붙는다(#204 규칙 그대로). 사유 입력칸은 화면에 없다.

## 범위 밖
감사 로그 조회 화면, 별도 감사 테이블, 일반 회원 행위의 기록, 기존 데이터의 소급 채움, 프론트 변경(사유 입력칸 포함).

## 작업 순서
1. 컬럼 추가와 엔티티 메서드가 처리자(와 사유)를 받게 고침
2. 운영자 컨트롤러·서비스에서 로그인한 운영자 id를 넘김. 구독 부여 요청에 `reason` 추가
3. 테스트: 위 `[테스트]` 시나리오, 기존 운영자 테스트의 호출 시그니처 정리
4. `[직접]` 확인(S8), 문서·README 표 정리

## 가정
- 컨트롤러에서 로그인한 회원 id를 얻는 방식이 이미 있다(`@AuthenticationPrincipal`을 쓰는지는 구현 때 확인한다). 없으면 보안 설정의 인증 객체에서 읽는다.
- 운영자 계정은 여러 명이 될 수 있고, 이 이슈는 그때 누가 했는지 남기는 데 필요한 최소 기록이다.
