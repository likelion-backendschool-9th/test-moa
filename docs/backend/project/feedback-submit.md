# 내 참여 상세와 항목별 피드백 제출 API (#118)

테스터가 내 참여 상세에서 진행 상황, 테스트 정보, 테스트 항목을 보고, 테스트 항목별 피드백과 기타 의견을 한 번에 제출하는 API. 화면은 [참여 테스트](../../frontend/project/participations.md) R192~R195와 #90-R1이고, 도메인 전체에서 정한 것은 [README.md](README.md)에 있다.

시나리오 제목 끝의 태그가 확인 방법이다. `[테스트]`는 백엔드 테스트와 1:1이다(`@DisplayName("#118-S…")`).

## 이슈 #118 확인

| 이슈 항목 | 시나리오 |
| --- | --- |
| 1 내 참여 상세에서 진행 상황, 테스트 정보, 테스트 항목을 본다 | #118-S1, #118-S6 |
| 2 확정된 테스터가 제출 마감 전에 항목별 피드백과 기타 의견을 한 번에 제출, 모든 행에 같은 제출 시각 | #118-S2 |
| 3 필수 항목이 비었거나, 칸마다 500자를 넘거나, 아무것도 적지 않았으면 저장되지 않음 | #118-S3 |
| 4 이미 제출했거나, 확정 테스터가 아니거나, 마감이 지났으면 저장되지 않음 | #118-S4, #118-S7 |
| 5 제출한 뒤 상세에서 항목별 피드백을 다시 보고, 상태는 지급 대기 | #118-S2 |
| (권한) 다른 회원의 참가, 비로그인 | #118-S5 |

## 1. 내 참여 상세와 피드백 제출 (#118-R1)

| 동작 | API | 로그인 | 성공 |
| --- | --- | --- | --- |
| 내 참여 상세 | `GET /api/v1/tester/participations/{registerId}` | 필요 | 200 |
| 항목별 피드백 제출 | `POST /api/v1/tester/participations/{registerId}/feedbacks` | 필요 | 201 |

- 주소 변수는 참가(`registers`) id다. 프론트 `/testers/recruitments/:participationKey`의 key 자리에 같은 id를 넣는다
- 테스터 기능이라 `controller.tester.ParticipationController`에 둔다([README 정한 것 15](README.md#정한-것))
- 다른 회원의 참가와 없는 참가는 404다. 비로그인은 401이다

### 상세 응답
`id`, `status`, `appliedAt`, `confirmedAt`, `submittedAt`, `payoutAt`, `earnedCredits`, `reward`, `recruitment`(`id`, `title`, `description`, `projectName`, `projectImageUrl`, `status`, `selectionMode`, `softwareType`, `subscription`, `recruitDeadline`, `submitDeadline`), `accessUrl`, `testItems`(`id`, `title`, `description`, `required`, 저장 순서), `feedbacks`(`testItemId`, `content`, 기타 의견은 `testItemId`가 null)

- `accessUrl`(테스트 접속 링크)은 확정된 참가에만 준다. 대기·미선정·참여 취소는 null이다
- `reward`는 확정한 참가면 고정한 보상(기본 + 추가), 확정 전이면 지금 기준 금액([README 정한 것 14](README.md#정한-것))이다
- `payoutAt`은 지급 대기일 때 제출 시각 + 72시간이다(README 핵심 흐름). `earnedCredits`는 지급 완료일 때만 보상액이고 나머지는 0이다

### 참여 상태
저장하지 않고 참가 상태, 피드백 상태, 마감일로 계산한다(`ParticipationStatuses`, #117 목록과 같은 계산). 이름은 프론트 `ParticipationStatus`와 같다.

| 상태 | 조건 |
| --- | --- |
| `selectionPending` 선정 대기 | 지원(`APPLIED`)이고 모집 마감 전 |
| `notSelected` 미선정 | 거절(`REJECTED`), 또는 모집 마감까지 대기(확정·거절은 모집 마감 전에만 한다, #115) |
| `beforeSubmit` 제출 전 | 확정, 피드백 없음, 제출 마감 전 |
| `incomplete` 기한 내 미제출 | 확정, 피드백 없음, 제출 마감 뒤 |
| `payoutPending` 지급 대기 | 확정, 피드백이 모두 제출(`SUBMITTED`)이거나 일부 지급 |
| `underReview` 운영자 검토 중 | 피드백 중 하나라도 신고됨(`REPORTED`). 한 건만 신고돼도 참가 전체를 보류한다(#66) |
| `paid` 지급 완료 | 피드백이 모두 지급(`REWARDED`) |
| `excluded` 보상 제외 | 피드백 중 하나라도 보상 제외(`EXCLUDED`) |
| `cancelled` 참여 취소 | 참여 취소(`CANCELLED`). **프론트 상태에 아직 없다.** 화면을 연결할 때 프론트에 더한다 |

### 제출
본문: `{"items": [{"testItemId": 1, "content": "…"}], "etc": "…"}`

- 확정된 참가가 제출 마감 전에 한 번만 낸다. 모집 마감 전이어도 확정됐으면(선착순) 낼 수 있다
- 필수 항목은 비울 수 없다. 선택 항목과 기타 의견은 비우면 저장하지 않는다. 앞뒤 공백은 지우고, 공백만 적은 칸은 빈 칸이다
- 칸마다 500자까지다(요청 값 검사). 이 모집의 항목이 아니거나 같은 항목을 두 번 보내면 400이다
- 모든 행에 같은 제출 시각을 넣는다([#89-S18](entities.md)). 제출하면 상태가 지급 대기가 된다
- 참가 행을 잠가(`PESSIMISTIC_WRITE`) 두 번 눌러도 한 번만 저장된다
- 응답은 제출 뒤의 상세다

| 상황 | 상태 | `error.code` |
| --- | --- | --- |
| 필수 항목이 빔, 아무것도 적지 않음 | 400 | `INVALID_INPUT`, `error.fields`의 `testItems.{항목 id}`에 "피드백을 적어 주세요"(아무것도 없으면 첫 칸, 항목이 없으면 `etc`) |
| 500자를 넘음 | 400 | `INVALID_INPUT`, `error.fields`의 `items[n].content` 또는 `etc` |
| 이 모집의 항목이 아님, 같은 항목을 두 번 | 400 | `INVALID_INPUT`, `error.fields`의 `testItems.{항목 id}` |
| 확정된 참가가 아님 | 409 | `PARTICIPATION_NOT_CONFIRMED` ("참여가 확정된 테스트만 피드백을 낼 수 있어요") |
| 제출 마감이 지남 | 409 | `FEEDBACK_DEADLINE_PASSED` ("피드백 제출 기한이 지났어요") |
| 이미 제출함 | 409 | `FEEDBACK_ALREADY_SUBMITTED` ("이미 피드백을 제출했어요") |

#118-S1 제출 전 상세 [테스트]
- Given 확정된 참가(필수 항목 1, 선택 항목 1)
- Then  200이고 `status` `beforeSubmit`, `reward` 1000, `earnedCredits` 0, `accessUrl`이 있다
- Then  모집글 제목·프로젝트 이름·상태·선정 방식·제출 마감이 있고, 테스트 항목이 저장 순서대로 필수 여부와 함께 온다. `feedbacks`는 비고 `submittedAt`은 null이다

#118-S2 항목별 피드백 제출 [테스트]
- When  필수 항목과 기타 의견을 앞뒤 공백과 함께 적고, 선택 항목은 공백만 적어 제출한다
- Then  201이고 `status` `payoutPending`, 피드백 2건(필수 항목, 기타 의견)이 공백을 지운 내용으로 온다
- Then  `payoutAt`이 `submittedAt` + 72시간이다
- Then  저장된 두 행의 제출 시각이 같고, 선택 항목은 저장되지 않는다
- When  상세를 다시 연다
- Then  지급 대기이고 제출한 피드백 2건이 보인다

#118-S3 입력 검사 [테스트]
- Then  필수 항목을 빼거나 공백만 적으면 400이고 `error.fields`의 `testItems.{필수 항목 id}`가 "피드백을 적어 주세요"다
- Then  항목이나 기타 의견이 501자면 400이다
- Then  다른 모집의 항목, 같은 항목 두 번은 400이다
- Then  위 경우 모두 피드백이 저장되지 않는다
- Given 모든 항목이 선택인 참가
- When  아무것도 적지 않고 제출한다
- Then  400이고 첫 항목 칸에 "피드백을 적어 주세요"다

#118-S4 제출할 수 없는 참가 [테스트]
- Then  대기(확정 전) 참가는 409 `PARTICIPATION_NOT_CONFIRMED`다
- Then  제출 마감이 지난 확정 참가는 409 `FEEDBACK_DEADLINE_PASSED`다
- Then  이미 낸 참가가 다시 내면 409 `FEEDBACK_ALREADY_SUBMITTED`이고 처음 한 번만 저장돼 있다

#118-S5 남의 참가와 비로그인 [테스트]
- Then  다른 회원의 참가는 상세·제출 모두 404, 없는 참가는 404, 토큰이 없으면 401이고 저장되지 않는다

#118-S6 상태별 상세 [테스트]
- Then  대기 → `selectionPending`, 거절 → `notSelected`, 모집 마감 뒤에도 대기 → `notSelected`, 확정하고 제출 마감까지 안 냄 → `incomplete`, 피드백 한 건 신고 → `underReview`, 모두 지급 → `paid`(`earnedCredits` 1000), 보상 제외 → `excluded`, 참여 취소 → `cancelled`다
- Then  접속 링크는 확정된 참가에만 있고, `earnedCredits`는 지급 완료가 아니면 0이다

#118-S7 같은 참가로 동시에 여러 번 제출 [테스트]
- When  같은 테스터가 동시에 5번 제출한다
- Then  하나만 201이고 나머지는 409이며, 피드백은 한 번 제출한 만큼(항목 1 + 기타 의견 1)만 있다
- 참고: 잠금을 빼면 이 테스트가 실패하는 것을 확인했다

## 범위 밖
- 피드백 이미지(#119에서 붙인다)
- 지급 완료일(`paidAt`)과 검토 완료일(`reviewedAt`). 피드백에 그 시각을 저장하는 컬럼이 없다. 72시간 자동 지급과 신고 처리를 만드는 쪽에서 정한다(README 아직 정하지 않은 것 1)
- 프론트 연결(`getParticipation`, `saveFeedback` 본문 바꾸기)

## 가정
- 참여 상세는 피드백 상태를 모두 보여 주지만 신고 사유와 운영 용어는 주지 않는다(화면 R194)
- 미선정은 모집 마감 뒤에도 대기인 참가를 포함한다. 확정·거절은 모집 마감 전에만 할 수 있어서(#115 이슈) 그 뒤로는 선정될 수 없다
