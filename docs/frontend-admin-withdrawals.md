# 프론트엔드 출금 요청 관리 (`/admin/withdrawals`)

출금 요청 관리 페이지가 지켜야 하는 요구사항(R)과 시나리오(S)를 모은 문서다. 번호는 다른 문서와 겹치지 않게 R31, S191부터 매긴다. S번호는 `frontend/e2e/admin-withdrawals.spec.ts`의 테스트 이름과 1:1로 맞춘다. 테스트를 추가하거나 바꾸면 이 문서도 함께 고친다.

## 한눈에
- 목적: 운영자가 테스터의 출금 요청(크레딧 현금화)을 확인하고 지급 완료 또는 반려로 처리한다. 요청 금액은 처리 중 잠겨 있고, 지급하면 차감되고 반려하면 회원에게 돌아간다(크레딧 계획 문서 `2026-10-30-frontend-credits.md` 맥락).
- 스택: 홈과 같다. 실행 방법은 `frontend/README.md`를 본다.
- 화면 구성:
  1. 목록 `/admin/withdrawals`: 운영자 하위 탭(출금 요청이 현재 탭), "처리 대기"·"처리 완료" 탭, 요청 목록
  2. 상세 `/admin/withdrawals/:withdrawalKey`: 신청 금액, 받을 계좌, 회원 정보, 처리 양식 또는 처리 결과
- 처리 결과는 두 가지다. 테스터 출금 내역의 상태 이름과 맞춘다.
  - 지급 완료: 운영자가 계좌로 송금을 마쳤다. 잠긴 크레딧이 차감된다.
  - 반려: 지급하지 않는다. 사유를 골라야 하고, 사유는 테스터 출금 내역에 그대로 보인다. 잠긴 크레딧이 회원에게 돌아간다.
- 디자인: 신고·제재 관리와 같은 토큰과 `components/ui`만 쓴다. 주 버튼은 상세의 "처리하기" 하나다. 결과 배지에는 강조색을 쓰지 않는다. 금액은 `formatWon`("5,000원")으로 적는다. 규칙은 `frontend/DESIGN.md`와 `docs/design-tokens.html`에 있다.
- 데이터: 목업이다. 처리 결과는 시연용 쿠키 `demo-admin-withdrawals`에 저장해서 같은 브라우저 안에서만 유지된다. 운영자 홈의 출금 데이터와 같은 출처를 쓴다.
- 결정 필요:
  - 테스터 화면과 연동할지. 같은 브라우저에서 테스터가 신청한 출금(`demo-withdrawals-<role>`)을 운영자 목록에 보여 주고, 처리 결과를 테스터 출금 내역에 반영하는 것. PR #9(`feature/frontend-credits`)가 병합된 뒤 정한다. 그 전까지는 운영자 목업만 쓴다.
  - 반려 사유 목록. 아래 3개로 시작하고 팀에서 확정한다.
  - 최소 출금액, 운영자 처리 기한. 기획 미정이라 화면에 약속하지 않는다.
- 페이지 URL: `docs/page-urls.md`

이 아래 시나리오는 따로 적지 않으면 `demo-role=admin`이다.

## 1. 테마 (R31)
신고·제재 관리와 같은 토큰을 쓰고, 강조색은 주 버튼 하나에만 쓴다.

S191 결과 배지
- Given `prefers-color-scheme: light` (`dark`도 같다)
- When  `/admin/withdrawals?tab=done`에 접속한다
- Then  "지급 완료"·"반려" 배지의 글씨색이 `--accent`가 아니다

S192 주 버튼 하나
- When  `/admin/withdrawals/withdrawal-1`에 접속한다
- Then  강조색 바탕의 버튼은 "처리하기" 하나뿐이다

## 2. 접근 권한 (R32)
목록과 상세 모두 운영자에게만 보인다. 규칙은 운영자 홈 R15와 같다.

S193 일반 회원
- Given `demo-role=tester`
- When  `/admin/withdrawals/withdrawal-1`에 접속한다
- Then  "운영자만 볼 수 있는 페이지예요"가 보이고 계좌 정보는 없다

S194 비로그인
- Given `demo-role=guest`
- When  `/admin/withdrawals/withdrawal-1`에 접속한다
- Then  URL이 `/login?next=%2Fadmin%2Fwithdrawals%2Fwithdrawal-1`이다

S195 없는 요청
- When  `/admin/withdrawals/nope`에 접속한다
- Then  맞춤 404("찾는 페이지가 없어요")가 보이고 `noindex`가 붙는다
- 참고: 응답 상태는 신고 상세 S427처럼 테스트하지 않는다(개발 서버 200, 빌드한 서버 404).
- 참고: 스트리밍 순서에 따라 Next가 `noindex` 메타를 두 번 넣기도 한다. 그래서 테스트는 개수가 아니라 있는지만 본다.

## 3. 목록 (R33)
처리 대기는 오래 기다린 순서로, 처리 완료는 최근 처리 순서로 보여 준다. 탭 상태는 URL(`tab`)에 남는다. 계좌번호는 목록에 보여 주지 않는다.

S196 처리 대기
- When  `/admin/withdrawals`에 접속한다
- Then  "처리 대기" 탭에 `aria-current="page"`가 있고 요청 3건이 신청이 오래된 순서다
- Then  목록 위에 "3건 · 25,200원"이 보인다
- Then  각 행에 닉네임, 금액(원), 은행, 경과 시간이 있다
- Then  계좌번호 숫자는 목록 어디에도 없다

S197 예금주 확인 필요 표시
- Then  "김민준" 행에 "예금주 확인 필요"가 있다
- Then  다른 두 행에는 없다

S198 처리 완료
- When  "처리 완료" 탭을 누른다
- Then  URL에 `tab=done`이 붙고 요청 2건이 최근 처리 순서다
- Then  각 행에 결과("지급 완료" 또는 "반려")와 처리 시각이 있다

S199 없음
- Given `demo-data=empty`
- Then  "처리할 출금 요청이 없어요"가 보인다

S200 상세로 이동
- When  처리 대기 첫 행을 누른다
- Then  URL이 `/admin/withdrawals/withdrawal-1`이다

## 4. 상세 (R34)
송금에 필요한 정보를 한 화면에 보여 준다. 계좌번호 전체는 처리 대기 상세에서만 보여 준다.

S201 처리 대기 상세
- When  `/admin/withdrawals/withdrawal-1`에 접속한다
- Then  닉네임 "이지우", 회원 이름 "이지우", 신청 금액 "5,000원", 신청 시각이 보인다
- Then  받을 계좌 "국민", 계좌번호 "123456789012", 예금주 "이지우"가 보인다
- Then  "계좌번호 복사" 버튼이 있다

S202 예금주가 회원 이름과 다를 때
- When  `/admin/withdrawals/withdrawal-2`에 접속한다
- Then  예금주 "김민지"와 회원 이름 "김민준"이 보이고 "예금주가 회원 이름과 달라요"가 보인다

S203 처리 완료 상세의 계좌 가림
- When  `/admin/withdrawals/withdrawal-4`에 접속한다
- Then  계좌번호는 "****5678"처럼 끝 4자리만 보인다
- Then  "계좌번호 복사" 버튼은 없다

S204 목록으로
- Then  "목록으로" 링크가 `/admin/withdrawals`를 가리킨다

## 5. 처리 (R35)
운영자는 결과를 골라 처리하고, 처리한 요청은 처리 대기에서 처리 완료로 옮겨진다. 처리 결과는 다시 바꿀 수 없다. 막히면 페이지를 옮기지 않고 그 자리에서 오류를 보여 준다.

S205 결과를 골라야 처리된다
- When  결과를 고르지 않고 "처리하기"를 누른다
- Then  처리되지 않고 "처리 결과를 골라 주세요"가 보인다
- Then  주소는 `/admin/withdrawals/withdrawal-1` 그대로다

S206 반려는 사유가 있어야 한다
- When  "반려"를 고르고 사유 없이 "처리하기"를 누른다
- Then  처리되지 않고 "반려 사유를 골라 주세요"가 보인다
- When  사유 "기타"를 고르고 메모 없이 "처리하기"를 누른다
- Then  "회원에게 보여 줄 사유를 적어 주세요"가 보인다

S207 지급 완료
- When  `/admin/withdrawals/withdrawal-1`에서 "지급 완료"를 고르고 "처리하기"를 누른다
- Then  URL이 `/admin/withdrawals?processed=withdrawal-1`이고 "5,000원을 지급 완료로 처리했어요"가 보인다
- Then  처리 대기가 2건이고 "2건 · 20,200원"이다
- When  "처리 완료" 탭을 누른다
- Then  "이지우" 행이 맨 위에 있고 "지급 완료"가 있다

S208 반려
- When  `/admin/withdrawals/withdrawal-2`에서 "반려", 사유 "예금주 이름이 회원 정보와 달라요"를 고르고 "처리하기"를 누른다
- Then  "출금 요청을 반려했어요. 잠긴 크레딧이 회원에게 돌아가요"가 보인다
- Then  처리 완료 탭의 "김민준" 행에 "반려"가 있다

S209 처리한 요청의 상세
- Given S208을 마친 상태
- When  `/admin/withdrawals/withdrawal-2`에 접속한다
- Then  처리 양식은 없고 결과 "반려", 사유, 처리 시각이 보인다
- Then  계좌번호는 끝 4자리만 보인다 (S203과 같다)

S210 저장 공간이 모자랄 때
- Given 시연용 처리 기록 쿠키가 한도 가까이 차 있다
- When  `/admin/withdrawals/withdrawal-1`에서 "반려", 사유 "기타", 메모 80자를 적어 "처리하기"를 누른다
- Then  "시연용 저장 공간이 모자라 처리하지 못했어요"가 보이고 주소는 그대로다
- Then  적은 메모 80자가 입력창에 그대로 있다
- Then  withdrawal-1은 처리 대기에 그대로 있다

S217 막혀도 고른 값이 남는다
- When  `/admin/withdrawals/withdrawal-1`에서 "반려", 사유 "기타"를 고르고 메모 없이 "처리하기"를 누른다
- Then  "회원에게 보여 줄 사유를 적어 주세요"가 보이고 "반려"와 "기타"가 골라진 채로 있다
- Then  주소는 그대로다 (고른 값과 메모가 주소나 방문 기록에 실리지 않는다)
- When  메모만 적고 "처리하기"를 누른다
- Then  처리된다

S218 기타가 아닌 반려의 메모
- When  `/admin/withdrawals/withdrawal-1`에 접속해 "반려"를 고른다
- Then  메모 입력창 위에 "반려할 때 운영자 기록으로 남아요. 사유가 "기타"이면 이 메모가 회원에게 보이는 사유가 돼요."가 보인다 (placeholder가 아니라 입력해도 남는 설명이다)
- When  "반려", 사유 "계좌번호를 확인할 수 없어요", 메모 "은행 조회 결과 없음"으로 처리한다
- Then  상세의 처리 결과에 반려 사유와 "운영자 메모" "은행 조회 결과 없음"이 보인다

S219 주소로 결과 문구를 만들 수 없다
- When  처리하지 않은 상태로 `/admin/withdrawals?processed=withdrawal-1`이나 `/admin/withdrawals?processed=paid&amount=9999999`에 접속한다
- Then  결과 문구가 없다

S211 운영자 홈 반영
- Given S207을 마친 상태
- When  `/admin`에 접속한다
- Then  "출금 요청" 카드가 2건이다

## 6. 운영자 홈 연결 (R36)
운영자 홈의 "오래 기다린 요청"에서 출금 항목은 그 요청의 상세로 간다. "최근 요청"의 행은 원래 링크가 없어서 그대로 둔다.

S212
- When  `/admin`의 "오래 기다린 요청"에서 "이지우" 출금 항목을 누른다
- Then  URL이 `/admin/withdrawals/withdrawal-1`이다

## 7. 로딩과 접근성 (R37)
제목과 탭은 목록 데이터를 기다리지 않고, 처리 양식은 키보드와 보조 기술로 쓸 수 있으며, 좁은 화면에서 가로로 넘치지 않는다.

S213 로딩
- Given `demo-data=slow` (1.5초 지연)
- When  `/admin/withdrawals`에 접속한다 (응답 시작 직후)
- Then  운영자 하위 탭과 "처리 대기"·"처리 완료" 탭이 보이고 목록 스켈레톤이 보인다
- Then  응답 뒤 스켈레톤이 없다

S214 처리 양식
- When  `/admin/withdrawals/withdrawal-1`에 접속한다
- Then  "처리 결과" 이름의 라디오 그룹에 "지급 완료", "반려"가 있다
- When  "반려"를 고른다 (S284)
- Then  "반려 사유" 이름의 라디오 그룹에 사유 3개가 있다
- Then  메모 입력창의 이름이 "반려 메모"이고 최대 80자다

S284 반려 사유와 메모는 반려를 골라야 보인다
- When  `/admin/withdrawals/withdrawal-1`에 접속한다
- Then  "반려 사유"와 "반려 메모"가 보이지 않는다 ("지급 완료"를 골라도 같다)
- When  "반려"를 고른다
- Then  "반려 사유"와 "반려 메모"가 보인다
- When  사유 "기타"와 메모를 적고 "지급 완료"로 바꿨다가 다시 "반려"를 고른다
- Then  고른 사유와 메모가 그대로 있다
- 참고: 모집 취소 처리 양식(S279)과 같이 상태 대신 CSS `:has()`로 숨긴다. 서버에서 그린 첫 화면부터 맞고, 자바스크립트가 없어도 반려할 수 있다.

S215 좁은 화면
- Given 너비 375px
- When  `/admin/withdrawals`와 `/admin/withdrawals/withdrawal-1`에 접속한다
- Then  페이지에 가로 스크롤이 없다 (하위 탭 줄 안의 스크롤만 예외)
- Then  계좌번호가 한 줄에 보인다

S281 긴 메모
- Given `withdrawal-1`을 "기타"와 공백 없는 80자 메모로, `withdrawal-2`를 "계좌번호를 확인할 수 없어요"와 긴 URL 메모로 반려했다
- When  너비 375px에서 두 요청의 상세에 접속한다
- Then  처리 결과에 메모 전체가 보이고, 페이지에 가로 스크롤이 없다 (메모는 칸 안에서 줄을 바꾼다)

## 8. 구조 (R38)
권한은 페이지, 데이터 함수, 처리 Server Action에서 각각 확인한다. 처리 양식은 막혀도 입력이 남도록 `useActionState`를 쓰는 클라이언트 컴포넌트다(크레딧 출금 신청 폼과 같은 방식). 그 밖에는 "계좌번호 복사" 버튼만 클라이언트 컴포넌트로 둔다.

S216
- When  `grep -L "requireAdmin" src/app/admin/withdrawals/page.tsx src/app/admin/withdrawals/*/page.tsx`
- Then  결과가 없다
- When  `grep -n "assertAdmin" src/features/admin/actions.ts`
- Then  출금 처리 Server Action 안에서도 부른다
- When  `grep -rl '"use client"' src/app/admin src/features/admin`
- Then  운영자 폴더의 목록이 `frontend-admin-reports.md` S445과 같다 (`CopyAccountButton`과 `RequestReviewForm`이 출금 요청 관리에서 쓰는 것이다)

## 기존 시나리오·문서 변경
- `frontend-admin-home.md`
  - S415 다음 확인: "오래 기다린 요청"의 출금 항목 링크가 목록이 아니라 상세로 바뀐다(S212).
  - S411: 탭 이동 확인을 "출금 요청" 대신 아직 준비 중인 "모집 취소"로 바꾼다.
  - 출금 목업을 이 문서와 함께 쓰도록 계좌 정보와 처리 완료 2건을 더한다. 처리 대기 3건과 순서는 그대로라 S412~S415은 바뀌지 않는다.
- `e2e/links.spec.ts` S26: 운영자 하위 페이지 확인을 "준비 중 화면이 나온다"에서 "운영자에게 열리고 제목이 있다"로 바꾼다. 회원 관리(PR #13)·모집 취소 PR도 이 부분을 똑같이 고쳐서, 어느 PR이 먼저 병합돼도 충돌하지 않는다. (처음에는 준비 중 목록에서 `/admin/withdrawals`만 뺐는데, 세 PR이 같은 줄을 다르게 고쳐 충돌했다.)
- `docs/page-urls.md`: 관리자 섹션에 `/admin/withdrawals?tab=done`(처리 완료 탭)과 `/admin/withdrawals/:withdrawalKey`(출금 요청 상세)를 "후보"로 추가한다.
- `frontend-admin-reports.md` "번호 사용 현황": S191~S219를 이 문서로 적는다.
- `frontend-admin-reports.md` S427: 테스트가 `noindex` 메타 개수가 아니라 있는지만 보게 바꾼다(S195와 같은 이유).

## 데모 데이터와 가정
- 출금 목업은 처리 대기 3건(운영자 홈과 같음)과 처리 완료 2건이다. 시각은 접속 시각 기준으로 계산한다.

  | 키 | 닉네임 | 회원 이름 | 금액 | 은행 | 계좌번호 | 예금주 | 상태 |
  | --- | --- | --- | --- | --- | --- | --- | --- |
  | withdrawal-1 | 이지우 | 이지우 | 5,000 | 국민 | 123456789012 | 이지우 | 대기, 60시간 전 |
  | withdrawal-2 | 김민준 | 김민준 | 8,200 | 신한 | 110234567890 | 김민지 | 대기, 26시간 전 |
  | withdrawal-3 | 한서윤 | 한서윤 | 12,000 | 토스뱅크 | 100012345678 | 한서윤 | 대기, 3시간 전 |
  | withdrawal-4 | 박도현 | 박도현 | 3,000 | 카카오뱅크 | 3333015678 | 박도현 | 지급 완료, 2일 전 |
  | withdrawal-5 | 최유나 | 최유나 | 2,000 | 우리 | 1002345670 | 최유나 | 반려(계좌번호를 확인할 수 없어요), 4일 전 |

- 은행 목록과 계좌번호 형식(숫자 10~14자리)은 테스터 출금 신청과 같다.
- 회원 이름은 가입 정보의 실명이라고 가정한다. 예금주와 다르면 "예금주 확인 필요"로 알리기만 하고, 처리를 막지는 않는다.
- 반려 사유는 3개다: "예금주 이름이 회원 정보와 달라요", "계좌번호를 확인할 수 없어요", "기타". "기타"는 메모가 필요하고 메모가 회원에게 보이는 사유가 된다.
- 반려 메모는 사유와 관계없이 운영자 기록으로 남긴다. 회원에게는 "기타"일 때만 사유로 보인다. 지급 완료에는 메모를 받지 않는다.
- 처리 양식은 `useActionState`로 제출한다. 막히면 Server Action이 오류만 돌려주고 페이지를 옮기지 않아서, 고른 값과 메모가 화면에 그대로 남는다(S210, S217). React가 폼 액션 뒤 입력을 자동으로 비우지 않도록 `onSubmit`에서 직접 제출한다. 처리되면 Server Action이 목록으로 보낸다.
- 반려 메모는 80자까지다. 신고 처리 메모와 같은 이유(쿠키 4096바이트 한도, 한글 9바이트 인코딩)로 저장 전에 인코딩한 길이를 확인하고, 넘으면 처리하지 않고 알린다(S210).
- 처리 결과는 쿠키 `demo-admin-withdrawals`에 요청 키·결과·사유·메모·처리 시각으로 저장한다. 테스터 쪽 쿠키 `demo-withdrawals-<role>`과 이름이 겹치지 않게 한다(`demo-withdrawals-admin`은 운영자 본인의 신청 기록 자리다). 실제 API를 붙이면 이 쿠키를 쓰지 않는다.
- "지급 완료"는 운영자가 서비스 밖에서 송금을 마쳤다는 기록이다. 실제 송금·계좌 실명 확인은 하지 않는다.
- 처리 결과는 다시 바꿀 수 없다. 송금 실패 뒤 되돌리기는 미정이다.
- 처리를 마치면 목록으로 돌아가 결과 문구를 한 번 보여 준다(`?processed=<요청 키>`). 문구는 주소의 값이 아니라 그 요청의 처리 기록과 금액 데이터로 만든다. 처리되지 않은 요청이면 문구를 보이지 않는다(S219). 실제 API를 붙여도 금액은 서버 데이터에서 가져온다.
- 처리 완료 뒤에는 계좌번호를 끝 4자리만 보여 준다. 송금이 끝난 뒤에는 전체 번호가 필요 없다.
- 금액은 "원"으로 적는다. 1크레딧 = 1원이고, 운영자에게는 송금할 금액이 중요하다.

## 범위 밖
- 테스터 화면과의 연동(결정 필요 참고)
- 여러 건 한꺼번에 처리, 송금 파일 내려받기
- 회원별 출금 이력 (회원 관리 `/admin/users`에서 다룬다)
- 기간·금액 필터, 검색, 페이지 나누기
- 처리 결과 알림(회원에게 알리기)
- 처리 취소, 송금 실패 처리
- 실제 송금, 계좌 실명 확인, 서버 API 인가와 저장

## 작업 순서
1. 데이터 계층 — S196~S199, S201~S203의 데이터
   - 파일: `src/features/admin/types.ts` (`WithdrawalRequest`에 은행·계좌·예금주·회원 이름, 처리 결과 타입), `mock.ts` (처리 완료 2건), `api.ts` (`getWithdrawals(tab)`, `getWithdrawal(key)`, 쿠키 기록 합치기)
   - 확인: `npx tsc --noEmit`, `npm run test:e2e -- admin-home.spec.ts` (운영자 홈 그대로 통과)
2. 목록 — S196~S200, S213
   - 파일: `src/app/admin/withdrawals/page.tsx`, `src/features/admin/components/WithdrawalList.tsx`
   - 재사용: 신고 목록의 탭·행·스켈레톤 모양
3. 상세 — S195, S201~S204
   - 파일: `src/app/admin/withdrawals/[withdrawalKey]/page.tsx`, `src/features/admin/components/WithdrawalDetail.tsx`, `CopyAccountButton.tsx` (`"use client"`)
4. 처리 — S205~S211
   - 파일: `src/features/admin/actions.ts` (출금 처리 Server Action, `assertAdmin`, 크기 확인), `src/features/admin/components/WithdrawalForm.tsx` (출금 문구만 정하고 `RequestReviewForm`을 쓴다. 2026-11-01에 합쳤다)
5. 운영자 홈 연결과 정리 — S212, S216, 기존 문서 변경
   - 파일: 운영자 홈 링크, `e2e/links.spec.ts`, `docs/page-urls.md`, `docs/frontend-admin-home.md`, `docs/frontend-admin-reports.md`
6. 테스트 — S191~S219 (S216 제외), S281, S284
   - 파일: `e2e/admin-withdrawals.spec.ts`
   - 확인: `npm run test:e2e && npm run lint && npm run build`, 개발 서버에서 1440px·375px 눈으로 확인

## 브랜치·커밋
- 브랜치: `feature/admin-withdrawals` (`origin/develop`에서 분기, upstream 해제함)
- 커밋 메시지: README의 `유형: 변경 내용` 규칙. 기능·테스트·문서는 나눈다(AGENTS.md).

## 변경 이력
- 2026-10-30
  - 출금 요청 관리 요구사항을 처음 정리했다.
  - S번호를 S191부터 매겼다. 열린 PR까지 포함해 가장 큰 번호가 크레딧 문서의 S381이다.
  - 목록·상세·처리를 구현했다. S191~S215는 `e2e/admin-withdrawals.spec.ts`에 있고 S216은 grep으로 확인한다.
  - 구현하며 고친 점: 반려 "기타"에 메모가 없을 때는 `?error=note`로 돌아온다(S210의 `error=memo`는 저장 공간 부족). 운영자 홈 "최근 요청"은 행에 링크가 없어 S212에서 뺐다. 신고 목록 탭은 `StatusTabs`로 빼서 함께 쓴다. 처리 기록 쿠키 읽기·쓰기는 `reviews.ts` 하나에서 신고·출금 모두 다룬다.
  - 리뷰 반영:
    - S195·S427이 반복 실행에서 대부분 실패했다(20번 중 4번 통과). 없는 주소에서 Next가 `noindex` 메타를 두 번 넣기도 해서, 개수 대신 있는지만 보게 고쳤다. 15번 반복해 모두 통과한다.
    - 사유가 "기타"가 아니면 메모가 말없이 버려지던 것을 운영자 메모로 남기게 했다. 안내는 placeholder 대신 늘 보이는 설명으로 옮겼다(S218).
    - 막혀서 돌아오면 고른 값과 메모가 사라지던 것을 다시 채우게 했다(S210, S217).
    - 결과 문구의 금액을 주소에서 읽던 것을 요청 키로 데이터에서 꺼내게 했다(S207, S219).
    - 신고·출금이 함께 쓰는 탭 타입 이름을 `ReportTab`에서 `ListTab`으로 바꿨다.
    - 신고 처리 양식도 막혀서 돌아오면 고른 값이 사라진다. 이번에는 출금만 고쳤다.
  - 막혔을 때 값을 주소(`decision`, `reason`, `memo`)에 실어 다시 채우던 방식을 `useActionState` 클라이언트 양식으로 바꿨다. 주소에 실으면 메모가 방문 기록에 남기 때문이다. `?error=` 주소는 더 쓰지 않는다. `"use client"` 파일은 13개가 된다(S216).
- 2026-10-31
  - 반려 사유와 메모를 "반려"를 골랐을 때만 보이게 했다(S284). 모집 취소 처리 양식(PR #14, S279)에 먼저 넣은 방식을 출금에도 맞췄다. S214·S218은 "반려"를 고른 뒤 확인하게 고쳤다. 번호는 PR #14의 S283 다음이다.
  - PR 리뷰 반영: 공백 없는 긴 메모나 URL로 반려하면 처리 결과의 반려 사유·운영자 메모가 375px 화면에서 385px 넘쳤다. 상세의 정보 칸(`Info`)에 `overflow-wrap: anywhere`(`wrap-anywhere`)를 줘서 칸 안에서 줄을 바꾼다. `break-words`는 격자 칸의 최소 너비 계산에 반영되지 않아 1열 격자에서 그대로 넘친다. 신고 상세의 처리 메모도 같아서 함께 고쳤다(`frontend-admin-reports.md` S447). 번호는 회원 관리(PR #13)의 S280 다음이다.
  - 상세가 `params`를 Suspense 밖에서 읽어 개발 서버에 `instant-shell-url-data` 진단이 떴다. 회원 관리 PR #13 리뷰에서 같은 구조를 지적받아 신고 상세와 함께 고쳤다(`frontend-admin-reports.md` 변경 이력). 개발 서버에서 진단이 사라지고 없는 주소에서 맞춤 404가 나오는 것(S195)을 확인했다.
- 2026-11-01
  - 처리 양식을 모집 취소와 함께 `RequestReviewForm`(`"use client"`, `useActionState`) 하나로 합쳤다. `WithdrawalForm`은 문구·사유·서버 함수만 넘기는 서버 컴포넌트가 됐다. 화면과 동작은 그대로라 기존 시나리오로 확인한다.
  - 목록 탭 `StatusTabs`를 회원 필터와 함께 쓰는 `LinkTabs`로 바꿨다. 탭이 많으면 탭 줄만 가로로 스크롤한다.
  - `"use client"` 확인을 `src` 전체 개수에서 운영자 폴더(`src/app/admin`, `src/features/admin`) 목록으로 바꿨다. 다른 페이지 작업마다 전체 개수가 바뀌어 문서가 계속 틀려졌다.

## 참고
- 운영자 홈: `docs/frontend-admin-home.md` (R15 접근 권한, S412 처리 대기 카드, S415 오래 기다린 요청)
- 신고·제재 관리: `docs/frontend-admin-reports.md` (목록·상세·처리 구조, 쿠키 크기 확인 S446)
- 테스터 출금 신청: `docs/2026-10-30-frontend-credits.md` (PR #9, 출금 상태·은행 목록·계좌 형식·반려 사유 표시)
- 기획 근거: `README.md` (구독과 크레딧, 운영 원칙)
- 디자인 시스템: `frontend/DESIGN.md`, `docs/design-tokens.html`
- Next.js 16 문서(`frontend/node_modules/next/dist/docs/01-app/`): `02-guides/authentication.md`(Server Action 권한 확인), `02-guides/forms.md`
