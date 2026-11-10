# 피드백 관리 API (#175)

개발자가 모집 관리의 "피드백" 탭에서 피드백을 보고, 유용해요를 표시하고, 신고하는 API. 화면 규칙은 [프로젝트 화면 8. 피드백 탭](../../frontend/project/projects.md#8-피드백-탭-r108)이고, AI 후속 질문은 [ai-followup.md](ai-followup.md)다.

시나리오 제목 끝의 태그가 확인 방법이다. `[테스트]`는 백엔드 테스트와 1:1이다(`@DisplayName("#175-S…")`).

## 1. 피드백 목록·유용해요·신고 (#175-R3)

| 동작 | API | 로그인 | 성공 |
| --- | --- | --- | --- |
| 피드백 목록 | `GET /api/v1/developer/recruitments/{recruitmentId}/feedbacks` | 필요 | 200 |
| 유용해요 표시 | `PUT /api/v1/developer/feedbacks/{feedbackId}/recommendation` | 필요 | 200 |
| 피드백 신고 | `POST /api/v1/developer/feedbacks/{feedbackId}/report` | 필요 | 200 |

- `developer/FeedbackController`에 두고 서비스는 `FeedbackService`다. 다른 회원의 모집·피드백은 404이고, 피드백의 주인 확인은 AI 후속 질문과 같은 쿼리(`findWithRecruitmentById`)로 한다
- 목록은 최근 제출 순이고 건마다 `feedbackId`, `registerId`, `nickname`, `testItemId`(기타 의견은 null), `content`, `imageUrls`(올린 순서), `submittedAt`, `status`, `recommended`를 준다. 테스터는 닉네임만 준다 (고침 #195: 채팅 걸기에 참가 id가 필요하다)
- `imageUrls`는 저장된 주소의 파일 이름으로 만든 개발자 조회 주소(`/api/v1/developer/feedbacks/{feedbackId}/images/<파일 이름>`)다. 조회 권한은 [feedback-images.md](feedback-images.md)를 따른다 (고침 #119: 저장값은 테스터 주소라 개발자가 열 수 없다)
- `status`는 `submitted`(72시간 신고 대기), `reported`, `rewarded`, `excluded`다. 남은 신고 시간은 `submittedAt`으로 프론트가 센다
- 유용해요 본문은 `{"recommended": true | false}`이고 상태와 상관없이 바꿀 수 있다
- 신고 본문은 `{"reason": "…"}`이고 500자까지, 앞뒤 공백을 지워 `feedbacks.report_reason`에 남긴다. 운영자가 신고를 검토할 때 읽는다. 컬럼은 null 허용이라 `ddl-auto: update`로 생긴다

| 상황 | 상태 | `error.code` |
| --- | --- | --- |
| 사유가 비었거나 500자를 넘음 | 400 | `INVALID_INPUT` |
| 이미 신고했거나 지급·제외된 피드백, 제출 후 72시간이 지남 | 409 | `FEEDBACK_NOT_REPORTABLE` |

#175-S10 피드백 목록 [테스트]
- Given 스크린샷 2장이 있는 항목 피드백, 유용해요를 누른 기타 의견
- Then  최근 제출 순으로 오고, 항목 id(기타 의견은 null)·스크린샷 주소(올린 순서)·상태·유용해요·닉네임이 있다
- Then  다른 회원이 부르면 404다

#175-S11 유용해요 표시 [테스트]
- Then  켜고 끄면 그대로 저장된다. 다른 회원이 부르면 404이고 바뀌지 않는다

#175-S12 피드백 신고 [테스트]
- Then  사유가 비면 400, 다른 회원이면 404다
- When  제출 후 71시간인 피드백을 사유를 적어 신고한다
- Then  신고됨이 되고 사유가 앞뒤 공백 없이 남는다
- Then  다시 신고하거나 73시간이 지난 피드백을 신고하면 409이고 바뀌지 않는다

## 범위 밖
- 프론트 연결: 모집 관리 화면은 아직 목업에서 읽고, 유용해요와 신고는 화면 안에서만 바뀐다. 화면을 백엔드에서 읽게 할 때 이 API로 바꾼다
- 신고 정보 보기, 운영자의 신고 검토(지급·제외), 72시간 뒤 자동 지급
