# 내 참여 목록·요약·마감 일정 API (#117)

테스터의 참여 테스트 화면(`/my/participations`)이 쓰는 API. 탭별 참여 목록과 탭별 개수, 한 줄 요약(제출할 피드백 수, 지급 대기 크레딧), 마감 캘린더와 마감 임박 목록을 준다. 화면은 [참여 테스트](../../frontend/project/participations.md) R182~R191이고, 도메인 전체에서 정한 것은 [README.md](README.md)에 있다.

시나리오 제목 끝의 태그가 확인 방법이다. `[테스트]`는 백엔드 테스트와 1:1이다(`@DisplayName("#117-S…")`).

## 이슈 #117 확인

| 이슈 항목 | 시나리오 |
| --- | --- |
| 1 지원한 / 참여 중인 / 참여했던 테스트 탭과 탭별 개수 | #117-S1, #117-S2 |
| 2 각 행의 상태와 상태에 맞는 날짜 | #117-S1 |
| 3 한 줄 요약으로 제출할 피드백 수와 지급 대기 크레딧 | #117-S2 |
| 4 마감 캘린더와 마감 임박 목록에 제출 전 테스트가 마감 순으로 | #117-S3 |
| 5 비로그인은 401 | #117-S4 |

## 1. 목록·요약·마감 일정 (#117-R1)

| 동작 | API | 로그인 | 성공 | 프론트 함수 |
| --- | --- | --- | --- | --- |
| 탭별 내 참여 | `GET /api/v1/tester/participations?tab=ongoing` | 필요 | 200 | `getParticipations` |
| 탭별 개수와 요약 | `GET /api/v1/tester/participations/summary` | 필요 | 200 | `getParticipationCounts`, `getParticipationSummary` |
| 마감 일정 | `GET /api/v1/tester/participations/deadlines` | 필요 | 200 | `getUpcomingDeadlines` |

- 상세·제출(#118)과 같은 `controller.tester.ParticipationController`에 둔다
- 자기 참가만 본다. 참가가 없으면 빈 배열이고 요약은 모두 0이다

### 목록 행
`id`(참가 id, 상세 주소의 key), `status`, `keyDate`(상태에 맞는 날짜, 아래 표), `appliedAt`, `confirmedAt`, `submittedAt`, `payoutAt`, `earnedCredits`, `reward`, `recruitment`(상세와 같은 모양: `id`, `title`, `description`, `projectName`, `projectImageUrl`, `status`, `selectionMode`, `softwareType`, `subscription`, `recruitDeadline`, `submitDeadline`)

- 값의 뜻은 [내 참여 상세](feedback-submit.md#상세-응답)와 같다. 상태도 같은 계산(`ParticipationStatuses`)을 쓴다
- 테스트 항목, 제출한 피드백, 접속 링크는 목록에 주지 않는다. 상세에서 본다

### 탭과 정렬
`tab`은 `applied`, `ongoing`, `history` 중 하나다. 비우면 `ongoing`(프론트 `DEFAULT_TAB`)이고, 다른 값이면 400 `INVALID_INPUT`(`error.fields.tab` "탭을 확인해 주세요")이다.

| 탭 | 상태(이 순서가 할 일 순서) | 정렬 |
| --- | --- | --- |
| `applied` 지원한 | `selectionPending`, `notSelected` | 상태 순서 → 날짜 가까운 순 |
| `ongoing` 참여 중인 | `beforeSubmit`, `payoutPending`, `underReview` | 상태 순서 → 날짜 가까운 순 |
| `history` 참여했던 | `paid`, `incomplete`, `excluded`, `cancelled` | 날짜 최근 순 |

행에 보이는 날짜는 응답의 `keyDate`이고 정렬도 이 값으로 한다. 기준은 프론트 `keyDateOf`와 같고, 날짜가 같으면 참가 id 순이다. 프론트가 가진 값만으로는 지급 완료·보상 제외·참여 취소의 날짜를 알 수 없어 서버가 정해서 준다(고침 #117: 리뷰에서 참여 취소 날짜가 응답에 없다고 지적받음)

| 상태 | 날짜 |
| --- | --- |
| 선정 대기, 미선정 | 모집 마감 |
| 제출 전, 기한 내 미제출 | 제출 마감 |
| 지급 대기 | 지급 예정(제출 + 72시간) |
| 운영자 검토 중 | 제출 시각 |
| 지급 완료 | 제출 + 72시간(가정 2) |
| 보상 제외 | 제출 시각(가정 2) |
| 참여 취소 | 모집 취소 시각, 없으면 지원 시각 |

### 요약
`counts`(`applied`, `ongoing`, `history`: 탭별 개수, 프론트 `ParticipationCounts`), `feedbackToSubmit`(제출 전 참여 수), `payoutPendingCredits`(지급 대기 참여의 `reward` 합)

개수와 요약은 화면에서 함께 쓰여 한 번에 준다.

### 마감 일정
제출 전(`beforeSubmit`) 참여만, 제출 마감이 가까운 순서로 준다(같으면 참가 id 순). 기간으로 자르지 않는다(화면 R184). 행 모양은 목록과 같다.

#117-S1 탭별 목록과 정렬 [테스트]
- Given 한 테스터의 선정 대기 2(모집 마감 3일 뒤, 5일 뒤), 미선정 1, 제출 전 2(제출 마감 4일 뒤, 9일 뒤), 지급 대기 1, 검토 중 1, 지급 완료 1, 미제출 1, 보상 제외 1, 참여 취소 1. 다른 테스터의 참가 1
- Then  지원한 탭은 선정 대기(가까운 마감부터) → 미선정 순이다
- Then  참여 중 탭은 제출 전(가까운 마감부터) → 지급 대기 → 검토 중 순이다
- Then  참여했던 탭은 지급 완료 → 참여 취소 → 보상 제외 → 미제출로 날짜 최근 순이고, 참여 취소가 여기에 있다
- Then  행마다 `keyDate`가 위 표의 날짜다. 참여 취소는 지원 시각이 아니라 모집 취소 시각이다
- Then  행에 상태, 보상 1000, 모집글 제목·프로젝트 이름·제출 마감이 있고, 지급 대기의 `payoutAt`은 제출 + 72시간, 지급 완료의 `earnedCredits`는 1000이다. 접속 링크와 피드백은 없다
- Then  다른 테스터의 참가는 어느 탭에도 없고, 탭을 비우면 참여 중 탭과 같다

#117-S2 요약 [테스트]
- Given S1과 같은 참가
- Then  개수는 지원한 3, 참여 중 4, 참여했던 4이고, 제출할 피드백 2, 지급 대기 크레딧 1000이다(검토 중은 더하지 않는다)

#117-S3 마감 일정 [테스트]
- Given S1과 같은 참가
- Then  제출 전 참여 2건만 제출 마감이 가까운 순서로 온다

#117-S4 빈 목록, 없는 탭, 비로그인 [테스트]
- Then  참가가 없는 회원은 목록·마감 일정이 빈 배열이고 요약은 모두 0이다
- Then  없는 탭(`done`)은 400 `INVALID_INPUT`이고 `error.fields.tab`이 있다
- Then  토큰이 없으면 세 API 모두 401이다

## 범위 밖
- 프론트 연결(`features/participation/api.ts`의 함수 본문 바꾸기). 이때 프론트 상태와 탭에 `cancelled`를 더한다
- 지급 완료일(`paidAt`)과 검토 완료일(`reviewedAt`). 저장하는 컬럼이 없다([#118 범위 밖](feedback-submit.md#범위-밖))
- 페이지 나누기. 한 테스터의 참여 수가 많지 않다고 보고 탭 전체를 준다

## 가정
1. 참여 취소는 프론트에 없는 상태라 끝난 참여와 함께 참여했던 탭에 둔다
2. 지급일과 검토 완료일을 저장하지 않아서, 지급 완료는 자동 지급 시각(제출 + 72시간), 보상 제외는 제출 시각으로 정렬한다. 운영자가 늦게 지급하거나 검토하면 실제 날짜와 다를 수 있다
3. 참여 목록은 탭마다 한 번에 모두 준다. 참가와 피드백, 소프트웨어 유형을 한 번씩 읽어 참가 수만큼 쿼리가 늘지 않는다. 요약은 상태와 보상만 계산하고 소프트웨어 유형과 목록 행은 만들지 않는다
