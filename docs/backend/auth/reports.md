# 회원 신고·증거 첨부 (#85)

회원이 모집 글·회원·채팅방을 사유와 증거 파일로 신고하는 API. 운영자 판정, 피드백 신고 연결, 내 신고 목록은 2차(같은 이슈의 다음 PR)에서 더한다. 여러 이슈에 걸친 결정은 [README.md](README.md).

## 정한 것

- 신고는 `reports` 한 테이블로 피드백·모집 글·회원·채팅을 함께 쓴다. `target_type`(`FEEDBACK`·`RECRUITMENT`·`USER`·`CHAT`)과 `target_id`로 대상을 구분한다(팀 ERD 11-09)
- ERD 칸과 코드: `reports.user_id` = 신고한 회원, `reported_user_id` = 신고당한 회원(서버가 대상에서 찾는다), `reviewer_id` = 판정한 운영자(2차). 상태는 `PENDING`·`REJECTED`·`ACCEPTED`
- 채팅은 밖으로 방 id 대신 `roomKey`를 쓰므로, 신고 요청은 `roomKey`를 받고 `target_id`에는 방 id를 저장한다
- 신고당한 회원: 모집 글은 그 모집의 프로젝트 주인, 회원은 그 회원, 채팅은 그 방의 상대 참여자
- 피드백 신고는 이미 있는 피드백 신고 API(`POST /api/v1/developer/feedbacks/{id}/report`, #175)가 받는다. 2차에서 그 API가 `reports` 행도 만들게 연결하고, 이 API에서는 `FEEDBACK`을 받지 않는다
- 증거 파일은 서버 디스크(`UPLOAD_DIR`, 컨테이너 `/app/uploads`, 볼륨 `upload-data`)에 무작위 이름으로 저장하고, `report_evidences`에는 경로·원래 이름·종류·크기만 둔다. 공개 주소가 없고 API로만 연다
- 파일 종류는 확장자가 아니라 파일 앞부분(시그니처)으로 PNG·JPG·WEBP·PDF인지 본다
- 파일 저장 코드(`global/file/FileStorage`)는 공용이다. 프로필 이미지(#84) 등도 같은 코드를 쓴다
- 업로드 한도: 한 장 5MB, 한 번에 최대 5장(요청 30MB). Spring `max-file-size 5MB`·`max-request-size 30MB`, nginx `client_max_body_size 30m`. 프론트(Next) 연결 때 `serverActions.bodySizeLimit`도 맞춘다

## API

- `POST /api/v1/reports` (multipart): `targetType`, `targetId`(채팅이 아니면), `roomKey`(채팅이면), `reason`, `files`(0~5개). 201과 신고 한 건
- `GET /api/v1/reports/{reportId}/evidences/{evidenceId}`: 증거 파일. 신고한 본인과 운영자만

## 시나리오

#85-S1 회원이 모집 글·회원·채팅방을 사유와 증거 파일로 신고한다 [테스트]
- Given 로그인한 회원
- When  `POST /api/v1/reports`로 대상과 사유, PNG·PDF 증거를 보낸다
- Then  201이고 상태는 `PENDING`, 증거 목록(원래 이름·종류·크기)이 온다
- Then  신고당한 회원은 모집 글이면 프로젝트 주인, 회원이면 그 회원, 채팅이면 방의 상대다
- 증거 없이 사유만 보내도 된다

#85-S2 자기 자신, 자기 모집 글은 신고할 수 없다 [테스트]
- 400 `REPORT_SELF`("자기 자신은 신고할 수 없어요")

#85-S3 같은 회원이 검토 대기 중인 같은 대상을 또 신고하면 409 `REPORT_DUPLICATED` [테스트]
- 판정이 끝난 뒤에는 다시 신고할 수 있다(2차에서 확인)

#85-S4 없는 대상, 참여하지 않은 채팅방은 404 [테스트]

#85-S5 증거 파일 규칙에 맞지 않으면 400이고 신고를 만들지 않는다 [테스트]
- 5MB를 넘는 파일의 413은 테스트 도구(MockMvc)가 업로드 한도를 거치지 않아 실제 서버(`bootRun`)에서 확인한다
- PNG·JPG·WEBP·PDF가 아니면(확장자를 바꾼 파일 포함) "PNG·JPG·WEBP·PDF 파일만 올릴 수 있어요", 6장 이상이면 "증거 파일은 5장까지 올릴 수 있어요", 한 장이 5MB를 넘으면 "파일은 한 장 5MB까지 올릴 수 있어요"(실제 서버는 업로드 단계에서 413, 그 뒤 서비스 검사는 400)
- 사유가 비면 400(칸 `reason`), 대상 종류가 `FEEDBACK`이면 400("피드백 신고는 피드백 화면에서 해 주세요")

#85-S6 증거 파일은 신고한 본인과 운영자만 열 수 있다 [테스트]
- 다른 회원은 404(있는지도 알리지 않는다), 로그인하지 않으면 401
- 응답의 종류는 저장한 `content_type`이다

## 범위 밖

- 2차: 운영자 신고 목록·상세·판정, 피드백 신고 연결(`feedback.reward()`·`exclude()`), 내 신고 목록, 판정 뒤 재신고
- 제재(#86), 허위 신고자 제재, 처리 결과 알림
- 프론트 화면 연결, 파일 바이러스 검사, 오래된 증거 파일 정리
