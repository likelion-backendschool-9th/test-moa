# 프론트엔드 운영자 홈 (`/admin`)

운영자 홈이 지켜야 하는 요구사항(R)과 시나리오(S)를 모은 문서다. 번호는 처음에 `home.md`에 이어 S83부터 매겼고, 11-02 번호 정리에서 S401~S422가 됐다. S번호는 `frontend/e2e/admin-home.spec.ts`의 테스트 이름과 1:1로 맞춘다. 테스트를 추가하거나 바꾸면 이 문서도 함께 고친다.

시나리오 제목 끝의 태그가 확인 방법이다. `[테스트]`만 e2e 테스트와 1:1이고, `[테스트: 파일 번호]`는 그 테스트가 대신 확인한다. `[명령]`은 명령 한 번, `[직접]`은 사람이 화면을 보고 확인한다. (고침 #56: `docs/test-cleanup.md`)

## 한눈에
- 목적: 운영자가 들어오자마자 처리할 요청이 몇 건이고 무엇부터 봐야 하는지 알게 한다. 통계 대시보드가 아니라 작업 대기열이다. 신고는 테스터의 보상 지급을 멈추므로(README 핵심 흐름 5단계) 가장 먼저 보인다.
- 스택: 홈과 같다. 실행 방법은 `frontend/README.md`를 본다.
- 화면 구성(위에서부터):
  1. 기존 헤더("운영자 페이지" 탭이 현재 탭)
  2. 제목 "운영자 홈"과 하위 탭: 홈, 회원, 신고·제재, 출금 요청
  3. 처리 대기: 신고·출금 요약 카드 2개
  4. 오래 기다린 요청: 두 종류를 합친 순위 패널
  5. 최근 요청: 영역별 최근 3건
- 디자인: 홈과 같은 토큰과 `components/ui`만 쓴다. 강조색은 순위 숫자에만 쓰고, 보상 보류 같은 강조는 굵기로 한다. 규칙은 `frontend/DESIGN.md`와 `docs/design-tokens.html`에 있다.
- 데이터: 목업이다. 홈과 같은 쿠키 `demo-role`, `demo-data`로 상태를 바꾼다.
- 페이지 URL: `docs/page-urls.md`

이 아래 시나리오는 따로 적지 않으면 `demo-role=admin`이고 `/admin`에 접속한 상태다.

## 1. 테마와 글꼴 (R14)
운영자 홈도 홈과 같은 토큰과 글꼴을 쓰고, 라이트·다크는 OS 설정을 따른다. 강조색은 순위 숫자에만 쓰고 면에는 그림자를 넣지 않는다.

S401 라이트 [직접]
- Given `prefers-color-scheme: light`
- Then  `body` 배경이 `rgb(239, 239, 236)`이다
- Then  요약 카드 배경이 `rgb(251, 251, 250)`이고 `box-shadow`가 `none`이다
- Then  "오래 기다린 요청"의 순위 숫자 색이 `rgb(15, 124, 74)`(`--accent` `#0f7c4a`)이다

S402 다크 [직접]
- Given `prefers-color-scheme: dark`
- Then  `body` 배경이 `rgb(0, 0, 0)`이다
- Then  요약 카드 배경이 `rgb(22, 24, 29)`이고 `box-shadow`가 `none`이다
- Then  "오래 기다린 요청"의 순위 숫자 색이 `rgb(18, 147, 87)`(`--accent` `#129357`)이다

S403 글꼴 [직접]
- Then  `h1` "운영자 홈"의 `font-family`가 Wanted Sans로 시작한다

S404 보상 보류 강조 [직접]
- Given `prefers-color-scheme: light` (`dark`도 같다)
- Then  "보상 보류" 숫자 색이 `--accent`가 아니라 `--text`이다
- Then  "보상 보류" 숫자의 굵기가 800이다

## 2. 접근 권한 (R15)
운영자 페이지는 운영자에게만 내용을 보여 주고, 비로그인은 로그인으로, 일반 회원은 안내 화면으로 보낸다. 하위 페이지도 같다.

S405 운영자 [직접]
- Given `demo-role=admin`
- When  `/admin`에 접속한다
- Then  `h1` "운영자 홈"이 보인다
- Then  헤더의 "운영자 페이지" 탭에 `aria-current="page"`가 있다

S406 비로그인 [테스트: pages.spec.ts #56-S2]
- Given `demo-role=guest`
- When  `/admin`에 접속한다
- Then  URL이 `/login?next=%2Fadmin`이다

S407 일반 회원 [테스트]
- Given `demo-role=tester` (`developer`도 같다)
- When  `/admin`에 접속한다
- Then  "운영자만 볼 수 있는 페이지예요"와 "홈으로" 링크가 보인다
- Then  하위 탭과 요약 카드는 없다

S408 하위 페이지의 일반 회원 [테스트: pages.spec.ts #56-S3]
- Given `demo-role=tester`
- When  `/admin/reports`에 접속한다
- Then  S407와 같은 안내 화면이 보인다

S409 하위 페이지의 비로그인 [테스트]
- Given `demo-role=guest`
- When  `/admin/reports`에 접속한다
- Then  URL이 `/login?next=%2Fadmin%2Freports`이다

## 3. 하위 탭 (R16)
하위 탭은 docs/page-urls.md 관리자 섹션 순서를 따르고 현재 탭을 표시한다. 하위 페이지는 아직 "준비 중" 화면이다.

S410 탭 목록 [직접] (고침 #43: 모집 취소 관리 제거)
- Then  탭 4개가 순서대로 있다: 홈 `/admin`, 회원 `/admin/users`, 신고·제재 `/admin/reports`, 출금 요청 `/admin/withdrawals`
- Then  "홈"에 `aria-current="page"`가 있다

S411 탭 이동 [직접] (고침 #43: 모집 취소 관리 제거)
- When  "출금 요청"을 누른다
- Then  URL이 `/admin/withdrawals`이고 그 탭이 현재 탭이다
- Then  `h1` "출금 요청 관리"가 보인다

#43-S1 지운 모집 취소 주소 [테스트]
- Given `demo-role=admin`
- When  `/admin/cancellations` 또는 `/admin/cancellations/cancellation-1`에 접속한다
- Then  HTTP 404와 맞춤 404("찾는 페이지가 없어요")가 보인다

## 4. 처리 대기 (R17)
처리 전 요청 수를 영역별 카드로 보여 주고, 카드를 누르면 해당 관리 페이지로 간다.

S412 카드 내용 [테스트] (고침 #43: 모집 취소 관리 제거)
- Then  "처리 대기" 영역에 카드 2개가 있다: 신고 대기 4(보상 보류 2), 출금 요청 3

S413 카드 링크 [직접] (고침 #43: 모집 취소 관리 제거)
- Then  카드가 차례로 `/admin/reports`, `/admin/withdrawals`를 가리킨다

S414 없음 [직접] (고침 #43: 모집 취소 관리 제거)
- Given `demo-data=empty`
- Then  두 카드 모두 "처리할 요청 없음"이 보인다

## 5. 오래 기다린 요청 (R18)
두 종류 요청을 합쳐 접수가 오래된 순서로 5개 보여 준다. 72시간이 지난 신고는 따로 표시한다. 신고 항목은 그 신고의 상세로(`admin-reports.md` S441), 출금 항목은 출금 목록 모달로(`admin-withdrawals.md` S212) 간다.

S415 순서 [테스트] (고침 #43: 모집 취소 관리 제거)
- Then  목록이 5개이고 접수가 오래된 순서다
- Then  첫 항목은 "72시간 지남" 배지가 붙은 신고다

S416 없음 [직접]
- Given `demo-data=empty`
- Then  "기다리는 요청이 없어요"가 보인다

## 6. 최근 요청 (R19)
영역별 최근 요청을 확인만 하고, 승인·반려 같은 처리는 각 관리 페이지에서 한다. 출금 행은 목록 모달(`/admin/withdrawals?open=`)로 이어진다(`admin-withdrawals.md` #42-S3).

S417 목록 [테스트] (고침 #43: 모집 취소 관리 제거)
- Then  "최근 요청" 영역의 두 열(신고, 출금 요청)에 각각 3건 이하와 "전체 보기" 링크가 있다

S418 처리 버튼 없음 [직접]
- Then  홈에 "승인"·"반려" 버튼이 없다

## 7. 로딩 (R20)
제목과 하위 탭은 목록 데이터를 기다리지 않고, 목록은 같은 모양의 스켈레톤을 먼저 보여 준다.

S419 [직접]
- Given `demo-data=slow` (1.5초 지연)
- When  `/admin`에 접속한다 (응답 시작 직후)
- Then  제목과 하위 탭이 보이고 스켈레톤이 보인다
- Then  응답 뒤 스켈레톤이 없다

## 8. 접근성과 좁은 화면 (R21)
영역은 제목으로 구분해 보조 기술에 알리고, 좁은 화면에서도 페이지가 가로로 넘치지 않는다.

S420 영역 이름 [직접]
- Then  "처리 대기", "오래 기다린 요청", "최근 요청"이 각각 `h2` 제목으로 이름 붙은 `section`이다
- Then  요약 숫자가 낭독기에서 "신고 대기 4건"처럼 읽힌다

S421 좁은 화면 [직접]
- Given 너비 375px
- Then  요약 카드가 1열이다
- Then  페이지에 가로 스크롤이 없다 (하위 탭 줄 안의 스크롤만 예외)

## 9. 구조 (R22)
권한 검사는 layout이 아니라 각 페이지와 데이터 접근 계층(`features/admin/api.ts`)에서 하고, 클라이언트 컴포넌트를 늘리지 않는다. layout은 페이지 이동 때 다시 그려지지 않아서 검사를 맡길 수 없다(Next 문서 `02-guides/authentication.md`). 확인은 grep으로 한다.

S422 [명령]
- When  `ls src/app/admin`
- Then  `layout.tsx`가 없다
- When  `grep -L "requireAdmin" src/app/admin/page.tsx src/app/admin/*/page.tsx`
- Then  결과가 없다 (모든 운영자 페이지가 권한을 확인한다)
- When  `grep -rl '"use client"' src/app/admin src/features/admin`
- Then  운영자 폴더의 목록이 `admin-reports.md` S445과 같다 (운영자 홈은 더하지 않는다)

## 기존 시나리오 변경
- S26: `/admin`은 더 이상 "준비 중"이 아니므로 목록에서 뺀다. 하위 4개 주소는 tester로 열면 안내 화면이 나오므로 `demo-role=admin`으로 따로 확인한다.

## 데모 데이터와 가정
- 요청 목업은 신고 처리 대기 4건(보상 보류 2, 그중 72시간 지남 1)과 처리 완료 2건, 출금 처리 대기 3건과 처리 완료 2건이다. 운영자 홈에는 처리 대기만 보인다. 출금 목업에는 은행·계좌번호·예금주·회원 이름이 있지만 홈에는 보여 주지 않는다. 모집 건 이름은 홈의 모집 목업을 재사용하고, 시각은 접속 시각 기준으로 계산한다.
- 화면 이름은 README·PRODUCT.md를 따라 "운영자"로 쓰고 URL은 `/admin`을 유지한다. docs/page-urls.md의 "관리자"와 맞추는 것은 팀에서 정한다.
- 권한 없는 회원에게는 HTTP 200으로 안내 화면을 보여 준다. 세션을 `Suspense` 안에서 읽어서 응답 상태를 403으로 바꿀 수 없다. 403은 실제 로그인을 붙일 때 `proxy.ts`에서 처리한다.
- "72시간 지남"은 지급 대기 기간을 넘겼다는 표시이고 운영자 처리 기한이 아니다. 운영자 처리 기한은 기획에서 미정이다.
- 회원 지표(가입 수, 제재 중 회원 수)는 넣지 않는다. 통계 대시보드는 기능 후보 4순위다.
- 계좌번호·실명 같은 민감 정보는 홈에 보여 주지 않는다.

## 범위 밖
- 하위 관리 페이지의 실제 내용 (준비 중 화면만 있다)
- 승인·반려 처리, 처리 이력
- 실제 권한 검사(서버 API 인가), 운영자 계정 발급
- 새 요청 실시간 알림, 통계 차트

## 브랜치·커밋
- 브랜치: `feature/admin-home` (`develop`에서 분기)
- 커밋 메시지: README의 `유형: 변경 내용` 규칙

## 변경 이력
- 2026-10-30
  - 운영자 홈 요구사항을 처음 정리했다. 처음에는 화면 세부, 데이터 타입, 파일 계획까지 적었으나 `home.md`와 같은 깊이(요구사항 한 줄과 시나리오)로 줄였다.
  - 권한 검사를 layout이 아니라 페이지와 데이터 접근 계층에서 하기로 했다(R22). 하위 탭의 대기 건수는 로딩 원칙(R20)과 맞지 않아 넣지 않는다.
  - 홈 문서처럼 테마와 글꼴을 첫 장(R14, S401~S404)으로 추가했다. 뒤 번호는 R15~R22, S405~S422로 밀렸다.
  - 신고·제재 관리를 만들면서 신고 목업을 신고 페이지와 함께 쓰게 했다. 처리한 신고는 처리 대기에서 빠지고, 오래 기다린 요청의 신고 항목은 상세로 간다(`admin-reports.md`).
  - 출금 요청 관리를 만들면서 출금 목업을 출금 페이지와 함께 쓰게 했다. 처리한 출금은 처리 대기에서 빠지고, 오래 기다린 요청의 출금 항목은 상세로 간다. S411의 탭 이동 확인은 아직 준비 중인 "모집 취소"로 바꿨다(`admin-withdrawals.md`).
  - 모집 취소 요청 관리를 만들면서 모집 취소 목업을 모집 취소 페이지와 함께 쓰게 했다. 처리한 요청은 처리 대기에서 빠지고, 오래 기다린 요청의 모집 취소 항목은 상세로 간다. S411은 "준비 중" 대신 그 페이지 제목을 본다(`admin-cancellations.md`).
  - 운영자 홈과 하위 페이지 4개를 구현했다. S401~S421은 `e2e/admin-home.spec.ts`, S26 변경은 `e2e/links.spec.ts`에 있고 S422는 grep으로 확인한다.
- 2026-11-01
  - `"use client"` 확인을 `src` 전체 개수에서 운영자 폴더(`src/app/admin`, `src/features/admin`) 목록으로 바꿨다. 다른 페이지 작업마다 전체 개수가 바뀌어 문서가 계속 틀려졌다.
- 2026-11-02
  - 시나리오 번호를 정리했다(옛 S83~S104 → 새 S401~S422). 다른 문서와 겹치던 번호라 새 구간으로 옮겼고, 대응표는 `scenario-numbers.md` "시나리오 번호(S)"에 있다.
- 2026-11-03
  - 출금 요청을 목록 모달로 바꾸며, 오래 기다린 요청·최근 요청의 출금 링크를 `/admin/withdrawals?open=`으로 맞췄다.
- 2026-11-04
  - 모집 취소 요청 관리를 제거했다. 하위 탭·처리 대기 카드·최근 요청 열을 신고·출금 2종으로 맞추고, 지운 `/admin/cancellations` 주소는 `#43-S1`로 맞춤 404를 확인한다.

## 참고
- 제품 기록: `frontend/PRODUCT.md`
- 디자인 시스템: `frontend/DESIGN.md`, `docs/design-tokens.html`
- 홈 문서: `docs/frontend/home.md` (R10 로딩, R13 구조, S7·S9·S26)
- 기획 근거: `README.md` (핵심 흐름, 운영 원칙, 크레딧)
- Next.js 16 문서(`frontend/node_modules/next/dist/docs/01-app/`): `02-guides/authentication.md`, `02-guides/authentication-with-cache-components.md`, `02-guides/streaming.md`
