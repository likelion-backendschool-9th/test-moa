# 피드백 이미지 업로드 API

[#119](https://github.com/likelion-backendschool-9th/test-moa/issues/119). 제출 API는 [feedback-submit.md](feedback-submit.md), 개발자 목록은 [feedback-management.md](feedback-management.md), 도메인 전체의 결정은 [README](README.md#정한-것), 화면은 [참여 테스트](../../frontend/project/participations.md)를 따른다.

시나리오 제목 끝의 태그가 확인 방법이다. `[테스트]`는 백엔드 테스트와 1:1이다(`@DisplayName("#119-S…")`).

## 한눈에
- 끝나면: 확정된 테스터가 피드백 칸마다 이미지를 올려 제출할 수 있고, 제출한 테스터와 그 프로젝트의 개발자만 API로 이미지를 다시 볼 수 있다.
- 결정 필요: 없음
- 규모: 4단계, 약 4시간. 백엔드만 바꾸고 화면 연결은 #57에서 한다.

## 정한 것 (11-10)
- 이미지 주소는 역할별로 나눈다. 기존 역할별 컨트롤러에 메서드만 더하고, 권한은 주소의 참가·피드백으로 바로 확인한다. 공용 주소 하나는 공용 컨트롤러가 새로 필요하고, 파일 이름으로 DB를 찾아 두 역할을 한곳에서 판단해야 해서 쓰지 않는다.

## API 구성
새 컨트롤러를 만들지 않고 화면별 기존 컨트롤러에 메서드를 더한다. 제출 API는 지금처럼 JSON으로 이미지 주소를 받는다.

| 용도 | 주소 | 위치 |
| --- | --- | --- |
| 업로드 | `POST /api/v1/tester/participations/{registerId}/feedbacks/images` | `controller.tester.ParticipationController` |
| 테스터 조회 | `GET /api/v1/tester/participations/{registerId}/feedbacks/images/{name}` | `controller.tester.ParticipationController` |
| 개발자 조회 | `GET /api/v1/developer/feedbacks/{feedbackId}/images/{name}` | `controller.developer.FeedbackController` |

- 업로드는 multipart `file` 하나를 받아 `{ "url": "/api/v1/tester/participations/{registerId}/feedbacks/images/<uuid>.<확장자>" }`를 돌려준다. 응답 DTO는 `ImageUploadResponse`를 쓴다.
- 파일은 업로드 폴더의 `feedback-images/{registerId}/<uuid>.<확장자>`에 저장한다. 공개 조회는 `images/`만 읽으므로 공개 주소로는 피드백 이미지에 닿지 않는다.
- `feedback_images.url`에는 업로드가 돌려준 테스터 주소를 그대로 저장한다. 테이블과 컬럼은 바꾸지 않는다.
- 개발자 목록의 `imageUrls`는 저장값의 파일 이름으로 개발자 주소를 만들어 준다.
- 조회 응답은 `Cache-Control: no-store`다. 테스터의 화면과 개인 정보가 찍혀 있을 수 있어 어디에도 저장하지 않고, 볼 때마다 권한을 확인한다.
- 폴더 이름은 `FeedbackImage`의 상수 하나를 두 서비스가 함께 쓴다. 테스터 주소는 `ParticipationServiceImpl`, 개발자 주소는 `FeedbackServiceImpl`이 만든다.
- `FileStorage.loadImage`는 폴더를 받는 형태를 더해 `isImageName` 검사를 같이 쓴다.
- PDF를 뺀 이미지 판별은 `FileStorage.detectImage`로 옮겨 `ProjectServiceImpl`과 함께 쓴다. 오류 문구는 각 서비스에 둔다.

### 제출 본문 (고침 대상: feedback-submit.md)
`{"items": [{"testItemId": 1, "content": "…", "imageUrls": ["…"]}], "etc": "…", "etcImageUrls": ["…"]}`

- `imageUrls`, `etcImageUrls`는 없어도 된다. 없으면 빈 목록이다.
- 장수와 주소 검사는 요청 값 검사가 아니라 서비스에서 한다. 화면이 칸을 찾는 오류 이름(`testItems.{id}`, `etc`)으로 내려야 하기 때문이다.
- 응답의 `feedbacks[]`에 `imageUrls`(올린 순서)를 더한다.

## 1. 업로드 (#119-R1)
확정된 테스터가 제출 전에 PNG·JPG·WEBP 이미지를 한 장에 5MB까지 한 번에 한 장씩 올린다. 한도를 넘거나 올릴 수 없는 참가면 저장되지 않고 이유를 알린다.

#119-S1 업로드 [테스트]
- Given 확정된 참가의 테스터
- When  1MB PNG를 업로드 API로 보낸다
- Then  200이고 `url`이 `/api/v1/tester/participations/{registerId}/feedbacks/images/<uuid>.png`다
- Then  파일이 `feedback-images/{registerId}/`에 있다

#119-S2 받지 않는 파일 [테스트]
- Then  이름만 `a.png`이고 내용은 텍스트인 파일은 400이고 `error.fields.file`이 "PNG, JPG, WEBP 이미지만 올릴 수 있어요"다
- Then  정상 PDF도 같은 400이다
- Then  파일 두 개를 한 요청에 보내면 400이다
- Then  위 경우 모두 파일이 저장되지 않는다

#119-S3 5MB 초과 [직접]
- Given 실행 중인 서버와 6MB PNG
- When  업로드한다
- Then  413이다
- 참고: MockMvc는 업로드 한도를 거치지 않는다

#119-S4 올릴 수 없는 참가 [테스트]
- Then  대기(확정 전) 참가는 409 `PARTICIPATION_NOT_CONFIRMED`다
- Then  제출 마감이 지난 참가는 409 `FEEDBACK_DEADLINE_PASSED`다
- Then  이미 제출한 참가는 409 `FEEDBACK_ALREADY_SUBMITTED`다
- Then  피드백 제재 중인 회원은 403 `RESTRICTED`다
- Then  위 경우 모두 파일이 저장되지 않는다

#119-S5 남의 참가와 비로그인 [테스트]
- Then  다른 회원의 참가와 없는 참가는 404, 토큰이 없으면 401이고 파일이 저장되지 않는다

## 2. 제출에 연결 (#119-R2)
제출할 때 칸마다 올린 이미지 주소를 함께 보내면 그 칸의 피드백 행에 연결된다.

#119-S6 항목과 기타 의견에 이미지 연결 [테스트]
- Given 같은 참가로 올린 이미지 3장
- When  필수 항목에 2장, 기타 의견에 1장을 넣어 제출한다
- Then  201이고 응답의 항목 피드백 `imageUrls`가 보낸 순서의 2개, 기타 의견은 1개다
- Then  `feedback_images`가 3행이고 각자의 피드백 행을 가리킨다

#119-S7 이미지 없는 제출 [테스트]
- When  `imageUrls` 없이 지금 모양으로 제출한다
- Then  201이고 피드백마다 `imageUrls`가 빈 배열이다

#119-S8 장수 초과 [테스트]
- When  한 항목에 6장을 넣어 제출한다
- Then  400이고 `error.fields`의 `testItems.{항목 id}`가 "이미지는 5장까지 올릴 수 있어요"다
- When  기타 의견에 6장을 넣어 제출한다
- Then  400이고 `error.fields.etc`가 같은 문구다
- Then  두 경우 모두 피드백과 이미지 행이 저장되지 않는다

#119-S9 내용 없는 칸의 이미지 [테스트]
- When  내용을 비운 선택 항목에 이미지 1장을 넣어 제출한다
- Then  400이고 그 칸의 오류가 "내용을 적어야 이미지를 넣을 수 있어요"다
- Then  피드백이 저장되지 않는다

#119-S10 쓸 수 없는 주소 [테스트]
- When  `https://evil.example/a.png`, 공개 이미지 주소, 다른 참가의 주소 중 하나를 넣어 제출한다
- Then  각각 400이고 그 칸의 오류가 "이미지를 다시 올려 주세요"다
- Then  피드백과 이미지 행이 저장되지 않는다

## 3. 다시 보기 (#119-R3)
제출한 테스터와 그 프로젝트의 개발자가 이미지를 항목별로 다시 본다.

#119-S11 테스터가 다시 본다 [테스트]
- Given 이미지 2장을 넣어 제출한 참가
- When  참여 상세를 다시 읽고 `imageUrls`의 첫 주소를 조회한다
- Then  상세의 그 항목에 주소 2개가 올린 순서로 있다
- Then  조회는 200이고 `Content-Type`이 `image/png`, `Cache-Control`이 `no-store`이며 바이트가 올린 파일과 같다

#119-S12 개발자가 다시 본다 [테스트] (`FeedbackControllerTest` 목록 준비 값을 업로드 주소 모양으로 바꾼다)
- Given 위 참가가 속한 프로젝트의 개발자
- When  피드백 목록을 읽고 `imageUrls`의 첫 주소를 조회한다
- Then  주소가 `/api/v1/developer/feedbacks/{feedbackId}/images/<uuid>.png`다
- Then  조회는 200이고 바이트가 올린 파일과 같다

## 4. 접근 차단 (#119-R4)
다른 회원의 피드백 이미지에는 접근할 수 없다.

#119-S13 조회 차단 [테스트]
- Then  다른 테스터가 테스터 주소를 조회하면 404다
- Then  다른 프로젝트의 개발자가 개발자 주소를 조회하면 404다
- Then  토큰이 없으면 두 주소 모두 401이다
- Then  없는 파일 이름, `..`이 든 이름, 다른 참가의 파일 이름은 404다
- Then  같은 파일 이름을 공개 주소 `/api/v1/recruitments/images/{name}`으로 조회하면 404다

## 범위 밖
- 화면 연결(#57): 제출 때 업로드, Next Route Handler, `saveBackendFeedback`의 이미지 막음 해제(#189-R6), 참여 상세의 이미지 표시
- 업로드 횟수 제한과 안 쓰는 파일 삭제(#225). 삭제 조건에 `feedback-images/`와 `feedback_images`를 더해야 한다
- 운영자 신고 화면의 피드백 이미지. 지금 신고 상세는 피드백 이미지를 보여 주지 않는다
- AI 분석에 이미지 넘기기

## 작업 순서
1. 업로드 — #119-S1, S2, S4, S5
   - 파일: `FileStorage`(`detectImage`), `FeedbackImage`(폴더 상수), `ProjectServiceImpl`(판별 공유), `ParticipationService(Impl)`, `tester.ParticipationController`, `ParticipationControllerTest`
   - 확인: `./gradlew test --tests '*ParticipationControllerTest'`
2. 제출 연결 — #119-S6~S10
   - 파일: `FeedbackSubmitRequest`, `ParticipationResponse`, `ParticipationServiceImpl`, `ParticipationControllerTest`
   - 확인: 1단계 명령에 `--tests '*FeedbackSubmitConcurrencyTest'` 추가
3. 조회와 차단 — #119-S11~S13
   - 파일: `FileStorage`, `ParticipationServiceImpl`, `FeedbackServiceImpl`, `developer.FeedbackController`, `tester.ParticipationController`, `FeedbackControllerTest`, `ParticipationControllerTest`
   - 확인: `./gradlew test --tests '*ParticipationControllerTest' --tests '*FeedbackControllerTest'`
4. 실제 서버 한도와 문서 — #119-S3
   - 파일: `docs/backend/project/README.md`(이슈 표), `feedback-submit.md`(제출 본문·상세 응답·범위 밖), `feedback-management.md`(`imageUrls`)
   - 확인: `bootRun`에 6MB 파일 업로드

## 가정
- 주소 검사는 모양과 이번 참가의 주소인지만 본다. 폴더가 참가별이라 DB에 업로드 기록 표를 더하지 않아도 다른 참가의 파일을 막을 수 있다.
- 파일 존재와 같은 주소의 중복은 검사하지 않는다. #191과 같은 기준이고, 위조해도 자기 피드백의 이미지가 깨지거나 두 번 보일 뿐이다.
- 업로드는 잠그지 않는다. 제출과 겹쳐도 그 파일이 안 쓰는 파일로 남을 뿐이고, 이는 #225가 치운다.
- 테스터 조회는 자기 참가의 폴더면 제출에 넣지 않은 파일도 연다. 본인이 올린 파일이라 새로 노출되는 것이 없다.
- 개발자 조회는 목록과 같이 내 프로젝트인지만 보고, 그 피드백의 참가 폴더에서 읽는다. 구독 여부와 제출에 연결된 파일인지는 보지 않는다. 제출하지 않은 파일의 UUID는 개발자가 알 수 없다.
- 운영자는 이번 조회 대상이 아니다.

## 참고 (2026-11-10 확인)
- `FeedbackImage`와 목록 조회(`findByFeedbackIdInOrderByIdAsc`)는 이미 있고, 행을 저장하는 코드는 없다. 운영 데이터를 옮길 일이 없다.
- 업로드 한도는 Spring `max-file-size 5MB`, `max-request-size 30MB`, 저장소의 nginx 설정 `client_max_body_size 30m`이다. 이슈의 10MB는 지금 값이 아니다. 서버 호스트의 nginx 값은 저장소에 없어 배포 때 확인해야 한다.
- #57 연결 때 볼 것: `frontend/proxy.ts`의 matcher는 주소에 점이 있으면 건너뛴다. access 쿠키가 만료된 채 `….png` 주소를 바로 열면 토큰 갱신 없이 401이 된다. 페이지 이동을 거치면 먼저 갱신된다.
- #57 연결 때 볼 것: 5MB 초과(413)는 공용 처리라 `error.fields`의 이름이 `files`다. 형식 오류의 `file`과 다르다.
- #57 연결 때 볼 것: 개발자 `FeedbackList`는 이미 `<img>`로 그린다. 참여 상세도 `<img>`로 그리면 브라우저 쿠키가 그대로 간다. `next/image`가 이 쿠키를 넘기는지는 확인하지 않았다.
