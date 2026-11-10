# 버전 별 분석 탭 API (#168)

모집 관리의 버전 별 분석 탭(`/developer/recruitments/{key}?tab=versions`)을 실제 API로 그리는 데 모자란 백엔드를 더한다. 비교 실행·조회는 [AI 버전 간 비교(#108)](ai-version-comparison.md), 두 버전의 그룹·리뷰 수·미분석 리뷰 수는 [리뷰 분석 조회(#107)](ai-review-analysis.md)를 그대로 쓴다. 시나리오는 `#168-S1`부터 센다.

## 한눈에
- 끝나면: 화면이 비교 조회 한 번으로 "이전 버전 없음 / 분석 전 / 비교 전 / 결과"를 가르고, 레포트에 그룹의 리뷰를 보여 주고, 그룹 전체 목록에서 고친 짝을 저장한다
- 결정 필요: 없음
- 규모: 3단계

## 화면이 부르는 API

| 화면 | API | 비고 |
| --- | --- | --- |
| 탭 상태, 요약, 신규·이어짐·보고 안 됨 | `GET .../{id}/version-comparison` | 비교 전 오류를 나눔(#168-S1) |
| 비교 실행 | `POST .../{id}/version-comparison` | 그대로 |
| 막대의 리뷰 수, 그룹 전체 목록, 미반영 리뷰 수 | 두 버전의 `GET .../{id}/analysis` | `feedbackCount`, `unanalyzedFeedbackCount` 그대로 |
| 레포트의 그룹 리뷰 | `GET .../{id}/analysis/groups/{groupId}/reviews` | 새로 만듦(#168-R2) |
| 짝 고친 뒤 저장 | `PUT .../{id}/version-comparison/links` | 새로 만듦(#168-R3) |

`...`은 `/api/v1/developer/recruitments`다. 모두 로그인·구독이 필요하고, 다른 회원의 모집글·그룹은 없는 것과 같이 404 `NOT_FOUND`다.

## 정한 것 (11-09)

| # | 결정 | 이유 |
| --- | --- | --- |
| 1 | 비교 조회에서 저장된 비교가 없으면 직전 버전 없음(409 `NO_PREVIOUS_VERSION`) → 두 버전 중 분석 결과 없음(409 `ANALYSIS_NOT_DONE`) → 404 `COMPARISON_NOT_FOUND` 순으로 본다. 저장된 비교가 있으면 지금처럼 결과를 준다 | 화면의 네 상태를 한 번에 가른다. 실행과 같은 오류 코드라 화면이 새 코드를 배우지 않는다 |
| 2 | 비교 응답에 두 버전 모집글 제목 `currentTitle`·`previousTitle`을 더한다 | 레포트 머리에 쓰고, 모집글 상세를 한 번 더 부르지 않는다 |
| 3 | 그룹 리뷰는 제출·지급 리뷰만, 대표 리뷰가 먼저이고 나머지는 최근 제출 순이다 | 리뷰 수(`feedbackCount`)를 세는 기준·칭찬 목록과 같다 |
| 4 | 짝 저장은 이번 버전 그룹마다 직전 버전 그룹 하나(`previousGroupId`) 또는 null(짝 없음)을 받는다. 짝을 주면 그 그룹의 코드를 이어받고, null이면 직전 버전 코드를 쓰던 그룹만 새 코드를 받는다. 보내지 않은 그룹이 이번에 이어받은 코드를 쓰고 있으면 그 그룹도 새 코드를 받는다 | 화면 `relinkGroup`과 같은 규칙이다. 한 버전 안에서 같은 코드가 두 번 나오지 않는다(#108 결정 5) |
| 5 | 짝 저장의 잘못된 값은 버리지 않고 400 `INVALID_INPUT`이다: 이번 버전 그룹이 아닌 `groupId`, 직전 버전 그룹이 아닌 `previousGroupId`, 같은 `groupId`나 같은 `previousGroupId`가 두 번 | 분석 서버 응답(#108 결정 5)과 달리 사람이 고른 값이라 조용히 버리면 저장한 줄 안다 |
| 6 | 짝 저장은 비교 결과가 있어야 하고(404 `COMPARISON_NOT_FOUND`), 두 버전 중 하나라도 분석 중이면 409 `ANALYSIS_IN_PROGRESS`다. 직전 버전은 저장된 비교의 직전 버전이다 | 분석이 끝나면 그룹이 바뀌어 고친 짝이 사라진다 |
| 7 | 짝 저장은 요약과 비교 시각(`comparedAt`)을 바꾸지 않고, 주 3번 한도도 쓰지 않는다 | 분석 서버를 부르지 않는다. 요약은 AI가 쓴 것으로 남는다 |
| 8 | 새 코드는 비교 저장과 같이 `GroupCodeIssuer`가 프로젝트 행을 잠그고 낸다 | 동시에 같은 코드를 내지 않는다(#108 결정 4) |

## API

### 그룹 리뷰 목록 `GET .../{recruitmentId}/analysis/groups/{groupId}/reviews`
```json
{
  "success": true,
  "data": [
    { "feedbackId": 31, "registerId": 7, "nickname": "모아", "testItemTitle": "로그인", "content": "로그인하면 앱이 꺼져요", "submittedAt": "2026-11-07T10:00:00", "representative": true }
  ]
}
```
- `testItemTitle`은 기타 의견이면 null이다
- `registerId`는 그 리뷰를 쓴 참가의 id다 (고침 #195: 버전 비교 화면에서 채팅 걸기에 참가 id가 필요하다)
- 오류: 401, 403 `SUBSCRIPTION_REQUIRED`, 404 `NOT_FOUND`(없거나 다른 모집글·회원의 그룹)

### 짝 저장 `PUT .../{recruitmentId}/version-comparison/links`
```json
{ "links": [ { "groupId": 21, "previousGroupId": 11 }, { "groupId": 23, "previousGroupId": null } ] }
```
- 바꾼 그룹만 보내도 된다. 성공하면 200이고 본문은 비교 조회와 같다
- 오류: 400 `INVALID_INPUT`, 401, 403, 404 `NOT_FOUND`, 404 `COMPARISON_NOT_FOUND`, 409 `ANALYSIS_IN_PROGRESS`

## 1. 비교 조회의 상태 (#168-R1)

#168-S1 비교 전 상태 나누기 [테스트]
- Given 구독한 개발자의 프로젝트에 1버전만 있다
- Then  비교 조회는 409 `NO_PREVIOUS_VERSION`이다
- Given 1·2버전이 있고 2버전은 분석 전이다
- Then  409 `ANALYSIS_NOT_DONE`이다
- Given 두 버전 모두 분석했고 비교 전이다
- Then  404 `COMPARISON_NOT_FOUND`다

#168-S2 두 버전 제목 [테스트: VersionComparisonControllerTest #108-S1]
- Then  실행·조회 응답에 `currentTitle`·`previousTitle`이 있다

## 2. 그룹 리뷰 (#168-R2)

#168-S3 그룹 리뷰 목록 [테스트]
- Given 그룹에 대표 리뷰 하나, 다른 리뷰 둘, 신고된 리뷰 하나가 있다
- Then  대표 리뷰가 먼저, 나머지는 최근 제출 순이고 신고된 리뷰는 없다. 테스터 닉네임과 테스트 항목 이름이 있다

#168-S4 남의 그룹 [테스트]
- When  다른 모집글의 그룹 id로, 또는 다른 회원이 조회한다
- Then  404 `NOT_FOUND`다

## 3. 짝 저장 (#168-R3)

#168-S5 짝 바꾸기와 풀기 [테스트]
- Given #108-S1처럼 비교해 g21이 g11의 코드 "1"을 이어받았다
- When  g23을 g11과 잇고, g21의 짝을 푼다
- Then  g23의 코드는 "1"이고 g21은 새 코드를 받는다. 응답에서 g23이 "이전에도 있음", g21이 "신규"다. 요약과 비교 시각은 그대로다

#168-S6 보내지 않은 그룹의 코드가 겹침 [테스트]
- When  g21을 보내지 않고 g23만 g11과 잇는다
- Then  g23이 "1", g21은 새 코드를 받는다

#168-S7 잘못된 짝 [테스트]
- When  직전 버전 그룹을 `groupId`에, 이번 버전 그룹을 `previousGroupId`에 넣거나, 같은 직전 그룹을 두 번 넣는다
- Then  400 `INVALID_INPUT`이고 코드는 하나도 바뀌지 않는다

#168-S8 비교 전이나 분석 중 [테스트]
- When  비교 전에 저장한다
- Then  404 `COMPARISON_NOT_FOUND`다
- When  두 버전 중 하나를 다시 분석하는 중에 저장한다
- Then  409 `ANALYSIS_IN_PROGRESS`다

## 범위 밖
- 화면 연결은 `AUTH_MODE=backend`일 때만이다. 버전 별 분석 탭은 `getVersionComparison`, 리뷰 분석 탭(`?tab=analytics`)은 `getAiAnalysis`가 #107 API(분석 실행·조회, 칭찬, 그룹 리뷰, 그룹 수정, 이슈 등록)와 피드백 목록(리뷰 수·시간대별 수)을 부른다(`features/recruitment/api.ts`)
- 다음 버전(3버전)의 비교. 2버전 코드를 바꾸면 3버전과의 이어짐도 코드로 다시 계산된다
- 짝을 고친 뒤 요약을 다시 쓰는 것

## 작업 순서
1. 비교 조회 상태와 제목 — #168-S1, S2
   - 파일: `service/VersionComparisonReader`, `dto/response/VersionComparisonResponse`
2. 그룹 리뷰 목록 — #168-S3, S4
   - 파일: `FeedbackClusterRepository`, `dto/response/GroupReviewResponse`, `ReviewAnalysisReader`·`ReviewAnalysisService`·`impl`, `ReviewAnalysisController`
3. 짝 저장 — #168-S5~S8
   - 파일: `dto/request/VersionLinksUpdateRequest`, `VersionComparisonWriter.relink`, `VersionComparisonService`·`impl`, `VersionComparisonController`

## 참고
- 로컬에서 이 기능 테스트만 돌리는 명령은 [ai-version-comparison.md의 참고](ai-version-comparison.md#참고)와 같고 `--tests '*VersionComparison*' --tests '*ReviewAnalysisController*'`로 고른다
