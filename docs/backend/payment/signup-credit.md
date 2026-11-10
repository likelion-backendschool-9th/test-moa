# 백엔드 가입 크레딧 지급

시나리오 제목 끝의 태그가 확인 방법이다. `[테스트]`만 이 문서 시나리오와 백엔드 테스트가 1:1이고, `[직접]`은 사람이 API·화면으로 확인한다.

이슈: [#255](https://github.com/likelion-backendschool-9th/test-moa/issues/255). 요구·시나리오는 `#255-S…`부터 센다. 지갑·장부 구조는 [entities.md](entities.md), 크레딧 화면은 [credits.md](../../frontend/payment/credits.md)의 가입 크레딧 문구를 본다.

## 한눈에
- 끝나면: 회원가입(이메일·소셜)이 끝나면 지갑이 만들어지고 이벤트 크레딧 3,000이 지급된다. 장부에 "가입 크레딧" `EVENT` +3,000이 한 줄 남는다. 이미 가입한 회원은 서버가 한 번 도는 일회성 실행기로 같은 지급을 받는다.
- 선행: #45(지갑·장부), #71(구독 결제).
- 이 이슈 범위 밖: 가입 외 이벤트 크레딧(추천인·프로모션), 이벤트 크레딧 만료, 소급 지급용 관리자 화면·API, 프런트 변경(프런트는 서버의 `eventCredit`과 장부를 이미 읽는다).

## 정한 것 (#255)
- **지급은 한 메서드가 한다.** `SignupCreditService.grant(userId)`가 지갑이 없으면 만들고(`insertIfAbsent`), 지갑 행을 잠근 뒤 `grantEvent`와 장부 `EVENT` 한 줄("가입 크레딧")을 남긴다. 가입과 소급 지급이 같은 메서드를 쓴다.
- **중복 지급은 장부로 막는다.** 그 지갑에 "가입 크레딧" `EVENT` 행이 이미 있으면 지급하지 않고 `false`를 돌려준다. 문구는 상수(`SignupCreditServiceImpl.DESCRIPTION`)를 가입 지급과 소급 지급이 함께 쓴다. 별도 컬럼은 더하지 않는다(DB는 ERD보다 복잡하게 만들지 않는다).
- **가입 지급은 가입과 같은 트랜잭션이다.** `AuthServiceImpl`의 `signup`·`oauthSignup`이 회원·계정을 저장한 뒤 `grant`를 부른다. 지급이 실패하면 가입 전체가 되돌아가서 회원은 있고 지갑이 없는 상태가 새로 생기지 않는다. 가입은 오류로 끝나고 사용자는 다시 가입한다.
- **지급액은 설정이다.** `credit.signup-bonus.amount`(환경 변수 `CREDIT_SIGNUP_BONUS_AMOUNT`, 기본 3,000). 0 이하이면 지급하지 않는다(지갑도 만들지 않는다).
- **기존 회원은 일회성 실행기가 채운다.** `credit.signup-bonus.backfill`(환경 변수 `CREDIT_SIGNUP_BONUS_BACKFILL`, 기본 `false`)이 `true`일 때만 `SignupCreditBackfillRunner`가 만들어져 서버 시작 때 한 번 돈다. 지급 뒤에는 설정을 끈다. 켜 둔 채 재시작해도 중복 지급되지 않는다(위 장부 검사).
- **소급 지급 대상.** 권한 `USER`이고 상태가 `ACTIVE`·`SUSPENDED`인 회원이다. 관리자(`ADMIN`), 탈퇴 유예(`WITHDRAWN`), 파기(`DELETED`)는 뺀다. 이미 구독 결제로 지갑이 있으면 만들지 않고 이벤트 크레딧만 더한다.
- **회원마다 트랜잭션을 나눈다.** 실행기는 트랜잭션 밖에서 회원마다 `grant`를 불러서 한 회원이 실패해도 나머지는 계속한다. 실패한 회원은 로그에 남기고 마지막에 지급·건너뜀·실패 수를 로그로 남긴다.
- **서버 반영.** 병합·배포 뒤 서버 `.env`에 `CREDIT_SIGNUP_BONUS_BACKFILL=true`를 넣고 백엔드를 한 번 재시작해 지급한다. 로그의 지급·실패 수를 확인한 뒤 값을 지우거나 `false`로 바꾼다. 서버 DB를 바꾸는 일이라 실행 시점은 사용자가 정한다.

## 시나리오

#255-S1 이메일로 가입하면 지갑이 만들어지고 가입 크레딧이 지급된다 [테스트]
- Given 새 이메일·닉네임
- When  `POST /api/auth/signup`
- Then  201이고, 그 회원의 지갑이 생기며 `eventCredit`이 3,000, `earnedBalance`·`lockedBalance`가 0이다
- Then  장부에 `EVENT` +3,000 "가입 크레딧" 한 줄이 있다

#255-S2 소셜로 가입해도 같다 [테스트]
- Given 소셜 가입 토큰(처음 온 소셜 계정)
- When  `POST /api/auth/oauth/signup`
- Then  201이고 지갑 `eventCredit` 3,000, 장부 "가입 크레딧" `EVENT` +3,000 한 줄이다

#255-S3 가입이 실패하면 회원·지갑·장부가 남지 않는다 [테스트]
- Given 지급 중에 저장이 실패한다(장부 저장 오류)
- When  `POST /api/auth/signup`
- Then  가입은 오류이고, 그 이메일의 회원도 지갑도 장부도 없다(같은 이메일로 다시 가입할 수 있다)
- Given 이미 있는 이메일로 가입한다
- Then  409 `EMAIL_TAKEN`이고 새 지갑·장부가 생기지 않는다

#255-S4 지급액은 설정 값이고 0 이하면 지급하지 않는다 [테스트]
- Given `credit.signup-bonus.amount`를 5,000으로 둔 서비스
- Then  `grant`가 `eventCredit` 5,000과 장부 +5,000을 남긴다
- Given 설정이 0이다
- Then  `grant`는 `false`이고 지갑도 장부도 만들지 않는다

#255-S5 가입 직후 쓸 수 있는 크레딧은 3,000이고 출금할 수 있는 크레딧은 0이다 [테스트]
- Given 가입한 회원이 로그인한다
- When  `GET /api/v1/my/credits`
- Then  `eventCredit` 3,000, `payableCredits` 3,000, `cashableCredits` 0, `totalCredits` 3,000이다
- When  `GET /api/v1/my/credits/ledger`
- Then  "가입 크레딧" +3,000 한 줄이 있다

#255-S6 서버 모드 화면에서 가입 직후 가입 크레딧이 보이고 크레딧으로 구독 결제를 할 수 있다 [직접]
- Given `AUTH_MODE=backend`, 화면으로 새로 가입한 회원
- Then  `/my/credits`에 이벤트 크레딧 3,000과 내역 "가입 크레딧"이 보인다
- Then  `/my/subscription/checkout`에서 크레딧 결제는 가격(9,000)보다 모자라 막히고 현금(카카오페이·토스페이)은 고를 수 있다
- Then  가입 크레딧이 가격 이상이 되게 지갑을 만든 회원은 크레딧으로 결제하고, 장부에 `EVENT` 차감 행이 맞게 남는다(#71의 기존 동작)

#255-S7 일회성 실행기가 가입 크레딧을 받지 않은 기존 회원에게 지급한다 [테스트]
- Given 지갑이 없는 `USER`, 구독 결제로 지갑이 있고 `earnedBalance` 500인 `USER`, 정지(`SUSPENDED`) `USER`, `ADMIN`, 탈퇴 유예(`WITHDRAWN`) `USER`, 파기(`DELETED`) `USER`
- When  실행기를 돌린다
- Then  앞의 세 회원만 `eventCredit` 3,000과 장부 "가입 크레딧" 한 줄을 받는다. 지갑이 없던 회원은 지갑이 만들어지고, 있던 회원의 `earnedBalance`는 500 그대로다
- Then  `ADMIN`·`WITHDRAWN`·`DELETED` 회원에게는 지갑도 장부도 생기지 않는다

#255-S8 두 번 돌려도 중복 지급되지 않고, 한 회원이 실패해도 나머지는 계속한다 [테스트]
- Given 실행기를 이미 한 번 돌렸다
- When  한 번 더 돌린다
- Then  `eventCredit`은 3,000 그대로이고 장부 "가입 크레딧"은 한 줄이다(가입으로 이미 받은 회원도 같다)
- Given 한 회원의 `grant`가 예외를 던진다
- When  실행기를 돌린다
- Then  나머지 회원은 지급되고 실행기는 예외를 밖으로 던지지 않는다. 실패한 회원은 로그에 남는다

#255-S9 소급 지급 설정이 꺼져 있으면 실행기가 만들어지지 않는다 [테스트]
- Given 기본 설정(`credit.signup-bonus.backfill`이 `false`)
- Then  애플리케이션에 `SignupCreditBackfillRunner` 빈이 없다

#255-S10 서버에서 소급 지급을 돌리면 로그에 결과가 남고 설정을 끈 뒤에는 돌지 않는다 [직접]
- Given 배포 서버 `.env`에 `CREDIT_SIGNUP_BONUS_BACKFILL=true`로 재시작
- Then  백엔드 로그에 지급·건너뜀·실패 수가 남고, 회원마다 장부에 "가입 크레딧"이 한 줄씩이다
- When  설정을 끄고 재시작한다
- Then  로그에 소급 지급이 없고 잔액이 바뀌지 않는다

## 가정
- 지갑 생성은 구독 결제가 쓰는 `insertIfAbsent`(`ON CONFLICT DO NOTHING`)를 그대로 쓴다. 같은 회원의 지급과 첫 결제가 동시에 와도 지갑은 하나다.
- 지급액 3,000은 문서·프런트 목업의 가입 크레딧 값이다. 구독 가격(크레딧 9,000)보다 작아서 가입 크레딧만으로는 구독을 못 한다.
- 소급 지급 대상 수는 많지 않다고 보고 회원을 한꺼번에 읽는다. 회원이 많아지면 페이지로 나눈다.
