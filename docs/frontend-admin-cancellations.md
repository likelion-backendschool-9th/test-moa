# 프론트엔드 모집 취소 요청 관리 (`/admin/cancellations`)

모집 취소 요청 관리 페이지가 지켜야 하는 요구사항(R)과 시나리오(S)를 모은 문서다. 번호는 다른 문서와 겹치지 않게 R47, S250부터 매긴다(열린 PR #13 회원 관리가 R46, S249까지 쓴다). S번호는 `frontend/e2e/admin-cancellations.spec.ts`의 테스트 이름과 1:1로 맞춘다. 테스트를 추가하거나 바꾸면 이 문서도 함께 고친다.

## 한눈에
- 목적: 개발자가 자기가 등록한 모집 건을 테스트 시작 전에 취소하겠다고 요청하면, 운영자가 사유와 참여가 확정된 테스터, 테스트가 이미 시작됐는지를 확인하고 승인하거나 반려한다.
- 스택: 홈과 같다. 실행 방법은 `frontend/README.md`를 본다.
- 화면 구성:
  1. 목록 `/admin/cancellations`: 운영자 하위 탭(모집 취소가 현재 탭), "처리 대기"·"처리 완료" 탭, 요청 목록
  2. 상세 `/admin/cancellations/:cancellationKey`: 요청 내용, 모집 건 현황(모집 상태·확정 테스터·제출된 피드백), 처리 양식 또는 처리 결과
- 처리 결과는 두 가지다.
  - 승인: 모집 건을 취소한다. 확정된 테스터의 참여도 함께 취소된다. 보상은 테스트를 완료해야 지급되는데 테스트 전에 취소하므로 지급할 보상이 없다.
  - 반려: 모집 건은 그대로 진행한다. 사유를 골라야 하고, 사유는 개발자에게 보인다.
- 디자인: 신고·제재 관리, 출금 요청 관리와 같은 토큰과 `components/ui`만 쓴다. 주 버튼은 상세의 "처리하기" 하나다. 결과 배지에는 강조색을 쓰지 않는다. 규칙은 `frontend/DESIGN.md`와 `docs/design-tokens.html`에 있다.
- 데이터: 목업이다. 처리 결과는 시연용 쿠키 `demo-admin-cancellations`에 저장해 같은 브라우저 안에서만 유지된다. 운영자 홈의 모집 취소 데이터와 같은 출처를 쓴다.
- 정한 것 (README에는 관리자 항목에 "모집 취소 요청 관리"만 있어서 2026-10-31에 정했다. 나중에 바뀌거나 더해질 수 있다):
  1. 요청자: 모집 건을 등록한 개발자다.
  2. 운영자 처리: 모든 취소 요청을 운영자가 처리한다. 확정 테스터가 0명인 요청은 목록에 "확정 테스터 없음"으로 표시해 빨리 처리할 수 있게 한다.
  3. 보상: 테스터의 보상은 테스트를 완료해야 지급된다. 모집 취소는 테스트를 시작하기 전에 요청하는 것으로 보고, 승인해도 지급할 보상이 없다. 테스트가 이미 시작됐다면(제출된 피드백이 있으면) 상세에서 알리고, 운영자는 "이미 테스트가 진행 중이에요"로 반려할 수 있다. 테스트 중 취소를 허용할지, 그때 보상을 어떻게 할지는 나중에 정한다.
  4. 반려 사유: 아래 3개로 시작한다.
- 개발자 쪽 취소 요청 화면: 개발자 프로젝트 문서(`frontend-projects.md`)가 "모집 건 수정·취소"를 범위 밖으로 두어서, 개발자가 요청을 보내는 화면이 아직 없다. 개발자 페이지 담당자와 이야기해 맞춘다. 그때까지 이 페이지는 운영자 목업 요청만 쓰고, 개발자 쪽과 연결하지 않는다.
  - 맞출 때 정할 것: 모집 건 상세(`/my/projects/:projectKey/recruitments/:recruitmentKey`)의 "모집 취소 요청" 버튼과 사유 입력, 요청 뒤 상태 표시(처리 대기·승인·반려와 반려 사유), 요청 데이터 모양(이 문서의 목업 필드: 모집 건 키, 요청 사유, 요청 시각, 확정 테스터 수, 제출된 피드백 수).
- 페이지 URL: `docs/page-urls.md`

이 아래 시나리오는 따로 적지 않으면 `demo-role=admin`이다.

## 1. 테마 (R47)
다른 운영자 관리 페이지와 같은 토큰을 쓰고, 강조색은 주 버튼 하나에만 쓴다.

S250 결과 배지
- Given `prefers-color-scheme: light` (`dark`도 같다)
- When  `/admin/cancellations?tab=done`에 접속한다
- Then  "승인"·"반려" 배지의 글씨색이 `--accent`가 아니다

S251 주 버튼 하나
- When  `/admin/cancellations/cancellation-1`에 접속한다
- Then  강조색 바탕의 버튼은 "처리하기" 하나뿐이다

## 2. 접근 권한 (R48)
목록과 상세 모두 운영자에게만 보인다. 규칙은 운영자 홈 R15와 같다.

S252 일반 회원
- Given `demo-role=developer`
- When  `/admin/cancellations/cancellation-1`에 접속한다
- Then  "운영자만 볼 수 있는 페이지예요"가 보이고 요청 내용은 없다

S253 비로그인
- Given `demo-role=guest`
- When  `/admin/cancellations/cancellation-1`에 접속한다
- Then  URL이 `/login?next=%2Fadmin%2Fcancellations%2Fcancellation-1`이다

S254 없는 요청
- When  `/admin/cancellations/nope`에 접속한다
- Then  맞춤 404("찾는 페이지가 없어요")가 보이고 `noindex`가 붙는다
- 참고: 신고 상세 S118과 같은 이유로 응답 상태는 200이다. `noindex` 메타는 두 번 들어가기도 해서 테스트는 개수가 아니라 있는지만 본다.

## 3. 목록 (R49)
처리 대기는 오래 기다린 순서로, 처리 완료는 최근 처리 순서로 보여 준다. 탭 상태는 URL(`tab`)에 남는다.

S255 처리 대기
- When  `/admin/cancellations`에 접속한다
- Then  "처리 대기" 탭에 `aria-current="page"`가 있고 요청 2건이 요청이 오래된 순서("레시피핏", "동네 러닝 크루")다
- Then  각 행에 모집 건 이름, 개발자 닉네임, 확정 테스터 수, 경과 시간이 있다

S256 확정 테스터 표시
- Then  "레시피핏" 행에 "확정 테스터 3명"이 있다
- Then  "동네 러닝 크루" 행에 "확정 테스터 없음"이 있다

S257 처리 완료
- When  "처리 완료" 탭을 누른다
- Then  URL에 `tab=done`이 붙고 요청 2건이 최근 처리 순서("모아플랜", "반려식물 일지")다
- Then  각 행에 결과("승인" 또는 "반려")와 처리 시각이 있다

S258 없음
- Given `demo-data=empty`
- Then  "처리할 모집 취소 요청이 없어요"가 보인다

S259 상세로 이동
- When  처리 대기 첫 행을 누른다
- Then  URL이 `/admin/cancellations/cancellation-1`이다

## 4. 상세 (R50)
판단에 필요한 정보를 한 화면에 모은다. 승인하면 무엇이 함께 취소되는지, 테스트가 이미 시작됐는지 보여 준다.

S260 요청 내용
- When  `/admin/cancellations/cancellation-1`에 접속한다
- Then  모집 건 "레시피핏", 개발자 "박도현", 요청 사유 "서비스 출시 일정이 미뤄져서 테스트를 할 수 없어요", 요청 시각이 보인다
- Then  "모집 글 보기" 링크가 `/recruitments/recipefit`을 가리킨다

S261 모집 건 현황
- Then  "모집 건 현황"에 모집 상태 "모집 중", 확정 테스터 3명, 제출된 피드백 0건이 보인다
- Then  "승인하면 확정 테스터 3명의 참여도 함께 취소돼요. 테스트 전이라 지급할 보상은 없어요"가 보인다

S278 테스트가 이미 시작됐을 때
- When  `/admin/cancellations/cancellation-4`에 접속한다 (처리 완료, 제출된 피드백 1건)
- Then  "모집 건 현황"에 "이미 테스트가 시작됐어요"와 제출된 피드백 1건이 보인다

S262 확정 테스터가 없을 때
- When  `/admin/cancellations/cancellation-2`에 접속한다
- Then  "확정된 테스터가 없어요"가 보이고 "참여도 함께 취소돼요" 문구는 없다

S263 목록으로
- Then  "목록으로" 링크가 `/admin/cancellations`를 가리킨다

## 5. 처리 (R51)
운영자는 결과를 골라 처리하고, 처리한 요청은 처리 대기에서 처리 완료로 옮겨진다. 처리 결과는 다시 바꿀 수 없다. 막히면 페이지를 옮기지 않고 그 자리에서 오류를 보여 주고, 고른 값과 메모가 남는다(출금 요청 처리와 같은 `useActionState` 양식).

S264 결과를 골라야 처리된다
- When  결과를 고르지 않고 "처리하기"를 누른다
- Then  처리되지 않고 "처리 결과를 골라 주세요"가 보이고, 주소는 그대로다

S265 반려는 사유가 있어야 한다
- When  "반려"를 고르고 사유 없이 "처리하기"를 누른다
- Then  "반려 사유를 골라 주세요"가 보이고 "반려"가 골라진 채로 있다
- When  사유 "기타"를 고르고 메모 없이 "처리하기"를 누른다
- Then  "개발자에게 보여 줄 사유를 적어 주세요"가 보인다

S266 승인
- When  `/admin/cancellations/cancellation-1`에서 "승인"을 고르고 "처리하기"를 누른다
- Then  URL이 `/admin/cancellations?processed=cancellation-1`이고 "레시피핏 모집을 취소했어요. 확정 테스터 3명의 참여도 함께 취소돼요"가 보인다
- Then  처리 대기가 1건이다
- When  "처리 완료" 탭을 누른다
- Then  "레시피핏" 행이 맨 위에 있고 "승인"이 있다

S267 확정 테스터가 없는 요청 승인
- When  `/admin/cancellations/cancellation-2`에서 "승인"으로 처리한다
- Then  "동네 러닝 크루 모집을 취소했어요."만 보이고 확정 테스터 문구는 없다

S268 반려
- When  `/admin/cancellations/cancellation-1`에서 "반려", 사유 "이미 테스트가 진행 중이에요"를 고르고 "처리하기"를 누른다
- Then  "취소 요청을 반려했어요. 모집은 그대로 진행돼요"가 보인다
- Then  처리 완료 탭의 "레시피핏" 행에 "반려"가 있다

S269 처리한 요청의 상세
- Given S268을 마친 상태
- When  `/admin/cancellations/cancellation-1`에 접속한다
- Then  처리 양식은 없고 결과 "반려", 사유, 처리 시각이 보인다

S270 주소로 결과 문구를 만들 수 없다
- When  처리하지 않은 상태로 `/admin/cancellations?processed=cancellation-1`에 접속한다
- Then  결과 문구가 없다

S271 저장 공간이 모자랄 때
- Given 시연용 처리 기록 쿠키가 한도 가까이 차 있다
- When  "반려", 사유 "기타", 메모 80자로 처리한다
- Then  "시연용 저장 공간이 모자라 처리하지 못했어요"가 보이고, 적은 메모가 그대로 남는다
- Then  요청은 처리 대기에 그대로 있다

S272 운영자 홈 반영
- Given S266을 마친 상태
- When  `/admin`에 접속한다
- Then  "모집 취소 요청" 카드가 1건이다

## 6. 운영자 홈 연결 (R52)
운영자 홈의 "오래 기다린 요청"에서 모집 취소 항목은 그 요청의 상세로 간다.

S273
- When  `/admin`의 "오래 기다린 요청"에서 "레시피핏" 모집 취소 항목을 누른다
- Then  URL이 `/admin/cancellations/cancellation-1`이다

## 7. 로딩과 접근성 (R53)
제목과 탭은 목록 데이터를 기다리지 않고, 처리 양식은 키보드와 보조 기술로 쓸 수 있으며, 좁은 화면에서 가로로 넘치지 않는다.

S274 로딩
- Given `demo-data=slow` (1.5초 지연)
- When  `/admin/cancellations`에 접속한다 (응답 시작 직후)
- Then  운영자 하위 탭과 "처리 대기"·"처리 완료" 탭이 보이고 목록 스켈레톤이 보인다
- Then  응답 뒤 스켈레톤이 없다

S275 처리 양식
- When  `/admin/cancellations/cancellation-1`에 접속한다
- Then  "처리 결과" 라디오 그룹에 "승인", "반려"가 있고, "반려 사유" 라디오 그룹에 사유 3개가 있다
- Then  메모 입력창의 이름이 "반려 메모"이고 최대 80자이며, 늘 보이는 안내가 붙어 있다

S276 좁은 화면
- Given 너비 375px
- When  `/admin/cancellations`와 `/admin/cancellations/cancellation-1`에 접속한다
- Then  페이지에 가로 스크롤이 없다 (하위 탭 줄 안의 스크롤만 예외)

## 8. 구조 (R54)
권한은 페이지, 데이터 함수, 처리 Server Action에서 각각 확인한다. 처리 양식은 막혀도 입력이 남도록 `useActionState`를 쓰는 클라이언트 컴포넌트다.

S277
- When  `grep -L "requireAdmin" src/app/admin/cancellations/page.tsx src/app/admin/cancellations/*/page.tsx`
- Then  결과가 없다
- When  `grep -n "assertAdmin" src/features/admin/actions.ts`
- Then  모집 취소 처리 Server Action 안에서도 부른다
- When  `grep -rl '"use client"' src`
- Then  PR #12까지의 13개에 `CancellationForm` 1개만 더해져 14개다

## 기존 시나리오·문서 변경
- `frontend-admin-home.md`
  - S93: PR #12가 탭 이동 확인을 "모집 취소" 탭과 "준비 중" 화면으로 바꿔 두었다. 모집 취소도 준비 중이 아니게 되므로 "준비 중" 대신 `h1` "모집 취소 요청 관리"를 본다.
  - S97 다음 확인: "오래 기다린 요청"의 모집 취소 항목 링크가 목록이 아니라 상세로 바뀐다(S273).
  - 모집 취소 목업에 요청 사유·모집 건 키를 더하고 처리 완료 2건을 더한다. 처리 대기 2건과 순서는 그대로라 S94~S97은 바뀌지 않는다.
- `e2e/links.spec.ts` S26: `/admin/cancellations`를 운영자 준비 중 목록에서 뺀다.
- `docs/page-urls.md`: 관리자 섹션에 `/admin/cancellations?tab=done`(처리 완료 탭)과 `/admin/cancellations/:cancellationKey`(모집 취소 요청 상세)를 "후보"로 추가한다.
- `frontend-admin-reports.md` "번호 사용 현황": S250~S278을 이 문서로 적는다(PR #12·#13 병합 뒤).
- `frontend/README.md` 시연용 쿠키 표에 `demo-admin-cancellations`를 더한다.

## 데모 데이터와 가정
- 모집 취소 목업은 처리 대기 2건(운영자 홈과 같음)과 처리 완료 2건이다. 시각은 접속 시각 기준으로 계산한다.

  | 키 | 모집 건 | 개발자 | 확정 테스터 | 요청 사유 | 상태 |
  | --- | --- | --- | --- | --- | --- |
  | cancellation-1 | 레시피핏 (`recipefit`, 구독) | 박도현 | 3명 (모집 중, 피드백 0건) | 서비스 출시 일정이 미뤄져서 테스트를 할 수 없어요 | 대기, 40시간 전 |
  | cancellation-2 | 동네 러닝 크루 (`run-crew`) | 최유나 | 0명 | 모집 글에 테스트할 주소를 잘못 적었어요 | 대기, 10시간 전 |
  | cancellation-3 | 모아플랜 (`moaplan`, 구독) | 정하린 | 2명 | 같은 기능을 다시 만들기로 했어요 | 승인, 2일 전 |
  | cancellation-4 | 반려식물 일지 (`plant-diary`) | 박도현 | 2명 (테스트 중, 피드백 1건) | 지원자가 적어서 다시 모집하고 싶어요 | 반려("이미 테스트가 진행 중이에요"), 4일 전 |

- 확정 테스터 수와 제출된 피드백 수는 **요청할 때의 값**을 목업에 적는다. 모집 목업(`recruitment/mock.ts`)의 확정 인원(레시피핏 17명)과는 다르다. 페이지마다 목업을 따로 만들고 있어서, 시연용 모집 건 숫자는 나중에 팀에서 맞춘다(회원 관리 문서의 닉네임 문제와 같다).
- 모집 상태는 요청할 때의 값이다. 제출된 피드백이 1건 이상이면 "테스트 중"으로 보고 "이미 테스트가 시작됐어요"를 보여 준다.
- 반려 사유는 3개다: "이미 테스트가 진행 중이에요", "취소 사유가 부족해요", "기타". "기타"는 메모가 필요하고 메모가 개발자에게 보이는 사유가 된다. 메모는 사유와 관계없이 운영자 기록으로 남긴다(출금 요청 처리와 같다).
- 반려 메모는 80자까지다. 다른 처리 기록과 같은 이유(쿠키 4096바이트 한도)로 저장 전에 크기를 확인하고, 넘으면 처리하지 않고 알린다(S271).
- 처리 결과는 쿠키 `demo-admin-cancellations`에 요청 키·결과·사유·메모·처리 시각으로 저장한다. 실제 API를 붙이면 이 쿠키를 쓰지 않는다.
- "승인"은 모집 취소를 기록만 한다. 실제로 모집 건 상태를 바꾸거나 확정 테스터의 참여를 취소하지는 않는다(모집·참여 화면과 연결하지 않는다).
- 처리를 마치면 목록으로 돌아가 결과 문구를 한 번 보여 준다(`?processed=<요청 키>`). 문구는 주소가 아니라 그 요청의 처리 기록으로 만든다(S270).

## 범위 밖
- 개발자 쪽 취소 요청 화면과 처리 결과 표시 (개발자 페이지 담당자와 맞춘 뒤)
- 테스트 중 취소와 그때의 보상 (나중에 정한다)
- 승인 뒤 모집 건 상태 변경, 확정 테스터 참여 취소, 테스터에게 취소 알림
- 개발자의 반복 취소 제한·제재
- 부분 취소(일부 테스터만 정리), 처리 취소
- 기간·구독 여부 필터, 검색, 페이지 나누기
- 실제 권한 검사(서버 API 인가)와 저장

## 작업 순서
이 브랜치는 PR #12(출금 요청 관리)·#13(회원 관리) 병합 전에 `develop`에서 만들었다. PR #12의 공용 탭(`StatusTabs`·`ListTab`), 처리 기록 쿠키 함수(`reviews.ts`), `useActionState` 처리 양식을 그대로 쓰려고 **PR #12 브랜치(`feature/admin-withdrawals`)를 이 브랜치에 병합하고 구현했다.**
- PR은 base를 `feature/admin-withdrawals`로 연다. 그러면 모집 취소 변경만 보인다.
- 병합 순서: PR #12를 먼저 `develop`에 병합하고, 이 PR의 base를 `develop`으로 바꾼 뒤 병합한다. 이 PR을 먼저 병합하면 출금 코드가 리뷰 전에 함께 들어간다.
- PR #12가 리뷰로 바뀌면 그 내용을 이 브랜치에 다시 병합하고 테스트한다. 공용 코드가 바뀌었으면 바로, 출금에만 해당하면 이 PR 병합 전에만 하면 된다.
- PR #12는 merge commit으로 병합해야 한다. squash로 병합하면 출금 커밋이 이 PR에 다시 보인다.

1. 데이터 계층 — S255~S262, S278의 데이터
   - 파일: `src/features/admin/types.ts` (`CancellationRequest`에 모집 건 키·요청 사유·제출된 피드백 수, 처리 결과 타입), `mock.ts` (처리 완료 2건), `api.ts` (`getCancellations(tab)`, `getCancellation(key)`, 쿠키 기록 합치기)
   - 확인: `npx tsc --noEmit`, `npm run test:e2e -- admin-home.spec.ts` (운영자 홈 그대로 통과)
2. 목록 — S255~S259, S274
3. 상세 — S254, S260~S263, S278
4. 처리 — S264~S272 (Server Action, `useActionState` 양식)
5. 운영자 홈 연결과 정리 — S273, S277, 기존 문서 변경
6. 테스트 — S250~S276, S278
   - 확인: `npm run test:e2e && npm run lint && npm run build`, 개발 서버에서 1440px·375px 눈으로 확인

## 브랜치·커밋
- 브랜치: `feature/admin-cancellations` (`origin/develop`에서 분기, upstream 해제함)
- 커밋 메시지: README의 `유형: 변경 내용` 규칙. 기능·테스트·문서는 나눈다(AGENTS.md).

## 변경 이력
- 2026-10-31
  - 모집 취소 요청 관리 요구사항을 처음 정리했다. README에 규칙이 없어서 요청자, 승인이 필요한 경우, 승인 뒤 보상, 반려 사유, 개발자 쪽 화면을 "결정 필요"로 두고 가정으로 진행한다.
  - 결정: 요청자는 개발자, 모든 요청을 운영자가 처리, 반려 사유 3개로 시작. 보상은 테스트를 완료해야 지급되므로 취소는 테스트 전 요청으로 보고 승인해도 지급할 보상이 없다. 처음에는 "승인하면 확정 테스터에게 안내한 보상을 지급"으로 가정했으나 이에 맞춰 지급할 보상 계산을 빼고, 테스트가 시작됐는지 보여 주는 S278을 더했다. 모두 나중에 바뀌거나 더해질 수 있다.
  - 결정: 개발자 쪽 취소 요청 화면은 개발자 페이지 담당자와 이야기해 맞춘다. 그때까지 운영자 페이지는 목업 요청만 쓴다.
  - PR #12 브랜치를 병합하고 목록·상세·처리를 구현했다. S250~S276, S278은 `e2e/admin-cancellations.spec.ts`에 있고 S277은 grep으로 확인한다.
  - 처리 양식(`CancellationForm`)은 출금 처리 양식(`WithdrawalForm`)과 거의 같다. PR #12가 리뷰 중이라 그 파일을 고치지 않고 따로 만들었다. 두 PR이 병합된 뒤 공용 처리 양식 하나로 합친다.
  - S번호를 S250부터 매겼다. 열린 PR까지 포함해 가장 큰 번호가 회원 관리 문서의 S249다.

## 참고
- 운영자 홈: `docs/frontend-admin-home.md` (R15 접근 권한, S94 처리 대기 카드, S97 오래 기다린 요청)
- 출금 요청 관리: PR #12 `docs/frontend-admin-withdrawals.md` (같은 목록·상세·처리 구조, `useActionState` 양식, 결과 문구를 데이터로 만드는 방식)
- 신고·제재 관리: `docs/frontend-admin-reports.md` (쿠키 크기 확인 S137)
- 개발자 프로젝트: `docs/frontend-projects.md` (모집 건 상태, 모집 건 취소는 범위 밖)
- 모집 목업: `frontend/src/features/recruitment/mock.ts` (모집 건 키, 구독 여부)
- 기획 근거: `README.md` (핵심 이용 흐름의 테스트 완료 뒤 보상 지급, 운영 원칙)
- 디자인 시스템: `frontend/DESIGN.md`, `docs/design-tokens.html`
