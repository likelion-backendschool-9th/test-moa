# 테스터 관리 API (#175)

개발자가 모집 관리의 "테스터 관리" 탭에서 지원 목록을 보고 지원자를 확정·거절하는 API. 화면 규칙은 [프로젝트 화면 7. 테스터 관리 탭](../../frontend/project/projects.md#7-테스터-관리-탭-r107)이고, 테스터가 지원하는 API는 [test-apply.md](test-apply.md)다.

시나리오 제목 끝의 태그가 확인 방법이다. `[테스트]`는 백엔드 테스트와 1:1이다(`@DisplayName("#175-S…")`).

## 1. 지원 목록과 확정·거절 (#175-R2)

| 동작 | API | 로그인 | 성공 |
| --- | --- | --- | --- |
| 지원 목록 | `GET /api/v1/developer/recruitments/{recruitmentId}/applications` | 필요 | 200 |
| 지원자 확정·거절 | `PATCH /api/v1/developer/recruitments/{recruitmentId}/applications` | 필요 | 200 |

- 테스터의 지원(`ApplicationController`)과 나눠 `developer/ApplicationController`에 두고, 서비스는 같은 `ApplicationService`를 쓴다. 확정할 때 고정하는 보상은 지원 API의 선착순 확정과 같은 `RewardPolicy`다
- 목록은 지원한 순서이고 줄마다 `registerId`, `nickname`, `status`(`applied`·`confirmed`·`rejected`·`cancelled`), `appliedAt`, `feedbackSubmitted`를 준다. 테스터는 닉네임만 준다. 제출 현황(제출함·미제출·미완료)은 마감일과 함께 프론트가 정한다
- 확정·거절 본문은 `{"registerIds": [..], "status": "confirmed" | "rejected"}`이고 고른 지원을 한 번에 바꾼다. 같은 id가 여러 번 와도 한 번으로 본다
- 모집글 행을 잠그고(`PESSIMISTIC_WRITE`, 모집 취소와 같은 쿼리) 판단해 지원·모집 취소와 겹치지 않는다. 다른 회원의 모집은 404다

| 상황 | 상태 | `error.code` |
| --- | --- | --- |
| 무료 모집, 선착순 모집, 모집 마감이 지난 모집 | 409 | `APPLICANTS_NOT_SELECTABLE` |
| 지원 상태가 아니거나 이 모집의 지원이 아닌 id가 섞임. 아무것도 바꾸지 않는다 | 400 | `INVALID_INPUT` |
| `status`가 `confirmed`·`rejected`가 아님 | 400 | `INVALID_INPUT` |

#175-S7 지원 목록 [테스트]
- Given 대기 지원 1건, 피드백을 낸 확정 지원 1건, 다른 모집의 지원 1건
- Then  이 모집의 지원 2건이 지원한 순서로 오고, 상태와 닉네임, 피드백 제출 여부(대기 false, 확정 true)가 있다
- Then  다른 회원이 부르면 404다

#175-S8 지원자 확정·거절 [테스트]
- When  대기 지원 2건을 확정한다(같은 id를 두 번 보냄), 다른 1건을 거절한다
- Then  확정한 지원은 확정 시각과 기본 보상 1,000이 고정되고, 거절한 지원은 거절 상태다

#175-S9 확정·거절할 수 없는 경우 [테스트]
- Then  무료 모집, 선착순 모집, 모집 마감이 지난 모집은 409 `APPLICANTS_NOT_SELECTABLE`이고 바뀌지 않는다
- Then  이미 거절한 지원이나 다른 모집의 지원을 섞으면 400이고 함께 보낸 대기 지원도 그대로다
- Then  `status`가 정해진 값이 아니면 400, 다른 회원이 부르면 404다

## 범위 밖
- 프론트 연결: 모집 관리 화면은 아직 목업에서 읽고, 확정·거절은 시연 쿠키에 저장한다. 화면을 백엔드에서 읽게 할 때 이 API로 바꾼다
- 참여 취소, 확정 되돌리기
