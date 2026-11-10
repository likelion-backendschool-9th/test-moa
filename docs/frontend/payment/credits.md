# 프론트엔드 크레딧 내역·출금 (`/my/credits`, `/my/credits/withdrawals`)

백엔드: [결제·구독·크레딧 백엔드](../../backend/payment/README.md)

시나리오 제목 끝의 태그가 확인 방법이다. `[테스트]`만 e2e 테스트와 1:1이고, `[테스트: 파일 번호]`는 그 테스트가 대신 확인한다. `[명령]`은 명령 한 번, `[직접]`은 사람이 화면을 보고 확인한다. (고침 #56)

## 한눈에
- 끝나면: `/my/credits`에서 잔액 구성과 전체 크레딧 내역(받은·쓴 크레딧 필터)을 보고, `/my/credits/withdrawals`에서 금액·계좌를 입력해 출금을 신청하고 지난 출금 요청의 상태(처리 중·지급 완료·반려)를 본다. 신청하면 그 브라우저의 출금 내역과 "출금 처리 중"에 바로 남는다(시연용 쿠키). 데이터는 목업이다. (고침 10-30)
- 결정 필요: 없음 (목업으로 진행, PAID·COMPLETED는 "지급 완료" 하나로 보여 주기로 확정 10-30)
- 규모: 7단계, 약 4~5시간 + 신청 기록 약 1시간

## 맥락
- 두 페이지는 지금 "준비 중"이다. 마이페이지 메뉴의 "크레딧", "출금"과 대시보드의 "크레딧 내역", "출금 신청", "전체 보기"가 여기로 온다.
- 크레딧 규칙 (spec.md 3장, GLOSSARY):
  - 가입 크레딧은 구독 결제 전용이고 현금화할 수 없다.
  - 테스트로 받은 크레딧은 1크레딧 = 1원으로 현금화할 수 있다.
  - 현금화 흐름: 사용자 요청 → 운영자 확인 → 지급. 요청 금액은 처리 중 잠그고, 지급하면 차감, 반려하면 되돌린다.
- 최소 출금액, 처리 기한은 미정이다. 화면에 약속하지 않는다.
- 백엔드는 지금 고려하지 않는다. 데이터와 제출은 모두 목업이다. (고침 #205: `AUTH_MODE=backend`에서는 잔액·내역을 서버에서 읽는다. 아래 "백엔드 연결")

## 1. 접근 제어 (R123)
비로그인 사용자는 두 페이지를 볼 수 없고 로그인으로 이동한다.

S348 크레딧 관리 [직접]
- Given `demo-role=guest`
- When  `/my/credits`에 접속한다
- Then  URL이 `/login?next=%2Fmy%2Fcredits`이다

S349 출금 [직접]
- When  `/my/credits/withdrawals`에 접속한다
- Then  URL이 `/login?next=%2Fmy%2Fcredits%2Fwithdrawals`이다

## 2. 잔액 (R124)
`/my/credits` 위쪽에 총 잔액과 구성, 승인 대기 보상을 보여 준다. 값은 마이페이지 크레딧 카드와 같다.

S350 테스터 [테스트: credit-balance.test.ts S350]
- 총 잔액·결제 가능액·출금 가능액의 계산은 `tests/unit/credit-balance.test.ts`가 잠금·이벤트 크레딧·승인 대기 보상을 나누어 확인한다. 아래의 문구와 링크 표시는 관련 화면을 바꿀 때 직접 확인한다.
- Given `demo-role=tester`, `/my/credits`
- Then  h1 "크레딧"과 "12,480 크레딧"이 보인다
- Then  "적립 크레딧 9,480 크레딧", "이벤트 크레딧 3,000 크레딧", "출금 처리 중 0 크레딧", "승인 대기 1,350 크레딧"이 보인다 (고침 11-02: 크레딧 구분 이름 변경, `payment/credit-labels.md`)
- Then  "출금 신청" 링크가 `/my/credits/withdrawals`를 가리킨다

S351 출금할 크레딧 없음 [직접]
- Given `demo-role=admin`
- Then  "0 크레딧"이 보이고 "출금 신청" 링크는 없다

## 3. 크레딧 내역 (R125)
잔액이 바뀐 기록을 최신순으로 모두 보여 준다. 받은 크레딧은 `+`, 쓴 크레딧은 `-`를 붙인다. 필터는 URL(`type`)에 남는다.

S352 전체 [직접]
- Given `demo-role=tester`, `/my/credits`
- Then  "크레딧 내역"에 12개 행이 있다
- Then  첫 행은 "레시피핏 테스트 보상", "+1,260 크레딧"이고 마지막 행은 "가입 크레딧", "+3,000 크레딧"이다
- Then  "전체" 필터에 `aria-current="page"`가 있다

S353 받은 크레딧 [직접]
- When  "받은 크레딧"을 누른다
- Then  URL이 `/my/credits?type=in`이고 행이 11개다

S354 쓴 크레딧 [직접]
- When  "쓴 크레딧"을 누른다
- Then  URL이 `/my/credits?type=out`이고 행은 "출금 지급", "-3,000 크레딧" 1개다

S355 알 수 없는 필터 [직접]
- Given `/my/credits?type=foo`
- Then  "전체" 필터가 선택되고 행이 12개다

S356 내역 없음 [직접]
- Given `demo-role=admin`
- Then  "아직 크레딧 내역이 없어요"가 보인다

S357 구독 결제 [직접]
- Given `demo-role=developer`, `/my/credits?type=out`
- Then  행은 "구독 결제", "-2,000 크레딧" 1개다

## 4. 출금 내역 (R126)
`/my/credits/withdrawals` 아래쪽에 지난 출금 요청을 최신순으로 보여 준다. 상태는 처리 중·지급 완료·반려 세 가지이고, 반려는 이유를 함께 보여 준다.

S358 테스터 [직접]
- Given `demo-role=tester`
- Then  "출금 내역"에 2개 행이 있다
- Then  1번은 "3,000원", "지급 완료"이다
- Then  2번은 "2,000원", "반려", "예금주 이름이 회원 정보와 달라요"이다

S359 처리 중 [직접]
- Given `demo-role=developer`
- Then  1번 행이 "1,000원", "처리 중"이다

S360 없음 [직접]
- Given `demo-role=admin`
- Then  "아직 출금 요청이 없어요"가 보인다

S370 상태 표시 (고침 10-30: 다크 모드에서 작고 잘 안 보인다는 피드백) [직접]
- Given `demo-role=tester`, 라이트·다크 각각
- Then  "지급 완료", "반려"의 글자 크기가 14px 이상이다
- Then  글자와 바탕의 대비가 4.5 이상이다

## 5. 출금 신청 (R127)
현금화 가능한 크레딧 안에서 금액과 계좌를 입력해 신청한다. 입력이 틀리면 칸 옆에 이유를 보여 준다. 제출은 목업이라 성공 메시지만 보여 주고 데이터는 바뀌지 않는다.

S361 안내 [직접]
- Given `demo-role=tester`, `/my/credits/withdrawals`
- Then  h1 "출금"과 "출금 가능 9,480 크레딧"이 보인다
- Then  "이벤트 크레딧은 출금할 수 없어요"가 보인다 (고침 11-02: 크레딧 구분 이름 변경, `payment/credit-labels.md`)

S362 전액 [직접]
- When  "전액"을 누른다
- Then  금액 칸이 `9480`이 되고 "받을 금액 9,480원"이 보인다

S363 성공 [테스트]
- When  금액 `5000`, 은행 "토스뱅크", 계좌번호 `100012345678`, 예금주 "한서윤"을 넣고 "출금 신청"을 누른다
- Then  "5,000원 출금을 신청했어요. 운영자가 확인한 뒤 지급해요."가 보인다 (`role="status"`)
- Then  입력 칸이 비워진다

S376 신청 뒤 다시 실패 (고침 10-30: 리뷰 — 성공 뒤 실패하면 칸이 다시 그려져 입력이 비워졌음) [테스트]
- Given S363처럼 한 번 신청했다
- When  금액 `10000`, 나머지는 S363과 같게 넣고 제출한다
- Then  "출금 가능한 크레딧(4,480)보다 많아요"가 보이고 네 칸에 입력한 값이 그대로 있다 (고침 10-30: R129부터 첫 신청 5,000이 잠겨 출금 가능이 4,480이 됨)

S364 금액 초과 [테스트]
- When  금액 `10000`을 넣고 나머지는 S363과 같게 제출한다
- Then  금액 칸 아래에 "출금 가능한 크레딧(9,480)보다 많아요"가 보이고 금액 칸에 `aria-invalid="true"`가 있다

S365 빈 칸·잘못된 형식 [테스트]
- When  아무것도 넣지 않고 제출한다
- Then  "금액을 입력해 주세요", "은행을 골라 주세요", "계좌번호를 입력해 주세요", "예금주를 입력해 주세요"가 보인다
- When  금액 `0`, 계좌번호 `12-34`를 넣고 제출한다
- Then  "1 크레딧 이상 입력해 주세요", "계좌번호는 숫자 10~14자리예요"가 보인다

S371 칸 비율 (고침 10-30: 출금 신청 카드 안 비율이 안 맞는다는 피드백) [직접]
- Given `demo-role=tester`, 너비 1440px
- Then  금액·은행·계좌번호·예금주 칸과 "전액" 버튼의 높이가 모두 같다 (48px)

S372 금액 폼 모서리 (고침 10-30: 금액 입력에는 둥근 알약이 가볍다는 피드백) [직접]
- Given `demo-role=tester`, `/my/credits/withdrawals`
- Then  금액·은행·계좌번호·예금주 칸과 "전액", "출금 신청" 버튼의 모서리가 12px이다
- Then  `/my/credits` 잔액 카드의 "출금 신청" 링크는 알약 모양 그대로다

S373 신청 버튼 위치 (고침 10-30: 신청 버튼은 오른쪽이 낫다는 피드백) [직접]
- Given 너비 1440px
- Then  "출금 신청" 버튼의 오른쪽 끝이 예금주 칸의 오른쪽 끝과 같고, 예금주 칸보다 아래에 있다
- Then  "받을 금액"이 버튼 바로 왼쪽, 같은 높이에 있다 (금액 칸 아래 안내는 없앤다)

S374 모바일 신청 버튼 [직접]
- Given 너비 375px
- Then  "출금 신청" 버튼 너비가 입력 칸 너비와 같고, "받을 금액"은 버튼 위에 있다

S375 펼친 은행 목록 (고침 10-30: 펼친 목록이 칸과 안 맞는다는 피드백) [직접]
- Given 너비 1440px, 375px 각각
- When  "은행"을 누른다
- Then  목록이 칸 바로 아래(16px 이내)에 칸과 같은 너비(차이 16px 미만)로 열린다
- Then  "은행 선택" 안내는 목록에 없다
- When  "토스뱅크"를 고른다
- Then  칸 값이 "토스뱅크"다

S366 출금할 크레딧 없음 [직접]
- Given `demo-role=admin`
- Then  "출금할 수 있는 크레딧이 없어요"가 보이고 "출금 신청" 버튼이 비활성이다

## 7. 신청 기록 (R129) (고침 10-30: 프로토타입이라 신청이 화면에 남아야 한다는 요청)
출금을 신청하면 그 브라우저에서 출금 내역과 잔액에 바로 반영된다. 시연용 기록이라 쿠키에만 남고, 다른 브라우저·다른 시연 회원에게는 보이지 않는다.

S377 내역에 추가 [테스트]
- Given `demo-role=tester`, `/my/credits/withdrawals`
- When  S363처럼 5,000 크레딧을 토스뱅크 `100012345678`로 신청한다
- Then  "출금 내역"이 3개 행이 되고, 1번 행은 "5,000원", "처리 중", "토스뱅크 ****5678"이다

S378 잔액에 반영 [테스트]
- Then  출금 신청 카드에 "출금 가능 4,480 크레딧"이 보인다
- Then  `/my/credits`에 "적립 크레딧 4,480 크레딧", "출금 처리 중 5,000 크레딧"이 보이고 총 잔액은 "12,480 크레딧" 그대로다 (고침 11-02: 크레딧 구분 이름 변경, `payment/credit-labels.md`)
- Then  `/my` 크레딧 카드도 같은 값이다

S379 새로고침 [테스트]
- When  `/my/credits/withdrawals`를 새로고침한다
- Then  S377의 행이 그대로 있다

S380 이어서 신청 [테스트]
- When  금액 `5000`으로 한 번 더 신청한다
- Then  "출금 가능한 크레딧(4,480)보다 많아요"가 보이고 내역은 3개 그대로다

S381 다른 브라우저·다른 회원 [테스트]
- Given S377을 마친 브라우저와 별개인 새 브라우저, `demo-role=tester`
- Then  "출금 내역"은 2개 행이다 (S358 그대로)
- Given S377을 마친 브라우저에서 `demo-role=developer`로 바꾼다
- Then  "출금 내역"은 1개 행이다 (S359 그대로)

## 6. 연결과 구조 (R128)
마이페이지 대시보드와 같은 데이터를 쓰고, 기존 테스트를 깨지 않는다.

S367 대시보드 일치 [직접]
- Given `demo-role=tester`
- Then  `/my`의 "최근 크레딧 내역" 5개 행은 `/my/credits`의 첫 5개 행과 같다

S368 준비 중 목록 [직접]
- Then  `/my/credits`, `/my/credits/withdrawals`는 S26 "준비 중" 목록에서 빠진다

S369 구조 (기존 S78) [명령]
- When  `grep -rl '"use client"' src`
- Then  기존 목록에 `WithdrawalForm` 1개가 더해진다 (develop 병합 뒤 모두 12개, 홈 문서 S78)
- When  `grep -rln "mock" src --include='*.tsx'`
- Then  결과가 없다

## 백엔드 연결 (#205)
`AUTH_MODE=backend`에서 `/my/credits`의 잔액과 내역, 마이페이지(`/my`)의 크레딧 카드·최근 크레딧 내역, 헤더의 크레딧 숫자, 구독 결제에 쓸 수 있는 크레딧이 서버 값을 읽는다. 백엔드 API는 [credit-balance-ledger.md](../../backend/payment/credit-balance-ledger.md)(`GET /api/v1/my/credits`, `GET /api/v1/my/credits/ledger?type=all|in|out`)다. 값이 없으면 지금처럼 목업이다. 번호는 `#205-S1`부터다. `#205-S11`(내역 개수 제한)은 백엔드 [credit-balance-ledger.md](../../backend/payment/credit-balance-ledger.md)에 있다.

정한 것 (#205)
- **크레딧 데이터는 `features/credit/api.ts`의 한 곳에서 읽는다.** `/my/credits`와 `/my`가 같은 변환을 거치게 해서 화면마다 숫자가 달라지지 않게 한다. 헤더는 서버의 `totalCredits`를, 구독 화면은 구독 API의 `payableCredits`를 그대로 쓴다(#203).
- **화면마다 필요한 API만 한 번씩 읽는다.** `/my/credits`는 잔액과 고른 필터의 내역을 하나씩, `/my`는 잔액과 최근 내역 5건(`limit=5`, #205-S11)을 하나씩 읽는다. 헤더는 회원 확인 뒤 잔액을 읽는데, 화면도 잔액을 읽으면 한 요청 안에서 결과를 함께 써서 잔액 API는 한 번만 간다(`backendFetchOnce`). 운영자는 크레딧 대상이 아니라 헤더에서 읽지 않고 0으로 둔다.
- **서버의 잔액은 화면 모양으로 이렇게 바꾼다.** 화면의 `earned`는 출금 처리 중인 금액을 포함하고 서버의 `earnedBalance`는 포함하지 않는다. 그래서 `earned = earnedBalance + lockedBalance`, `signup = eventCredit`, `pendingWithdrawal = lockedBalance`, `pendingReward`는 그대로 둔다. 그러면 화면의 계산(총 잔액, 결제 가능액, 출금 가능액)이 서버의 `totalCredits`, `payableCredits`, `cashableCredits`와 같은 값이 된다.
- **내역의 이름은 서버의 `description`을 그대로 보인다.** 구독 결제는 이벤트와 적립에서 나뉘어 두 줄로 내려오고("구독 결제(이벤트 크레딧)", "구독 결제(적립 크레딧)"), 목업의 한 줄 "구독 결제"는 합치지 않고 서버처럼 두 줄로 보인다. 필터(`type`)는 서버에 넘긴다.
- **시각은 서버가 준 오프셋 값을 한국 시간으로 보인다.** 날짜별 묶음도 서울 기준이다([server-time.md](../../server-time.md)).
- **헤더의 크레딧 숫자는 총 잔액(`totalCredits`)이다.** 목업 헤더와 같은 뜻이다. 마이페이지 요약의 최근 크레딧 내역은 서버 내역의 앞 5건이다.
- **크레딧 API만 실패하면 `/my/credits`와 `/my`는 오류로 멈추고 목업으로 채우지 않는다**(서버 전체가 내려가면 회원 확인이 먼저 실패해 비로그인으로 본다). `/my`는 구독 상태를 읽지 못하면 미구독으로 열리지만(#203-S16), 크레딧 카드를 0으로 채우면 잔액을 잘못 알리게 되므로 멈춘다. 다만 헤더는 모든 화면에 있으므로 크레딧을 읽지 못해도 페이지를 막지 않고 0으로 둔다(지금 백엔드 모드 헤더와 같다). 이때 본문 잔액과 달라 보일 수 있어 서버 로그에 경고를 남긴다.
- **출금 신청·내역과 운영자 출금 처리는 이 이슈에서 연결하지 않는다.** #206, #207에서 한다. 그 전까지 백엔드 모드의 출금 화면은 출금 가능액만 서버 값이고 신청을 받지 않는다. 목업 쿠키에 남기면 성공 문구가 나와도 서버 잔액과 운영자 목록에는 남지 않아, 신청한 것으로 믿게 되기 때문이다. 신청하면 "출금 신청은 아직 준비 중이에요"가 폼 위에 보인다(#205-S10). (고침 #206: 백엔드 모드에서도 서버에 신청한다. 아래 "백엔드 연결 (#206)")
- 새 화면은 없다. 목업 모드의 동작과 화면은 바꾸지 않는다.

확인 데이터 (#205)
[직접] 시나리오는 실제 백엔드에 회원과 크레딧이 있어야 한다. 크레딧을 주는 API가 아직 없어서(테스트 보상 지급, 운영자 시연용 크레딧 지급은 다른 이슈) 지금은 아래처럼 만든다. 운영자 화면에서 크레딧을 줄 수 있게 되면 그 방법으로 바꾼다.
1. 회원: `/signup`으로 가입한다. 크레딧을 넣을 회원 하나와 지갑이 없는 회원 하나(#205-S7)를 만든다.
2. 운영자: 가입한 회원 하나를 SQL로 운영자로 바꾼다. `UPDATE users SET role = 'ADMIN' WHERE email = '<이메일>';`
3. 크레딧: 지갑과 내역을 SQL로 넣는다. 지갑의 적립·이벤트 금액은 내역의 합과 같아야 한다. 아래는 적립 12,000, 이벤트 3,000이다. 셋째 내역은 어제 UTC 15:30(서울 오늘 00:30)이라 #205-S5의 날짜 묶음을 확인할 수 있다.
   ```sql
   INSERT INTO credit_wallets (user_id, earned_balance, event_credit, locked_balance, created_at, updated_at)
   SELECT id, 12000, 3000, 0, timezone('UTC', now()), timezone('UTC', now()) FROM users WHERE email = '<이메일>';

   INSERT INTO credit_ledgers (credit_wallet_id, delta, description, type, created_at, updated_at)
   SELECT w.id, v.delta, v.description, v.type, v.at, v.at
   FROM credit_wallets w
   JOIN users u ON u.id = w.user_id
   CROSS JOIN (VALUES
       (3000, '가입 크레딧', 'EVENT', timezone('UTC', now()) - interval '7 days'),
       (5000, '테스트 보상', 'EARNED', timezone('UTC', now()) - interval '3 days'),
       (7000, '경계 확인용 테스트 보상', 'EARNED', date_trunc('day', timezone('UTC', now())) - interval '8 hours 30 minutes')
   ) AS v(delta, description, type, at)
   WHERE u.email = '<이메일>';
   ```
   compose 환경에서는 `docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'`에 넣어 실행한다.
4. 나머지 값은 화면으로 만든다. 출금 처리 중(#205-S1)은 출금 신청(#206)으로, 구독 결제 두 줄(#205-S4)은 크레딧 구독 결제(#204)로 만든다. 승인 대기 보상은 참여가 확정되고 피드백을 제출한 참가에서 생긴다.
5. 크레딧 API만 실패하는 경우(#205-S8)는 백엔드를 멈추면 회원 확인부터 실패한다. Next와 백엔드 사이에서 그 경로만 500으로 답하게 해서(확인용 프록시 등) 본다.

#205-S1 잔액 구성을 서버 값으로 본다 [직접]
- Given 서버 지갑이 적립 12,000, 이벤트 3,000, 출금 처리 중 2,000이고 승인 대기 보상이 1,350인 회원, `/my/credits`
- Then  "적립 크레딧 12,000 크레딧", "이벤트 크레딧 3,000 크레딧", "출금 처리 중 2,000 크레딧", "승인 대기 1,350 크레딧"이 보이고 총 잔액은 "17,000 크레딧"이다
- Then  "출금 신청" 링크가 `/my/credits/withdrawals`를 가리킨다

#205-S2 서버 값과 화면 계산이 맞는다 [테스트: credit-balance.test.ts #205-S2]
- Given 서버 응답 `earnedBalance=12000`, `eventCredit=3000`, `lockedBalance=2000`
- Then  화면 값으로 바꾼 잔액의 총 잔액·결제 가능액·출금 가능액이 서버의 `totalCredits`(17,000)·`payableCredits`(15,000)·`cashableCredits`(12,000)와 같다
- Given 지갑이 없는 회원(모두 0)
- Then  모든 값이 0이고 승인 대기만 서버 값이다

#205-S3 내역을 전체·받음·나감으로 거른다 [직접]
- Given 서버 내역이 있는 회원, `/my/credits`
- Then  최신순으로 보이고 "전체" 필터에 `aria-current="page"`가 있다
- When  "받은 크레딧"을 누른다
- Then  URL이 `/my/credits?type=in`이고 늘어난 기록(`+`)만 보인다
- When  "쓴 크레딧"을 누른다
- Then  URL이 `/my/credits?type=out`이고 줄어든 기록(`-`)만 보인다
- Given `/my/credits?type=foo`
- Then  "전체"가 선택되고 전체 내역이 보인다(서버에 모르는 값을 보내지 않는다)

#205-S4 크레딧으로 구독을 결제하면 두 줄로 보인다 [직접]
- Given 이벤트 크레딧과 적립 크레딧을 함께 써야 하는 크레딧 결제를 한 회원
- When  `/my/credits?type=out`을 연다
- Then  "구독 결제(이벤트 크레딧)", "구독 결제(적립 크레딧)" 두 줄이 각각 `-` 금액으로 보이고 합이 결제 금액이다

#205-S5 시각을 한국 시간으로 보인다 [직접]
- Given 서버가 `…Z`(UTC)로 준 내역 시각
- Then  날짜별 묶음의 소제목(오늘·어제·"N월 N일")과 행의 시각("오후 3:12")이 서울 기준이다. 서울 날짜가 UTC 날짜와 달라지는 시각(UTC 15:00 이후)에는 다음 날로 묶인다

#205-S6 `/my`·헤더·구독 화면이 같은 값을 보인다 [직접]
- Given S1의 회원
- Then  `/my`의 크레딧 카드가 S1과 같은 값이고 "최근 크레딧 내역"이 `/my/credits`의 앞 5건과 같다
- Then  헤더의 크레딧 숫자가 총 잔액 "17,000"이다
- Then  `/my/subscription`의 "구독 결제에 쓸 수 있는 크레딧"이 15,000이다

#205-S7 크레딧이 없는 회원과 운영자 [직접]
- Given 지갑이 없는 회원, 운영자
- Then  `/my/credits`가 오류 없이 열리고 "0 크레딧", "아직 크레딧 내역이 없어요"가 보이며 "출금 신청" 링크는 없다(운영자는 `/my/credits`가 지금처럼 0으로 열린다)

#205-S8 크레딧만 읽지 못하면 오류로 멈춘다 [직접]
- Given 회원 확인(`/api/users/me`)은 되는데 크레딧 API만 실패한다(예: 500). 서버 전체가 내려가면 회원 확인도 실패해 비로그인으로 보이므로 이 시나리오가 아니다
- When  `/my/credits` 또는 `/my`를 연다
- Then  목업 값이나 0을 보이지 않고 오류로 멈춘다(앱 공용 오류 화면은 별도 작업, #203과 같다). 다른 화면의 헤더는 열리고 헤더 크레딧만 0이다

#205-S9 목업 모드는 그대로다 [테스트: credits.spec.ts]
- Given `AUTH_MODE`가 `backend`가 아니다
- Then  S350~S381(기존 `credits.spec.ts`)과 `/my`·구독 화면 E2E가 그대로 통과한다

#205-S10 백엔드 모드에서는 출금 신청을 받지 않는다 [직접]
- Given 적립 크레딧이 있는 회원, `AUTH_MODE=backend`, `/my/credits/withdrawals`
- When  금액·은행·계좌번호·예금주를 넣고 "출금 신청"을 누른다
- Then  "출금 신청은 아직 준비 중이에요"가 폼 위에 보이고 성공 문구는 없다. 출금 내역, 서버 잔액, 운영자 출금 목록은 그대로다 (고침 #206: 서버에 신청하고 성공 문구가 보인다. #206-S1)

## 백엔드 연결 (#206)
`AUTH_MODE=backend`에서 `/my/credits/withdrawals`의 출금 신청과 출금 내역이 서버 API를 쓴다. API는 [cashout.md](../../backend/payment/cashout.md)(`GET`·`POST /api/v1/my/credits/withdrawals`)다. 값이 없으면 지금처럼 목업(시연용 쿠키)이다. 번호는 `#206-S1`부터다. 운영자 처리 화면은 #207이다.

정한 것 (#206)
- **서버에 남기고 시연용 쿠키는 쓰지 않는다.** 백엔드 모드에서는 신청을 `POST`로 보내고, 출금 내역·"출금 처리 중" 금액은 서버 값이다. 그래서 #205에서 막아 둔 백엔드 모드의 출금 신청(#205-S10)을 받는다.
- **신청 요청은 `amount`, `bank`, `accountNumber`, `accountHolder`다.** 목업은 예금주를 저장하지 않았지만 서버는 받는다. 은행 7곳의 이름은 서버가 허용하는 값과 같다(`BANKS`).
- **입력 검사는 화면에서 먼저 하고 서버가 다시 본다.** 형식과 출금 가능액 검사는 지금 그대로 해서 대부분 서버에 가기 전에 막는다. 서버가 거절하면 이유를 그대로 보인다. 입력 형식 오류는 서버가 칸별로(`fields`) 주면 그 칸 아래에(서버 요청 필드가 화면 칸에 없으면 그 칸이 준 문구를 이어 붙여 폼 위쪽에 보인다. 칸별 오류일 때 서버의 최상위 message는 "입력값을 확인해 주세요" 같은 일반 안내라서 그 칸의 실제 문구를 쓴다. 객체 기본 키 이름(`toString` 등)은 칸으로 보지 않는다), 서비스가 주는 문구("출금 가능한 크레딧(…)보다 많아요", "출금할 수 있는 크레딧이 없어요")는 폼 위쪽 메시지에 보인다. 이 메시지는 `role="alert"`라서 화면 낭독기가 바로 읽는다(칸별 오류는 각 칸이 `aria-describedby`로 읽는다). 동시에 다른 창에서 신청해 잔액이 바뀐 경우가 여기에 해당한다.
- **내역의 계좌는 항상 끝 4자리만 보인다.** 서버는 처리 중인 요청의 계좌번호를 그대로, 끝난 요청은 이미 가려서 준다. 화면은 둘 다 `****` + 끝 4자리로 보이게 `maskAccount`를 거친다(이미 가려진 값에도 같은 결과다). 예금주는 화면에 보이지 않는다.
- **상태와 반려 사유.** `REQUESTED/PAID/REJECTED`는 처리 중·지급 완료·반려다. 반려는 사유 문구(`HOLDER` "예금주 이름이 회원 정보와 달라요", `ACCOUNT` "계좌번호를 확인할 수 없어요", `OTHER` "기타")와, 운영자가 적은 메모가 있으면 메모를 함께 보인다([admin-cashout.md](../../backend/payment/admin-cashout.md): 메모는 사유와 상관없이 회원에게 그대로 보인다).
- **신청 뒤에는 잔액이 서버 값으로 바뀐다.** 적립이 줄고 "출금 처리 중"이 늘며 총 잔액·헤더 숫자는 그대로다. `revalidatePath("/my", "layout")`로 `/my`, `/my/credits`, 헤더가 새 값을 읽게 한다.
- **출금 화면은 잔액과 출금 내역을 하나씩 읽는다.** 출금 내역은 출금 화면에서만 읽고, `/my`와 `/my/credits`는 읽지 않는다(#205의 "화면마다 필요한 API만 한 번씩 읽는다").
- **잔액이나 출금 내역을 읽지 못하면 출금 화면이 오류로 멈춘다**(목업으로 채우지 않는다). 출금 내역 API만 실패하면 `/my`와 `/my/credits`는 그대로 열린다. 신청이 실패하면 서버 메시지를 보인다.
- 목업 모드의 동작과 화면은 바꾸지 않는다.

확인 데이터 (#206)
- 적립 크레딧이 있는 회원과 지갑이 없는 회원(#206-S5)은 위 "확인 데이터 (#205)"로 만든다.
- 처리 중 요청은 회원이 `/my/credits/withdrawals`에서 신청해서 만든다. 지급 완료·반려 요청은 그 요청을 운영자가 `/admin/withdrawals`에서 처리해서 만든다(#207). 반려 메모는 운영자가 적은 값이 보인다.
- 출금 내역 API만 실패하는 경우(#206-S8)는 #205-S8처럼 그 경로만 500으로 답하게 해서 본다.

#206-S1 출금을 신청하면 서버에 남고 적립이 처리 중으로 묶인다 [직접]
- Given 적립 12,000인 회원, `/my/credits/withdrawals`
- When  금액 `5000`, 은행 "토스뱅크", 계좌번호 `100012345678`, 예금주 입력 뒤 "출금 신청"을 누른다
- Then  "5,000원 출금을 신청했어요. 운영자가 확인한 뒤 지급해요."가 보이고 입력 칸이 비워진다
- Then  출금 내역 맨 위에 "5,000원", "처리 중", "토스뱅크 ****5678"이 보인다. 새로고침해도 그대로다(서버에 남음)
- Then  출금 신청 카드의 "출금 가능"이 7,000, `/my/credits`가 "적립 크레딧 7,000", "출금 처리 중 5,000"이고 총 잔액과 헤더 숫자는 그대로다

#206-S2 출금 내역에서 처리 중·지급 완료·반려를 본다 [직접]
- Given 처리 중·지급 완료·반려 요청이 하나씩 있는 회원
- Then  최신순으로 보이고 각 상태 이름이 맞다. 반려에는 사유 문구가 보이고, 운영자가 메모를 남겼다면 메모도 보인다
- Then  모든 행의 계좌는 `****` + 끝 4자리다(처리 중인 요청도 전체 번호가 보이지 않는다)

#206-S3 다른 창에서 잔액이 바뀐 뒤 신청하면 막힌다 [직접]
- Given 출금 신청 화면을 두 창에 열어 둔다
- When  첫 창에서 출금 가능액 전부를 신청한 뒤 둘째 창(잔액이 갱신되기 전 화면)에서 같은 금액을 신청한다
- Then  둘째 창에 "출금할 수 있는 크레딧이 없어요"가 보이고 입력한 값은 그대로 남는다. 내역에는 한 건만 있다
- 신청할 때 화면 쪽이 서버 잔액을 다시 읽어 먼저 막는다. 두 요청이 정말 동시에 서버에 닿았을 때만 서버가 거절하고(백엔드 #67-S5), 그 문구는 폼 위쪽에 보인다

#206-S4 서버 응답을 화면 값으로 바꾼다 [테스트: credit-balance.test.ts #206-S4]
- Given 서버 출금 응답(상태 3종, 처리 중은 전체 계좌, 반려는 사유·메모, 시각은 오프셋)
- Then  화면 값의 상태 이름, 끝 4자리 계좌, 사유 문구(+메모), 신청 시각이 맞다. 사유가 없는 반려도 오류 없이 변환된다

#206-S5 출금할 크레딧이 없으면 신청할 수 없다 [직접]
- Given 지갑이 없는 회원과 운영자
- Then  "출금할 수 있는 크레딧이 없어요"가 보이고 "출금 신청" 버튼이 비활성이다. 출금 내역은 "아직 출금 요청이 없어요"다

#206-S6 서버가 칸별 오류를 주면 그 칸에 보인다 [직접]
- Given 화면의 검사를 우회해 서버에 형식이 틀린 값(예: 계좌번호 `12-34`)이 가는 경우
- Then  서버가 준 칸별 문구가 해당 칸 아래에 보인다

#206-S7 목업 모드는 그대로다 [테스트: credits.spec.ts]
- Given `AUTH_MODE`가 `backend`가 아니다
- Then  S358~S366, S376~S381(기존 `credits.spec.ts`)이 그대로 통과한다

#206-S8 출금 내역만 읽지 못하면 출금 화면만 멈춘다 [직접]
- Given 회원 확인과 잔액·크레딧 내역 API는 되는데 출금 내역 API(`GET /api/v1/my/credits/withdrawals`)만 실패한다(예: 500)
- When  `/my/credits/withdrawals`를 연다
- Then  목업 값을 보이지 않고 오류로 멈춘다
- When  `/my`와 `/my/credits`를 연다
- Then  오류 없이 열리고 잔액과 크레딧 내역이 서버 값으로 보인다

## 범위 밖
- 실제 출금 처리, 계좌 실명 확인, 운영자 승인 화면 (`/admin/withdrawals`). 시연용 신청은 계속 "처리 중"으로 남는다 (고침 #207: `AUTH_MODE=backend`에서는 운영자가 `/admin/withdrawals`에서 처리한 결과가 회원 출금 내역과 잔액에 반영된다. [withdrawals.md](../admin/withdrawals.md)의 "백엔드 연결 (#207)")
- 출금 요청 취소, 시연용 기록 초기화 버튼 (쿠키를 지우면 된다)
- 최소 출금액, 처리 기한 (기획 미정)
- 크레딧 내역 페이지 나누기·기간 필터

## 작업 순서
(R129 추가분)
7. 신청 기록 — S377~S381
   - 파일: `src/features/credit/demo-requests.ts` 새로 만듦 (`server-only`. 쿠키 `demo-withdrawals-<role>`를 읽고 쓰는 함수만 둔다. 프로토타입을 걷어낼 때 이 파일과 호출 두 곳만 지운다)
   - 파일: `src/features/credit/api.ts` — `load()`에서 목업에 쿠키 기록을 합침 (내역 맨 앞, `pendingWithdrawal`에 합계). `features/my/api.ts`도 이 합친 값을 쓰도록 `creditDataFor(role, now)`를 내보냄
   - 파일: `src/features/credit/actions.ts` — 검사 통과 뒤 기록 저장, `revalidatePath("/my", "layout")`
   - 파일: `e2e/credits.spec.ts` R129 묶음
   - 확인: `npm run test:e2e && npm run lint && npm run build`

(처음 계획)
1. 크레딧 데이터 계층 — S350 이후 시나리오가 쓰는 데이터(처음 계획의 끝 번호가 오타였다), S367
   - 파일: `src/features/credit/types.ts`, `mock.ts`, `api.ts` (`getCreditOverview()`, `getCreditLedger(type)`, `getWithdrawals()`)
   - 파일: `src/features/my/mock.ts`, `api.ts` — 크레딧 잔액·최근 내역을 `features/credit`에서 가져오게 바꿈
   - 확인: `npx tsc --noEmit`, `npm run test:e2e -- my.spec.ts` (기존 마이페이지 통과)
2. 크레딧 관리 페이지와 잔액 — S348, S350, S351
   - 파일: `src/app/my/(account)/credits/page.tsx`, `src/features/credit/components/BalanceSummary.tsx`
   - 재사용: `features/my/components/card-styles.ts`, `formatCredits`
3. 크레딧 내역과 필터 — S352~S357, S367
   - 파일: `src/features/credit/components/LedgerList.tsx`, `LedgerFilter.tsx` (필터는 링크라 서버 컴포넌트), `query.ts` (`parseLedgerType`)
   - 재사용: `features/my/components/RecentCredits.tsx`의 행 모양을 `LedgerRow`로 빼서 함께 씀
4. 출금 내역 — S349, S358~S360
   - 파일: `src/app/my/(account)/credits/withdrawals/page.tsx`, `src/features/credit/components/WithdrawalHistory.tsx`
5. 출금 신청 폼 — S361~S366
   - 파일: `src/features/credit/actions.ts` (`"use server"`, 입력 검사), `src/features/credit/components/WithdrawalForm.tsx` (`"use client"`, `useActionState`)
   - Next 16 문서 `node_modules/next/dist/docs/`에서 Server Actions·`useActionState`·폼 검사 확인 후 작성
6. 테스트·문서 정리 — S368, S369
   - 파일: `e2e/credits.spec.ts` 새로 만듦, `e2e/links.spec.ts`, `docs/frontend/home.md` S26·S78
   - 확인: `npm run test:e2e && npm run lint && npm run build`, 개발 서버에서 1440px·375px 눈으로 확인

## 가정
- 제출: 신청은 시연용 쿠키 `demo-withdrawals-<role>`에 남고, 출금 내역과 "출금 처리 중"에 반영된다. 서버에는 저장하지 않는다. 계좌번호는 끝 4자리만 남긴다. 최대 10건까지 남기고 넘으면 오래된 것부터 지운다. 쿠키를 지우면 처음 상태로 돌아간다. (고침 10-30: 처음에는 성공 메시지만 보이고 아무것도 바뀌지 않았음. 프로토타입이라 남아야 한다는 요청)
- 쿠키로 둔 이유: E2E가 브라우저마다 따로 돌아 서로 섞이지 않고, 서버를 다시 켜도 시연 상태가 유지된다. 서버 메모리에 두면 병렬 테스트가 서로의 신청을 보게 된다.
- 계좌: 은행, 계좌번호, 예금주를 받는다. 은행 목록은 국민, 신한, 우리, 하나, 농협, 카카오뱅크, 토스뱅크 7개다. 계좌번호는 숫자 10~14자리다.
- 최소 출금액은 미정이라 1크레딧 이상이면 받는다.
- 출금 상태: 처리 중(요청) → 지급 완료 / 반려. PAID와 COMPLETED는 "지급 완료" 하나로 보여 준다.
- 크레딧 내역에는 잔액이 실제로 바뀐 기록만 남긴다: 테스트 보상, 가입 크레딧, 구독 결제, 출금 지급. 출금 요청과 반려는 잔액을 바꾸지 않으므로(잠금·해제) 출금 내역에만 보인다.
  - 이 규칙에 맞춰 마이페이지 목업의 developer "출금 신청 -1,000" 행을 없앤다.
- 시연용 샘플 수치 (내역 합계 = 총 잔액):
  - tester: 테스트 보상 10건 합 12,480 + 가입 3,000 − 출금 지급 3,000 = 12,480. 출금 내역: 지급 완료 3,000, 반려 2,000.
  - developer: 가입 3,000 − 구독 결제 2,000 + 보상 2건 2,260 = 3,260. 출금 내역: 처리 중 1,000.
  - admin: 모두 0, 내역 없음.
- 필터 이름은 "전체 / 받은 크레딧 / 쓴 크레딧"이고 URL은 `type=in|out`이다. 모르는 값은 전체로 본다.
- 날짜는 접속 시각 기준 상대값이다. 행에는 "10월 29일" 형식으로 보인다.
- 디자인은 마이페이지와 같은 카드(`card-styles.ts`)와 `components/ui`만 쓴다.
- 출금 신청 폼은 `DESIGN.md`의 The Money Field Rule을 따른다: 입력란·선택·버튼 모두 12px 모서리, 높이 48px. 버튼은 `Button`의 `shape="field"` 옵션으로 고르고, 기본값(알약)은 바꾸지 않는다.
- 은행 목록은 CSS `appearance: base-select`로 꾸민다. Chrome·Edge 135 이상에서만 칸에 맞춘 목록이 나오고, Safari·Firefox는 운영체제 기본 목록을 쓴다. 고를 수 있는 값과 동작은 같다.
- 출금 상태 색: 지급 완료는 강조색 면 + 강조 위 글씨, 처리 중은 먹 반전, 반려는 칩 회색 면 + 흐린 먹 테두리. 공용 `Badge`의 연한 톤은 다크에서 대비가 낮아 쓰지 않는다.
- S번호는 S348~S381을 쓴다. 처음에는 S135~S190이었고(리뷰 반영으로 S185, 신청 기록으로 S186~S190을 더했다), 11-02 번호 정리에서 다른 문서와 겹쳐 새 구간으로 옮겼다. 옛 번호와의 대응은 `scenario-numbers.md` "시나리오 번호(S)"에 있다.

## 참고 (2026-10-30 확인)
- 페이지 URL: `docs/page-urls.md` 마이페이지 섹션 (`/my/credits` 크레딧 관리, `/my/credits/withdrawals` 출금 신청·내역)
- 크레딧·현금화 규칙: `project-lion/.scratch/tester-platform-planning/spec.md` 3장, `project-lion/GLOSSARY.md`
- 와이어프레임: 내 지갑 — 크레딧 잔액, 크레딧 획득·사용내역, 현금화 요청·진행 상태
- 마이페이지 데이터: `frontend/src/features/my/` (`docs/frontend/my.md`)
