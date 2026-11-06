# AI 후속 질문 추천 (#109)

개발자가 테스터의 리뷰 하나로, 채팅으로 되물을 후속 질문 3개를 추천받는다. 질문은 외부 분석 서버(파이썬 `analysis-server`, 별도 EC2)가 만들고, 메인 백엔드는 필요한 정보를 모아 보내고 받은 질문을 프론트에 넘긴다. 프로젝트 도메인 전체에서 정한 것은 [README.md](README.md)에 있다. 시나리오는 `#109-S1`부터 센다.

## 한눈에
- 끝나면: 프론트가 `POST /api/v1/developer/feedbacks/{feedbackId}/followup-questions`를 부르면 질문 3개를 받는다. 구독한 프로젝트 주인만, 하루 3번까지 쓸 수 있다
- 결정 필요: 없음
- 규모: 5단계

## 정한 것 (11-06)
분석 서버 주소·토큰, 트랜잭션 밖 호출, 오류 변환은 [README.md의 AI 분석 서버 연동](README.md#ai-분석-서버-연동-107109)을 따른다.

| # | 결정 | 이유 |
| --- | --- | --- |
| 1 | 구독한 프로젝트 주인만 쓴다 | 프로젝트 README의 구독 혜택 "피드백 관리·분석 편의 기능"이다. 다른 회원의 리뷰는 #92처럼 "찾을 수 없음"으로 답한다 |
| 2 | 하루 3번은 서버 메모리로 센다. 서울 시간 자정에 다시 세고, 질문을 받은 요청만 센다 | 테이블을 늘리지 않는다. 서버를 다시 시작하면 처음부터 세고, 서버가 여러 대면 대마다 따로 센다 |
| 3 | 추천한 질문은 저장하지 않는다 | 이슈 #109. 개발자가 복사해 채팅으로 보낸다 |
| 4 | 응답 대기는 연결 5초, 응답 30초이고 `application.yml`에서 바꾼다 | 질문 3개는 리뷰 묶기보다 짧다. nginx의 응답 대기(60초)보다 먼저 끊어 503 안내가 사용자에게 간다(README 결정 5). 리뷰 묶기(#107)는 더 길게 따로 둔다 |

## 1. 질문 추천 (#109-R1)
리뷰 하나에서 프로젝트·모집글·리뷰 정보를 모아 분석 서버의 `POST /v1/followup-questions`로 보내고, 받은 질문을 그대로 돌려준다.

#109-S1 정상 [테스트]
- Given 구독 중인 개발자 A의 프로젝트 P에 모집글 M이 있고, 테스터 B가 M의 테스트 항목 "결제"에 리뷰 F를 남겼다
- When  A가 F로 질문 추천을 요청한다
- Then  분석 서버에 `context`(프로젝트 제목·설명, 모집글 제목·설명·버전)와 `feedback`(리뷰 id, 작성자 B의 id, 내용, 테스트 항목 제목 "결제")이 camelCase JSON으로 가고, `X-Internal-Token`과 `X-Request-ID` 헤더가 붙는다
- Then  응답은 200이고 `data.questions`가 분석 서버가 준 질문 3개다

#109-S2 기타 의견 [테스트]
- Given 테스트 항목 없이 남긴 리뷰(기타 의견)
- Then  `feedback.testItemTitle`이 null로 간다

#109-S3 길이 제한 [테스트]
- Given 분석 서버는 제목 200자, 설명 5,000자, 리뷰 4,000자까지 받는다(넘으면 422)
- When  프로젝트 설명이 5,001자인 리뷰로 요청한다
- Then  설명을 5,000자로 잘라 보낸다. 제목과 리뷰 내용도 같은 방식으로 자른다

## 2. 권한 (#109-R2)

#109-S4 구독하지 않은 프로젝트 주인 [테스트]
- When  구독하지 않은 A가 자기 프로젝트의 리뷰로 요청한다
- Then  403 `SUBSCRIPTION_REQUIRED`이고 분석 서버를 부르지 않는다

#109-S5 내 프로젝트의 리뷰가 아님 [테스트]
- When  구독 중인 A가 다른 회원 프로젝트의 리뷰나 없는 리뷰로 요청한다
- Then  둘 다 404 `NOT_FOUND`이고 분석 서버를 부르지 않는다

#109-S6 로그인 [테스트: SecurityTest #79-S3]
- 토큰 없이 부르면 401 `UNAUTHORIZED`

## 3. 하루 한도 (#109-R3)

#109-S7 하루 3번 [테스트]
- When  A가 같은 날 네 번 요청한다
- Then  세 번은 질문을 받고, 네 번째는 429 `FOLLOWUP_LIMIT_EXCEEDED`이며 분석 서버를 부르지 않는다
- Then  다른 개발자의 횟수와는 따로 센다

#109-S8 자정에 다시 센다 [테스트]
- Given A가 서울 시간으로 오늘 세 번을 다 썼다
- When  서울 시간 자정이 지난 뒤 요청한다
- Then  다시 세 번 쓸 수 있다
- Then  지난 날짜의 사용 기록은 날이 바뀐 뒤 처음 셀 때 지운다(쓴 적 있는 회원이 메모리에 계속 쌓이지 않게)

#109-S9 실패한 요청은 세지 않는다 [테스트]
- When  분석 서버 오류로 질문을 받지 못한다
- Then  그 요청은 횟수에 들어가지 않는다
- Then  23:59에 센 요청이 자정을 넘겨 실패하면, 그날 횟수만 되돌리고 다음 날 횟수는 건드리지 않는다

## 4. 분석 서버 오류 (#109-R4)
분석 서버의 오류는 `application/problem+json`이고 `type`으로 나뉜다(분석 서버 README).

#109-S10 분석 서버를 쓸 수 없음 [테스트]
- When  분석 서버가 5xx(`llm-upstream-error`, `llm-output-invalid` 등)를 주거나, 연결하지 못하거나, 응답 대기 시간을 넘긴다
- Then  503 `AI_UNAVAILABLE` "AI 분석을 잠시 쓸 수 없어요. 잠시 후 다시 시도해 주세요" (#107·#108도 같은 코드를 쓴다)

#109-S11 분석 서버가 요청을 거절하거나 응답이 계약과 다름 [테스트]
- When  분석 서버가 401(토큰 불일치)이나 422(`validation-error`, 계약 불일치)를 준다
- When  200이지만 JSON이 아니거나(주소를 잘못 넣어 다른 서버가 답함) `questions`가 없다
- Then  메인 백엔드의 설정·코드 문제라 500 `INTERNAL_ERROR`이고, 로그에 분석 서버의 상태 코드와 요청 ID를 남긴다

#109-S12 토큰 설정이 비어 있음 [테스트]
- Given `ANALYSIS_INTERNAL_TOKEN`이 없다
- When  요청한다
- Then  분석 서버를 부르지 않고 503 `AI_UNAVAILABLE`이다

#109-S13 실제 분석 서버 연결 [직접]
- Given 분석 서버를 EC2에 배포하고, 메인 서버에 `ANALYSIS_BASE_URL`과 `ANALYSIS_INTERNAL_TOKEN`을 넣었다
- When  Swagger에서 구독 회원의 토큰으로 리뷰 id를 넣어 부른다
- Then  질문 3개가 오고, 두 서버 로그에 같은 `X-Request-ID`가 찍힌다

## 범위 밖
- 프론트 화면(리뷰 옆 추천 버튼, 질문 복사)
- 리뷰 묶기(#107)와 버전 비교(#108)
- 서버 여러 대가 함께 쓰는 한도(Redis·DB 테이블)
- 분석 서버 배포와 보안 그룹, 메인 서버 환경 변수 설정
- 남은 횟수를 응답에 싣는 것

## 작업 순서
1. 설정 — #109-S12
   - 파일: `application.yml`(`analysis.*`, `spring.jpa.open-in-view: false`), `global/client/AnalysisProperties`, `config/AnalysisClientConfig`, `compose.yaml`·`compose.prod.yaml`·`.env.example`(`ANALYSIS_BASE_URL`, `ANALYSIS_INTERNAL_TOKEN`)
2. 분석 서버 클라이언트 — #109-S1, #109-S10~S12
   - 파일: `global/client/AnalysisClient`(요청·응답 계약, 길이 자르기, 오류 변환)
3. 하루 한도 — #109-S7~S9
   - 파일: `service/FollowupQuestionLimiter`
4. 조회·서비스·API — #109-S1~S5
   - 파일: `domain/repository/FeedbackRepository`, `service/FollowupQuestionService` + `impl`, `controller/FollowupQuestionController`, `domain/dto/response/FollowupQuestionsResponse`, `ErrorCode`(`AI_UNAVAILABLE`, `FOLLOWUP_LIMIT_EXCEEDED`)
5. 테스트
   - 파일: `AnalysisClientTest`(분석 서버 흉내: `MockRestServiceServer`), `FollowupQuestionLimiterTest`, `FollowupQuestionControllerTest`(분석 서버 클라이언트는 `@MockitoBean`)
   - 확인: 로컬에서는 컴파일만 하고(`./gradlew compileJava compileTestJava`), 테스트는 CI에서 돌린다

## 가정
- 분석 서버 계약은 `analysis-server`의 `api/schemas/followup.py`, `common.py`를 따른다. 계약에 없는 필드를 보내면 422로 거부되므로(`extra="forbid"`) 필드를 더하지 않는다
- 질문 개수(3개)와 문장 규칙(열린 질문, 리뷰에 있는 정보는 다시 묻지 않음)은 분석 서버가 정한다. 메인 백엔드는 받은 질문을 그대로 넘긴다
- 리뷰 상태(신고됨 등)와 관계없이 추천할 수 있다

## 참고
- 분석 서버 연동 가이드: `analysis-server/README.md` "메인 백엔드 연동 가이드"(camelCase, `X-Internal-Token`, `X-Request-ID`, 오류 `type`)
- 분석 서버의 내부 토큰은 32자 이상이다(`core/config.py`의 `internal_token`)
- 분석 서버는 문자열 길이를 코드 포인트로 센다. 메인 백엔드도 코드 포인트로 잘라 이모지가 반으로 잘리지 않게 한다
- Spring의 `HibernateJpaVendorAdapter`는 Hibernate 연결 방식을 `DELAYED_ACQUISITION_AND_HOLD`로 둔다. `open-in-view`가 켜져 있으면 한 번 잡은 DB 연결을 요청이 끝날 때까지 쥐고 있다
- nginx 설정(`nginx/*.conf`)에 `proxy_read_timeout`이 없어 기본 60초다
