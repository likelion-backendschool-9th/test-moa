# AI 버전 간 비교 (#108)

같은 프로젝트에서 직전 버전과 현재 버전 모집글의 분석 그룹(#107)을 분석 서버에 보내, 같은 문제는 같은 그룹 코드로 이어 붙이고 변화를 한 문장으로 요약해 저장한다. 개발자는 저장된 결과로 "신규 / 이전에도 있음"과 "이번 버전에서 보고되지 않음"을 본다. 프로젝트 도메인 전체에서 정한 것은 [README.md](README.md)에 있다. 시나리오는 `#108-S1`부터 센다.

## 한눈에
- 끝나면: 프론트가 `POST /api/v1/developer/recruitments/{recruitmentId}/version-comparison`으로 비교를 실행하고, `GET`으로 같은 결과를 다시 본다. 구독한 프로젝트 주인만, 일주일에 3번까지 실행할 수 있다
- 결정 필요: 없음
- 규모: 5단계

## 정한 것 (11-07)
분석 서버 주소·토큰, 트랜잭션 밖 호출, 오류 변환은 [README.md의 AI 분석 서버 연동](README.md#ai-분석-서버-연동-107109)을 따른다.

| # | 결정 | 이유 |
| --- | --- | --- |
| 1 | 직전 버전은 같은 프로젝트에서 현재보다 `version`이 작은 모집글 중 가장 큰 것이다. 없으면 409 `NO_PREVIOUS_VERSION` | 비교는 항상 두 버전만 한다(이슈 #108) |
| 2 | 두 버전 중 `analysis_status`가 `DONE`이 아닌 것이 있으면 409 `ANALYSIS_NOT_DONE`이다. 분석을 대신 돌리지 않는다 | 이슈 본문은 "분석을 먼저 돌린 뒤 비교"지만, 리뷰 묶기(#107)는 비동기로 몇 분 걸려 한 요청에서 분석 두 번과 비교를 기다릴 수 없다. 프론트가 분석을 먼저 실행한다 |
| 3 | 구독(`SubscriptionChecker.require`)을 먼저 보고, 다른 회원 프로젝트의 모집글은 없는 모집글과 같이 404다. 실행과 조회 모두 같다 | #109와 같다 |
| 4 | 그룹 코드는 프로젝트 안에서 1부터 세는 숫자 문자열이다. 새 코드는 그 프로젝트에서 숫자로 읽히는 코드의 최대 + 1이고, 저장하는 동안 프로젝트 행을 잠가(`select … for update`) 동시에 같은 코드를 내지 않는다 | 코드는 백엔드만 발급한다. `group_code`가 문자열 컬럼이라 DB의 `max`로는 "9"가 "10"보다 커진다. #107도 같은 방식으로 발급한다 |
| 5 | 분석 서버의 짝은 그대로 믿지 않는다. `currentGroupId`가 현재 버전 그룹이 아니거나 `previousGroupId`가 직전 버전 그룹이 아니면 버린다. 한 그룹은 한 번만 짝짓고(앞의 짝을 씀), `newGroupIds`에 있어도 이미 짝지은 그룹은 건너뛴다. 어느 쪽에도 없는 현재 그룹은 코드를 그대로 둔다 | 한 버전 안에서 같은 코드가 두 번 나오면 "같은 문제"라는 뜻이 깨진다 |
| 6 | `notReportedGroupIds`는 저장하지 않는다. 조회할 때 "직전 버전에는 있고 현재 버전에는 없는 코드"의 그룹으로 계산한다 | 이슈 #108. 코드가 바뀌면 저절로 맞는다 |
| 7 | `version_comparisons`는 모집글당 한 행이다. 다시 비교하면 요약과 직전 버전을 덮어쓰고 `updated_at`을 지금으로 바꾼다. 요약이 같아도 갱신되게 시각을 직접 넣는다 | `@UpdateTimestamp`는 바뀐 값이 없으면 UPDATE를 내지 않아, 같은 요약이 오면 비교가 오래된 것으로 남는다 |
| 8 | 비교가 오래됐는지(`stale`)는 `version_comparisons.updated_at`이 두 모집글의 `analyzed_at` 중 하나보다 이르면 true다 | 비교한 뒤 어느 버전을 다시 분석하면 짝이 맞지 않을 수 있다 |
| 9 | `recruitments.analyzed_at`(분석 완료 시각, 분석 전 null)을 더하고, `completeAnalysis(praiseSummary, now)`가 `DONE`과 함께 기록한다 (11-07 결정, 고침 #107: 칭찬 요약을 함께 받음) | 8에 필요하고 엔티티에 없었다. ERD에는 이미 있다. #107이 분석을 저장할 때 이 메서드를 부른다 |
| 10 | 실행은 개발자 한 명당 일주일에 3번이다. 서울 시간 월요일 0시에 다시 세고, 분석 서버에서 결과를 받은 요청만 센다. 서버 메모리로 센다 (11-07 결정) | 이슈 #108의 "일주일에 3번". 세는 단위는 이슈에서 정할 것이었고 개발자별로 정했다. 하루 한도(#109)와 같은 코드(`PeriodUsageLimiter`)로 센다 |
| 11 | 분석 서버에 보내는 그룹 이름은 200자, 대표 리뷰는 4,000자까지 자른다 | 후속 질문(#109-S3)의 제목·리뷰 한도와 같다고 본다 |
| 12 | 화면 문구와 응답 필드에 "해결됨"을 쓰지 않는다. 필드는 `notReportedGroups`, 문구는 "이번 버전에서 보고되지 않음"이다 | 이번 버전 테스터가 그 부분을 안 봤을 수도 있다 |

## API

### 비교 실행 `POST /api/v1/developer/recruitments/{recruitmentId}/version-comparison`
- 본문 없음. `recruitmentId`는 현재 버전 모집글이다
- 성공하면 200이고 본문은 조회와 같다
- 오류: 401 `UNAUTHORIZED`, 403 `SUBSCRIPTION_REQUIRED`, 404 `NOT_FOUND`(없거나 남의 모집글), 409 `NO_PREVIOUS_VERSION`, 409 `ANALYSIS_NOT_DONE`, 429 `COMPARISON_LIMIT_EXCEEDED`, 503 `AI_UNAVAILABLE`, 500 `INTERNAL_ERROR`(분석 서버 계약 어긋남)

### 비교 조회 `GET /api/v1/developer/recruitments/{recruitmentId}/version-comparison`
- 오류: 401, 403, 404 `NOT_FOUND`, 404 `COMPARISON_NOT_FOUND`(아직 비교 전)

```json
{
  "success": true,
  "data": {
    "currentRecruitmentId": 12,
    "currentVersion": 2,
    "previousRecruitmentId": 10,
    "previousVersion": 1,
    "summary": "로그인 종료 문제는 이어지고, 결제 화면 문제가 새로 보고됐어요",
    "comparedAt": "2026-11-07T10:00:00",
    "stale": false,
    "groups": [
      { "groupId": 21, "groupCode": "1", "name": "로그인 시 앱 종료", "category": "BUG", "improvementRank": 1, "previouslyReported": true },
      { "groupId": 23, "groupCode": "4", "name": "결제 버튼 안 눌림", "category": "BUG", "improvementRank": 2, "previouslyReported": false }
    ],
    "notReportedGroups": [
      { "groupId": 12, "groupCode": "2", "name": "글자가 잘림", "category": "BUG", "improvementRank": 3 }
    ]
  }
}
```
- `groups`는 현재 버전 그룹이다. `previouslyReported`는 직전 버전에 같은 `groupCode`가 있으면 true("이전에도 있음"), 아니면 false("신규")다
- `notReportedGroups`는 직전 버전 그룹 중 현재 버전에 같은 코드가 없는 것이다
- 칭찬·미분류 그룹은 `improvementRank`가 null이다

### 분석 서버 `POST {analysis.base-url}/v1/comparisons`
- 요청: `previous`·`current` 각각 `version`과 `groups`(`groupId`, `name`, `category`, `improvementRank`, `sample`). `sample`은 그 그룹의 대표 리뷰(`feedback_clusters.is_representative`) 내용이고 없으면 null, `improvementRank`는 칭찬·미분류에서 null이다
- 응답: `matches`(`currentGroupId`, `previousGroupId`), `newGroupIds`, `notReportedGroupIds`, `summary`. `matches`·`newGroupIds`·`summary`가 없으면 계약 어긋남으로 500이다. `notReportedGroupIds`는 읽지 않는다(결정 6)

## 1. 비교 실행 (#108-R1)

#108-S1 코드 이어받기와 새 코드 발급 [테스트]
- Given 구독한 개발자 A의 프로젝트에 분석을 마친 1버전(그룹 g11 코드 "1", g12 코드 "2")과 2버전(그룹 g21, g22, g23)이 있다
- When  A가 2버전으로 비교를 실행하고, 분석 서버가 `matches` [g21↔g11], `newGroupIds` [g23], `summary`를 준다
- Then  분석 서버에 두 버전의 그룹 이름·카테고리·심각도·대표 리뷰가 가고, 칭찬 그룹의 `improvementRank`는 null이다
- Then  g21의 코드는 "1"이 되고, g23은 프로젝트 최대 코드 + 1을 받는다. g22는 코드가 그대로다
- Then  `version_comparisons`에 요약과 직전 버전이 저장된다

#108-S2 다시 비교 [직접]
- When  같은 모집글로 다시 비교한다
- Then  `version_comparisons` 행은 하나이고 요약과 `updated_at`이 바뀐다. 이번 응답에서 신규인 그룹은 새 코드를 다시 받는다

#108-S3 잘못된 그룹 ID 무시 [테스트]
- When  분석 서버가 다른 버전의 그룹, 없는 ID, 이미 짝지은 그룹을 `matches`·`newGroupIds`에 넣는다
- Then  그 짝은 버리고 나머지만 저장한다. 요청은 성공한다

## 2. 권한과 조건 (#108-R2)

#108-S4 구독하지 않음 [테스트]
- When  구독하지 않은 프로젝트 주인이 실행하거나 조회한다
- Then  403 `SUBSCRIPTION_REQUIRED`이고 분석 서버를 부르지 않는다

#108-S5 내 모집글이 아님 [테스트]
- When  구독 중인 A가 다른 회원의 모집글로 실행한다
- Then  404 `NOT_FOUND`이고 분석 서버를 부르지 않는다

#108-S6 직전 버전 없음 [테스트]
- Given 프로젝트에 1버전만 있다
- Then  409 `NO_PREVIOUS_VERSION`이고 분석 서버를 부르지 않는다

#108-S7 분석 전 버전 [직접]
- Given 두 버전 중 하나가 `DONE`이 아니다
- Then  409 `ANALYSIS_NOT_DONE`이고 분석 서버를 부르지 않는다

#108-S8 일주일에 3번 [테스트]
- When  A가 같은 주에 네 번 실행한다
- Then  세 번은 결과를 받고, 네 번째는 429 `COMPARISON_LIMIT_EXCEEDED`이며 분석 서버를 부르지 않는다
- Then  서울 시간 월요일 0시가 지나면 다시 세 번 쓸 수 있다. 결과를 받지 못한 요청은 세지 않는다

#108-S9 분석 서버 오류 [테스트: AnalysisClientTest #109-S10]
- 후속 질문과 같은 호출 코드를 써서 5xx·연결 실패·시간 초과는 503 `AI_UNAVAILABLE`이다

## 3. 비교 조회 (#108-R3)

#108-S10 조회 응답 [테스트: VersionComparisonControllerTest #108-S1]
- Given #108-S1의 비교를 마쳤다
- Then  실행 응답과 조회 응답에 요약, 두 버전, `stale` false가 있다
- Then  `groups`에서 g21만 `previouslyReported`가 true("이전에도 있음")이고, `notReportedGroups`는 g12("이번 버전에서 보고되지 않음")다

#108-S11 오래된 비교 [직접]
- Given 비교한 뒤 두 버전 중 하나를 다시 분석했다(`analyzed_at`이 비교 시각보다 늦다)
- Then  `stale`이 true다

#108-S12 비교 전 [직접]
- When  아직 비교하지 않은 모집글을 조회한다
- Then  404 `COMPARISON_NOT_FOUND` "아직 버전 비교를 하지 않았어요"

## 범위 밖
- 리뷰 묶기와 분석 저장. 그룹과 `DONE` 상태는 [리뷰 묶기(#107)](ai-review-analysis.md)가 만든다
- 다시 분석한 버전과 이어진 비교를 자동으로 다시 하는 것(이슈 시나리오 6). 지금은 `stale`만 알려 준다
- 숫자(버전별 응답 수, 그룹별 리뷰 수, 심각도 분포), 그룹별 대표 리뷰, 칭찬 요약, 마지막 분석 리뷰 시각(이슈 시나리오 7)
- 프론트 화면
- 서버 여러 대가 함께 쓰는 한도

## 작업 순서
1. 엔티티 — `Recruitment.analyzedAt`·`completeAnalysis`, `ClusterGroup.updateGroupCode`, `VersionComparison.overwrite`
2. 한도 — #108-S8
   - 파일: `service/PeriodUsageLimiter`(#109 `FollowupQuestionLimiter`에서 꺼냄), `service/VersionComparisonLimiter`
3. 분석 서버 클라이언트 — `global/client/AnalysisClient.compare`
4. 조회·저장·서비스·API — #108-S1~S7, S10~S12
   - 파일: `ClusterGroupRepository`, `FeedbackClusterRepository`, `VersionComparisonRepository`, `RecruitmentRepository`·`ProjectRepository`에 쿼리 추가, `service/VersionComparisonReader`(읽기 트랜잭션), `service/VersionComparisonWriter`(저장 트랜잭션), `service/VersionComparisonService` + `impl`, `controller/VersionComparisonController`, `dto/response/VersionComparisonResponse`, `ErrorCode`
5. 테스트 — `VersionComparisonControllerTest`(분석 서버 클라이언트는 `@MockitoBean`), `VersionComparisonLimiterTest`

## 가정
- 지금 모집 작성 API는 모집글을 늘 1버전으로 만든다. 버전을 올리는 규칙이 생겨야 실제 데이터로 비교할 수 있다
- 분석 서버의 `/v1/comparisons` 글자 수 한도는 후속 질문과 같다(결정 11). 다르면 `AnalysisClient`의 상수를 맞춘다

## 참고
- 분석 서버 호출 구조는 후속 질문과 같다: 서비스에는 트랜잭션을 두지 않고, 조회와 요청 만들기는 짧은 읽기 트랜잭션(`VersionComparisonReader`), 결과 저장은 짧은 쓰기 트랜잭션(`VersionComparisonWriter`)에서 한다
- 백엔드 테스트는 CI의 Postgres에서 돈다. 로컬에서 이 기능의 테스트만 돌릴 때는 개발 DB 대신 메모리 H2를 쓰고, 출금 계좌 키는 `application-test.yml`의 테스트 전용 키를 넘긴다(Git Bash): `CASHOUT_ACCOUNT_CRYPTO_KEY=dGVzdC1jYXNob3V0LWtleS0zMi1ieXRlcy1sb25nISE= SPRING_DATASOURCE_URL=jdbc:h2:mem:test SPRING_DATASOURCE_USERNAME=sa SPRING_DATASOURCE_PASSWORD= SPRING_JPA_HIBERNATE_DDL_AUTO=create-drop ./gradlew test --tests '*VersionComparison*'`
