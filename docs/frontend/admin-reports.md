# 프론트엔드 신고·제재 관리 (`/admin/reports`)

신고·제재 관리 페이지가 지켜야 하는 요구사항(R)과 시나리오(S)를 모은 문서다. 번호는 다른 문서와 겹치지 않게 R23, S423부터 매긴다(11-02 번호 정리 전에는 S114부터였다). S번호는 `frontend/e2e/admin-reports.spec.ts`의 테스트 이름과 1:1로 맞춘다. 테스트를 추가하거나 바꾸면 이 문서도 함께 고친다.

## 한눈에
- 목적: 운영자가 신고를 검토해 기각하거나 인정한다. 피드백 신고는 테스터의 크레딧 지급을 멈추고 있으므로(README 핵심 흐름 5단계), 처리하면 보류가 풀리거나 제재 이력에 반영된다.
- 스택: 홈과 같다. 실행 방법은 `frontend/README.md`를 본다.
- 화면 구성:
  1. 목록 `/admin/reports`: 운영자 하위 탭(신고·제재가 현재 탭), "검토 대기"·"처리 완료" 탭, 신고 대상 종류 필터(전체·피드백·모집 글·회원), 신고 목록
  2. 상세 `/admin/reports/:reportKey`: 신고 내용, 대상(피드백 원문·모집 글·회원), 처리 양식 또는 처리 결과
- 처리 결과는 두 가지다.
  - 기각: 문제가 없다고 본다. 보상 보류가 풀린다.
  - 인정: 문제가 있다고 본다. 신고 대상을 제재 이력에 반영하고, 피드백 신고면 그 보상을 지급하지 않는다.
- 디자인: 운영자 홈과 같은 토큰과 `components/ui`만 쓴다. 주 버튼은 상세의 "처리하기" 하나다. 결과 배지에는 강조색을 쓰지 않는다. 규칙은 `frontend/DESIGN.md`와 `docs/design-tokens.html`에 있다.
- 데이터: 목업이다. 처리 결과는 시연용 쿠키 `demo-reports`에 저장해서 같은 브라우저 안에서만 유지된다. 운영자 홈의 신고 데이터와 같은 출처를 쓴다.
- 결정 필요: 제재 단계(경고·정지 등), 운영자 처리 기한. 정해질 때까지 "제재 이력에 반영"까지만 하고 기한은 표시하지 않는다.
- 페이지 URL: `docs/page-urls.md`

이 아래 시나리오는 따로 적지 않으면 `demo-role=admin`이다.

## 1. 테마 (R23)
운영자 홈과 같은 토큰을 쓰고, 강조색은 주 버튼 하나에만 쓴다.

S423 결과 배지
- Given `prefers-color-scheme: light` (`dark`도 같다)
- When  `/admin/reports?tab=done`에 접속한다
- Then  "기각"·"인정" 배지의 글씨색이 `--accent`가 아니다

S424 주 버튼 하나
- When  `/admin/reports/report-1`에 접속한다
- Then  강조색 바탕의 버튼은 "처리하기" 하나뿐이다

## 2. 접근 권한 (R24)
목록과 상세 모두 운영자에게만 보인다. 규칙은 운영자 홈 R15와 같다.

S425 일반 회원
- Given `demo-role=tester`
- When  `/admin/reports/report-1`에 접속한다
- Then  "운영자만 볼 수 있는 페이지예요"가 보이고 신고 내용은 없다

S426 비로그인
- Given `demo-role=guest`
- When  `/admin/reports/report-1`에 접속한다
- Then  URL이 `/login?next=%2Fadmin%2Freports%2Freport-1`이다

S427 없는 신고
- When  `/admin/reports/nope`에 접속한다
- Then  맞춤 404("찾는 페이지가 없어요")가 보이고 `noindex`가 붙는다
- 참고(10-31): 스트리밍 순서에 따라 Next가 `noindex` 메타를 두 번 넣기도 한다. 그래서 테스트는 개수가 아니라 있는지만 본다.
- 참고: 응답 상태는 테스트하지 않는다. 키 검사가 Suspense 안에 있어서 개발 서버(`next dev`)에서는 200, 빌드한 서버(`next start`)에서는 404로 나온다(2026-10-31 확인). 상태가 꼭 필요하면 `proxy.ts`에서 거른다.

## 3. 목록 (R25)
검토 대기는 오래 기다린 순서로, 처리 완료는 최근 처리 순서로 보여 준다. 탭 상태는 URL(`tab`), 대상 종류 필터는 URL(`target`)에 남고, 둘은 함께 쓸 수 있다. 기본값(검토 대기, 전체)은 주소에 쓰지 않는다. 목록에서 상세로 갈 때도 같은 값을 상세 주소에 붙여(`/admin/reports/report-1?target=feedback`), "목록으로"와 처리한 뒤에 보던 목록으로 돌아온다. 상세의 `tab`·`target`은 돌아갈 곳만 정하고 상세 내용은 바꾸지 않는다. 상태 탭 아래 필터 줄은 상태 탭과 같은 모양이고, 화면 읽기 프로그램은 "신고 대상"으로 구분해 읽는다. 피드백 원문은 목록에 보여 주지 않는다.

S428 검토 대기
- When  `/admin/reports`에 접속한다
- Then  "검토 대기" 탭에 `aria-current="page"`가 있고 신고 4건이 접수가 오래된 순서다
- Then  각 행에 대상 종류, 모집 건 이름, 사유, 경과 시간이 있다
- Then  첫 행에 "보상 보류"와 "72시간 지남"이 있다

S429 처리 완료
- When  "처리 완료" 탭을 누른다
- Then  URL에 `tab=done`이 붙고 신고 2건이 최근 처리 순서다
- Then  각 행에 결과("기각" 또는 "인정")와 처리 시각이 있다

S430 없음
- Given `demo-data=empty`
- Then  "검토할 신고가 없어요"가 보인다

S528 대상 종류 필터
- When  `/admin/reports`에서 "신고 대상" 필터의 "피드백"·"모집 글"·"회원"을 차례로 누른다
- Then  URL이 `?target=feedback`·`?target=recruitment`·`?target=user`가 되고, 누른 필터에 `aria-current="page"`가 있다
- Then  검토 대기 신고가 피드백 2건(회의록 정리, 북로그), 모집 글 1건(포트폴리오 빌더), 회원 1건(가계부 노트)이다
- Then  "전체"를 누르면 URL이 `/admin/reports`로 돌아오고 4건이 보인다

S529 탭과 필터 함께
- When  `/admin/reports?target=feedback`에서 "처리 완료" 탭을 누른다
- Then  URL이 `?tab=done&target=feedback`이고 2건이 보인다 (주소는 값의 순서가 아니라 값으로 확인한다)
- When  "회원" 필터를 누른다
- Then  URL이 `?tab=done&target=user`이고 "'회원' 신고 중에는 처리한 신고가 없어요"가 보인다
- When  "검토 대기" 탭을 누른다
- Then  URL이 `?target=user`이고 1건이 보인다 (필터가 남는다)

S530 알 수 없는 대상 값
- When  `/admin/reports?target=nope`에 접속한다
- Then  "전체"에 `aria-current="page"`가 있고 신고 4건이 보인다

S531 필터 결과가 없을 때
- Given 피드백 신고 두 건(report-1, report-2)을 기각해 처리했다
- When  `/admin/reports?target=feedback`에 접속한다
- Then  "'피드백' 신고 중에는 검토할 신고가 없어요"가 보인다

S532 상세를 거쳐도 보던 탭과 필터가 남는다
- When  `/admin/reports?target=feedback`에서 첫 행을 누른다
- Then  URL이 `/admin/reports/report-1?target=feedback`이다
- When  "목록으로"를 누른다
- Then  URL이 `?target=feedback`이고 피드백 신고 2건이 보인다
- When  첫 행을 눌러 "기각"으로 처리한다
- Then  `?target=feedback&processed=dismissed&held=1`로 돌아와 결과 문구가 보이고 피드백 신고 1건이 남는다
- When  `/admin/reports?tab=done&target=feedback`에서 행을 눌러 "목록으로"를 누른다
- Then  URL이 `?tab=done&target=feedback`이다

S431 상세로 이동
- When  첫 행을 누른다
- Then  URL이 `/admin/reports/report-1`이다

## 4. 상세 (R26)
신고 내용과 대상을 보여 준다. 피드백 원문은 신고 검토에 필요하므로 상세에서만 보여 준다(README 운영 원칙).

S432 피드백 신고
- When  `/admin/reports/report-1`에 접속한다
- Then  신고 사유, 신고한 사람, 대상 테스터, 모집 건 이름, 접수 시각이 보인다
- Then  "보상 보류 중"과 제출된 피드백 원문이 보인다

S433 모집 글 신고
- When  `/admin/reports/report-3`에 접속한다
- Then  피드백 원문은 없고 모집 글 링크(`/recruitments/:slug`)가 있다

S434 회원 신고
- When  `/admin/reports/report-4`에 접속한다
- Then  대상 회원 닉네임이 보이고 피드백 원문은 없다

S435 목록으로
- Then  "목록으로" 링크가 `/admin/reports`를 가리킨다

## 5. 처리 (R27)
운영자는 결과를 골라 처리하고, 처리한 신고는 검토 대기에서 처리 완료로 옮겨진다. 처리 결과는 다시 바꿀 수 없다.

S436 결과를 골라야 처리된다
- When  결과를 고르지 않고 "처리하기"를 누른다
- Then  처리되지 않고 "처리 결과를 골라 주세요"가 보인다

S437 기각
- When  `/admin/reports/report-1`에서 "기각"을 고르고 "처리하기"를 누른다
- Then  URL이 `/admin/reports`이고 "신고를 기각했어요. 보류된 보상이 지급돼요"가 보인다
- Then  검토 대기가 3건이다
- When  "처리 완료" 탭을 누른다
- Then  "회의록 정리" 행에 "기각"이 있다
- When  보상 보류가 없는 `/admin/reports/report-3`에서 "기각"을 고르고 "처리하기"를 누른다
- Then  "신고를 기각했어요."만 보이고 보상 지급 문구는 없다

S438 인정
- When  `/admin/reports/report-2`에서 "인정"을 고르고 메모를 적고 "처리하기"를 누른다
- Then  "신고를 인정했어요. 제재 이력에 반영돼요"가 보인다
- Then  처리 완료 탭의 "북로그" 행에 "인정"이 있다

S439 처리한 신고의 상세
- Given S438를 마친 상태
- When  `/admin/reports/report-2`에 접속한다
- Then  처리 양식은 없고 결과 "인정", 메모, 처리 시각이 보인다

S446 저장 공간이 모자랄 때
- Given 시연용 처리 기록 쿠키가 한도 가까이 차 있다
- When  `/admin/reports/report-1`에서 "기각"을 고르고 메모 80자를 적어 "처리하기"를 누른다
- Then  URL이 `/admin/reports/report-1?error=memo`이고 "시연용 저장 공간이 모자라 처리하지 못했어요"가 보인다
- Then  report-1은 검토 대기에 그대로 있다

S440 운영자 홈 반영
- Given S437을 마친 상태
- When  `/admin`에 접속한다
- Then  "신고 대기" 카드가 3건, "보상 보류" 1건이다

## 6. 운영자 홈 연결 (R28)
운영자 홈의 "오래 기다린 요청"에서 신고 항목은 그 신고의 상세로 간다.

S441
- When  `/admin`의 "오래 기다린 요청"에서 1번 "회의록 정리"를 누른다
- Then  URL이 `/admin/reports/report-1`이다

## 7. 로딩과 접근성 (R29)
제목과 탭은 목록 데이터를 기다리지 않고, 처리 양식은 키보드와 보조 기술로 쓸 수 있으며, 좁은 화면에서 가로로 넘치지 않는다.

S442 로딩
- Given `demo-data=slow` (1.5초 지연)
- When  `/admin/reports`에 접속한다 (응답 시작 직후)
- Then  운영자 하위 탭과 "검토 대기"·"처리 완료" 탭이 보이고 목록 스켈레톤이 보인다
- Then  응답 뒤 스켈레톤이 없다

S443 처리 양식
- When  `/admin/reports/report-1`에 접속한다
- Then  "처리 결과" 이름의 라디오 그룹에 "기각", "인정"이 있다
- Then  메모 입력창의 이름이 "처리 메모"이고 최대 80자다

S444 좁은 화면
- Given 너비 375px
- When  `/admin/reports`와 `/admin/reports/report-1`에 접속한다
- Then  페이지에 가로 스크롤이 없다 (하위 탭 줄 안의 스크롤만 예외)

S447 긴 메모
- Given `report-1`을 공백 없는 80자 메모로 기각했다
- When  너비 375px에서 `/admin/reports/report-1`에 접속한다
- Then  처리 결과에 메모 전체가 보이고, 페이지에 가로 스크롤이 없다

## 8. 구조 (R30)
권한은 페이지, 데이터 함수, 처리 Server Action에서 각각 확인한다. Server Action은 화면 밖에서도 불릴 수 있어서 따로 확인해야 한다(Next 문서 `02-guides/authentication.md`). 처리 양식은 서버 양식으로 만들어 `"use client"`를 늘리지 않는다.

S445
- When  `grep -L "requireAdmin" src/app/admin/reports/page.tsx src/app/admin/reports/*/page.tsx`
- Then  결과가 없다
- When  `grep -n "assertAdmin" src/features/admin/actions.ts`
- Then  처리 Server Action 안에서 부른다
- When  `grep -rl '"use client"' src/app/admin src/features/admin`
- Then  `CopyAccountButton`(계좌번호 복사), `RequestReviewForm`(출금·모집 취소 처리 양식) 2개만 나온다 (신고 처리 양식은 서버 양식이라 더하지 않는다)
- 참고(2026-11-01): 처음에는 `src` 전체의 `"use client"` 개수를 적었는데, 다른 페이지가 클라이언트 컴포넌트를 더할 때마다 틀려져서 운영자 폴더만 센다.
- 참고: 운영자 문서 다섯 개 중 목록은 이 시나리오에만 적고, 나머지 문서는 여기를 가리킨다. 운영자 쪽에 클라이언트 컴포넌트가 늘면 여기만 고친다.

## 번호 사용 현황
번호 표, 번호 규칙, 옛 번호 → 새 번호 대응표는 문서마다 따로 두지 않고 [시나리오·요구사항 번호](scenario-numbers.md)에 모았다. 이 문서의 번호는 S423~S447·S528~S532(2026-11-02 번호 정리, 11-03 필터), R23~R30이고 새로 더하는 번호는 `scenario-numbers.md`에서 확인한다.

## 기존 시나리오·문서 변경
- `admin-home.md`
  - S97 다음 확인: "오래 기다린 요청"의 신고 항목 링크가 목록이 아니라 상세로 바뀐다(S441).
  - 신고 목업을 이 문서와 함께 쓰도록 옮긴다. 신고 4건과 순서는 그대로라 S94~S97은 바뀌지 않는다.
- `e2e/links.spec.ts` S26: `/admin/reports`를 운영자 준비 중 목록에서 뺀다.
- `docs/page-urls.md`: 관리자 섹션에 `/admin/reports?tab=done`(처리 완료 탭)과 `/admin/reports/:reportKey`(신고 상세)를 "후보"로 추가한다.
- `docs/frontend/home.md` S26: Given 목록에 아직 `/admin`이 남아 있다. 운영자 홈이 생기면서 빠져야 했으므로 함께 고친다.

## 데모 데이터와 가정
- 신고 목업은 검토 대기 4건(운영자 홈과 같음)과 처리 완료 2건(기각 1, 인정 1)이다. 피드백 신고에는 시연용 피드백 원문을 넣는다. 시각은 접속 시각 기준으로 계산한다.
- 처리 결과는 쿠키 `demo-reports`에 신고 키·결과·메모·처리 시각으로 저장한다. 다른 브라우저나 쿠키를 지우면 처음 상태로 돌아간다. 실제 API를 붙이면 이 쿠키를 쓰지 않는다.
- 처리 메모는 80자까지다. Next는 쿠키 값을 `encodeURIComponent`로 인코딩해서 한글 한 글자가 9바이트가 되고, 브라우저는 4096바이트를 넘는 쿠키를 알리지 않고 버린다. 80자면 검토 대기 4건을 모두 처리해도 약 3,400바이트다. 그래도 저장 전에 인코딩한 길이를 확인하고, 넘으면 처리하지 않고 알린다(S446).
- 인정한 피드백 신고는 그 피드백의 보상을 지급하지 않는다고 가정한다. README는 "제재 이력에 반영"까지만 정하고 있다.
- 제재 단계(경고·참여 정지 등)와 운영자 처리 기한은 기획에서 미정이다. 그래서 인정은 "제재 이력에 반영"으로만 표시한다.
- 처리 결과는 다시 바꿀 수 없다. 이의 제기·재검토는 미정이다.
- 신고 대상은 피드백·모집 글·회원 셋으로 본다. 피드백은 개발자가, 모집 글은 테스터가, 회원은 누구나 신고할 수 있다고 보고 화면에는 "신고한 사람"으로 적는다.
- 처리를 마치면 목록으로 돌아가 결과 문구를 한 번 보여 준다(`?processed=dismissed|upheld`).

## 범위 밖
- 제재 이력 화면, 회원별 제재 조회 (회원 관리 `/admin/users`에서 다룬다. `admin-users.md`. 상세의 대상 테스터·대상 회원 닉네임은 회원 상세 링크다(S244))
- 기간 필터, 보상 보류 필터, 처리 결과(기각·인정) 필터, 신고 사유 필터(사유가 정해진 목록이 아니다), 검색, 페이지 나누기
- 처리 결과 알림(신고자·대상자에게 알리기)
- 이의 제기·재검토, 처리 취소
- 실제 권한 검사(서버 API 인가)와 저장

## 브랜치·커밋
- 브랜치: `feature/admin-reports` (`develop`에서 분기)
- 커밋 메시지: README의 `유형: 변경 내용` 규칙. 기능·테스트·문서는 나눈다(AGENTS.md).

## 변경 이력
- 2026-10-30
  - 신고·제재 관리 요구사항을 처음 정리했다.
  - 리뷰 반영: 메모 500자 상한에서 쿠키가 한도를 넘어 저장되지 않는데도 성공 문구가 나오던 문제를 고쳤다(상한 80자, 저장 전 크기 확인, S446 추가). 보상 보류가 없던 신고를 기각하면 지급 문구를 빼도록 S437을 고쳤다.
  - 목록·상세·처리를 구현했다. S423~S444는 `e2e/admin-reports.spec.ts`에 있고 S445은 grep으로 확인한다. 없는 신고 주소(S427)는 404 상태 대신 맞춤 404 화면과 `noindex`로 바꿨다(응답 상태를 바꿀 수 없어서).
  - S번호를 처음에는 S114부터 매겼다. 운영자 홈(S83~S104)과 마이페이지(S83~S113) 문서의 번호가 겹쳐 있어서, 두 문서 모두와 겹치지 않는 번호로 시작했다. 11-02 번호 정리로 S423~S447이 됐다.
- 2026-10-31
  - 상세가 `params`를 Suspense 밖에서 읽어, 목록에서 상세로 이동할 때 개발 서버에 `instant-shell-url-data` 진단이 떴다(회원 관리 PR #13 리뷰에서 같은 구조를 지적받아 함께 고쳤다). `generateStaticParams`로 키를 알려 둬도 `params`는 주소마다 달라서 Suspense 안에서 읽어야 한다(Next 문서 `02-guides/optimizing-prefetching.md`). 페이지는 `params`를 그대로 넘기고 Suspense 안에서 키를 읽고 검사한다. S427 참고의 "응답 상태는 200"을 실제로 확인한 값으로 고쳤다.
  - 공백 없는 긴 처리 메모가 375px 화면에서 넘쳤다. 출금 요청 관리 PR #12 리뷰에서 같은 문제를 지적받아, 상세의 정보 칸에 `wrap-anywhere`를 줘서 함께 고쳤다(S447, `admin-withdrawals.md` S281).
- 2026-11-01
  - "번호 사용 현황"에 운영자 하위 페이지 문서(출금 요청·회원·모집 취소)와 리뷰 반영 번호(S280~S284)를 더했다. 세 PR(#12~#14)이 같은 표를 고치면 충돌해서 병합 뒤로 미뤄 둔 일이다.
  - `"use client"` 확인을 `src` 전체 개수에서 운영자 폴더(`src/app/admin`, `src/features/admin`) 목록으로 바꿨다. 다른 페이지 작업마다 전체 개수가 바뀌어 문서가 계속 틀려졌다.
  - 운영자 폴더 목록은 S445에만 적고, 다른 운영자 문서 네 개는 S445을 가리키게 했다. 같은 문장이 다섯 곳에 있으면 하나만 고쳐 어긋나기 쉽다.
- 2026-11-02
  - 시나리오 번호를 문서끼리 겹치지 않게 모두 정리했다. 헤더 S317~S322를 S341~S346으로, 로그인 S335를 S347로 옮긴 데 이어, 오래된 겹침(S83~S158, S191~S211)도 크레딧·구독·운영자 홈·신고·참여 테스트·개발자 프로젝트 문서를 S348~S526으로 옮겨 없앴다. "번호 사용 현황"을 문서별 번호 구간표와 옛 번호 → 새 번호 대응표로 다시 썼다.
  - 요구사항 번호(R)도 같은 방식으로 정리했다. R1부터 따로 쓰던 아홉 개 문서를 R113~R195로 옮기고, 문서별 구간표와 대응표를 "요구사항 번호(R)"에 적었다.
  - 번호 표와 규칙, 대응표를 이 문서에서 빼서 `scenario-numbers.md`로 모았다. 기능 문서마다 표를 두면 번호를 쓰는 PR마다 같은 표를 고쳐 충돌해서다.

- 2026-11-02
  - 목록에 신고 대상 종류 필터(전체·피드백·모집 글·회원)를 더했다. 주소는 `?tab=done&target=feedback`처럼 상태 탭과 함께 쓴다. 보상 보류·처리 결과 필터는 이번에 하지 않았다.
  - 리뷰 반영: 상세를 거치면 필터가 풀리던 문제를 고쳤다(S532). 목록 → 상세 → 처리 → 목록으로 탭과 필터가 이어진다. 빈 문구는 "'피드백' 신고 중에는 …"으로 바꿨다. 주소 확인은 값의 순서에 기대지 않게 파싱해서 본다. 처리 결과 문구 주소는 바뀌지 않는다(`processed`, `held`).
  - 대상 종류 필터 시나리오는 임시 번호 S532~S536이었고, 11-03에 `develop` 병합하며 S528~S531로 확정했다.

## 참고
- 운영자 홈: `docs/frontend/admin-home.md` (R15 접근 권한, R22 구조, S97 오래 기다린 요청)
- 기획 근거: `README.md` (핵심 흐름 5단계, 운영 원칙), `frontend/PRODUCT.md`
- 디자인 시스템: `frontend/DESIGN.md`, `docs/design-tokens.html`
- Next.js 16 문서(`frontend/node_modules/next/dist/docs/01-app/`): `02-guides/authentication.md`(Server Action 권한 확인), `02-guides/forms.md`
