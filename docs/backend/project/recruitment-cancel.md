# 모집 취소 API (#116)

개발자가 운영자 승인 없이 자기 모집을 직접 취소하는 API. 화면 규칙은 [프로젝트 화면 #62-R3](../../frontend/project/projects.md#모집-취소-62-r3)이고, 도메인 전체에서 정한 것은 [README.md](README.md)에 있다.

시나리오 제목 끝의 태그가 확인 방법이다. `[테스트]`는 백엔드 테스트와 1:1이다(`@DisplayName("#116-S…")`).

## 이슈 #116 확인

| 이슈 항목 | 시나리오 |
| --- | --- |
| 1 모집 중이고 확정 테스터가 없으면 사유 없이 바로 취소 | #116-S1 |
| 2 테스트 중이면 사유를 적어야 취소 | #116-S4 |
| 3 확정 테스터가 있는 모집 중인 모집, 종료·취소된 모집은 취소할 수 없음 | #116-S2, #116-S5 (선착순은 예외, #116-S3) |
| 4 대기 지원과 피드백을 내지 않은 확정 테스터는 참여 취소, 피드백을 낸 테스터는 확정으로 남음 | #116-S1, #116-S3, #116-S4 |
| 5 모집 건 상세에서 취소 사유와 시각을 다시 봄 | #116-S7 (모집 건 상세 API는 #115라 지금은 프로젝트의 모집 건 목록에서 준다) |

## 1. 모집 취소 (#116-R1)

| 동작 | API | 로그인 | 성공 |
| --- | --- | --- | --- |
| 모집 취소 | `POST /api/v1/developer/recruitments/{recruitmentId}/cancel` | 필요 | 200 |

본문은 `{"reason": "…"}`이고 생략할 수 있다. 사유는 300자까지다.

| 모집 상태(마감일로 계산) | 취소 | 사유 |
| --- | --- | --- |
| 모집 중 | 확정 테스터가 없을 때. **선착순 모집은 확정 테스터가 있어도 된다** | 받지 않는다(보내도 저장하지 않는다) |
| 테스트 중 | 가능 | 필수. 앞뒤 공백을 지우고 저장한다 |
| 종료·취소 | 불가 | — |

- 선착순 예외: 선착순은 지원하자마자 확정되어 "확정 테스터가 없을 때만" 규칙으로는 첫 지원 뒤 취소할 수 없다. 11-07 팀 채팅에서 선착순은 예외로 두기로 했다([README 정한 것 13](README.md#정한-것)). 다른 의견이 나오면 이 줄만 바꾼다
- 테스터 처리: 대기(`APPLIED`) 지원과 피드백을 하나도 내지 않은 확정(`CONFIRMED`) 참가는 참여 취소(`CANCELLED`)가 된다. 피드백을 낸 확정 참가는 그대로 남아 72시간 신고 규칙대로 보상을 받는다. 거절(`REJECTED`)은 그대로 둔다
- 같은 모집에 취소와 지원(#114)이 겹치지 않게 모집글 행을 잠그고(`PESSIMISTIC_WRITE`) 판단한다. 지원 API도 같은 잠금으로 모집글을 읽어야 한다
- 응답: `id`, `status`(`cancelled`), `cancelReason`(테스트 전 취소는 null), `cancelledAt`, `cancelledRegisterCount`(참여 취소가 된 수), `keptRegisterCount`(확정으로 남은 수)
- 프로젝트의 모집 건 목록(`GET /api/v1/developer/projects/{projectId}/recruitments`, #92) 항목에 `cancelReason`, `cancelledAt`을 더했다. 취소하지 않은 모집은 둘 다 null이다
- 취소된 모집은 공개 목록(#112)과 공개 상세(#113, 404)에 나오지 않는다. 그 확인은 각 이슈의 테스트가 한다

| 상황 | 상태 | `error.code` |
| --- | --- | --- |
| 테스트 중인데 사유가 없음, 사유가 300자를 넘음 | 400 | `INVALID_INPUT` (`error.fields.reason`) |
| 로그인하지 않음 | 401 | `UNAUTHORIZED` |
| 없는 모집, 다른 회원의 모집 | 404 | `NOT_FOUND` |
| 확정 테스터가 있는 선발형 모집 중인 모집 | 409 | `RECRUITMENT_NOT_CANCELLABLE` ("확정된 테스터가 있어 취소할 수 없어요") |
| 종료·취소된 모집 | 409 | `RECRUITMENT_NOT_CANCELLABLE` ("지금은 모집을 취소할 수 없어요") |

#116-S1 모집 중 사유 없이 취소 [테스트]
- Given 확정 테스터가 없는 선발형 모집 중인 모집, 대기 지원 1건, 거절 1건
- When  본문 없이 취소한다
- Then  200이고 `status` `cancelled`, `cancelReason` 없음, `cancelledAt` 있음, `cancelledRegisterCount` 1이다
- Then  모집글은 `CANCELLED`, 대기 지원은 `CANCELLED`, 거절은 `REJECTED` 그대로다
- When  다른 모집 중인 모집을 사유를 보내 취소한다
- Then  사유는 저장되지 않는다

#116-S2 확정 테스터가 있는 선발형 모집 [테스트]
- Given 확정 1명, 대기 1명이 있는 선발형 모집 중인 모집
- Then  409 `RECRUITMENT_NOT_CANCELLABLE` "확정된 테스터가 있어 취소할 수 없어요"이고 모집글과 참가는 그대로다

#116-S3 선착순 모집은 확정 테스터가 있어도 취소 [테스트]
- Given 확정 2명이 있는 선착순 모집 중인 모집
- Then  200이고 두 참가 모두 `CANCELLED`다

#116-S4 테스트 중 사유를 적고 취소 [테스트]
- Given 테스트 중인 모집. 피드백을 낸 확정 1명, 내지 않은 확정 1명, 대기 1명
- When  사유 없이, 공백만 적어 취소한다
- Then  400 `INVALID_INPUT`, `error.fields.reason` "취소 사유를 적어 주세요"이고 모집은 그대로다
- When  앞뒤에 공백이 있는 사유를 적어 취소한다
- Then  200이고 공백을 지운 사유가 저장되며 `cancelledRegisterCount` 2, `keptRegisterCount` 1이다
- Then  피드백을 낸 확정은 `CONFIRMED`, 나머지 둘은 `CANCELLED`다

#116-S5 종료·취소된 모집 [테스트]
- Given 제출 마감까지 지난 모집
- Then  409 "지금은 모집을 취소할 수 없어요"다
- Given 방금 취소한 모집
- When  다시 취소한다
- Then  409이고 처음 취소 시각이 그대로다

#116-S6 남의 모집, 비로그인, 긴 사유 [테스트]
- Then  다른 회원의 모집, 없는 모집은 404, 토큰이 없으면 401, 301자 사유는 400(`error.fields.reason`)이고 모집은 그대로다

#116-S7 모집 건 목록에서 취소 사유와 시각을 다시 본다 [테스트]
- Given 사유를 적어 취소한 모집
- When  프로젝트의 모집 건 목록을 부른다
- Then  그 항목의 `status`가 `cancelled`이고 `cancelReason`, `cancelledAt`이 있다

## 범위 밖
- 프론트 연결(`saveRecruitmentCancellation`, `findCancellation` 본문 바꾸기). 화면의 #62-S17은 지금 선착순 모집(`folio-builder`)도 취소할 수 없다고 안내하므로, 연결할 때 선착순 예외에 맞춰 함께 고친다
- 모집 건 상세의 취소 정보(#115에서 같은 값을 준다)
- 취소된 참여의 테스터 알림

## 가정
- 피드백은 제출할 때만 저장되므로(#89) 참가에 피드백 행이 하나라도 있으면 "피드백을 냈다"로 본다
- 모집 상태 계산은 #113이 머지되면 공용 `RecruitmentNames.status`로 바꾼다. 지금은 develop에 없어 서비스 안에 같은 계산을 둔다
