# AI 리뷰 묶기·우선순위 (#107)

모집글(버전) 하나의 리뷰를 분석 서버에 보내 같은 문제끼리 묶고, 그룹마다 이름·카테고리·심각도·GitHub 이슈 초안을 받아 저장한다. 개수와 우선순위는 메인 백엔드가 매핑으로 계산한다. 버전 비교(#108)는 이 결과를 입력으로 쓴다. 프로젝트 도메인 전체에서 정한 것은 [README.md](README.md)에 있다. 시나리오는 `#107-S1`부터 센다.

## 한눈에
- 끝나면: 프론트가 `POST /api/v1/developer/recruitments/{recruitmentId}/analysis`로 분석을 시작하고(바로 202), `GET`으로 상태와 결과를 본다. 개발자는 `PATCH …/analysis/groups/{groupId}`로 그룹 이름·심각도·이슈 초안을 고친다. 구독한 프로젝트 주인만, 실행은 일주일에 3번까지
- 결정 필요: 없음
- 규모: 6단계

## 정한 것 (11-07)
분석 서버 주소·토큰, 트랜잭션 밖 호출, 오류 변환은 [README.md의 AI 분석 서버 연동](README.md#ai-분석-서버-연동-107109)을 따른다. 그룹 코드 발급은 [버전 비교 결정 4](ai-version-comparison.md#정한-것-11-07)와 같다.

| # | 결정 | 이유 |
| --- | --- | --- |
| 1 | 실행은 비동기다. 조건부 UPDATE(`analysis_status <> PENDING`일 때만 PENDING)로 시작을 막으며 접수 시각(`analysis_requested_at`)을 남기고, 분석 서버 호출·저장은 분석 전용 스레드(`analysisTaskExecutor`, 동시 4건, 대기 10건)에서 한다. 실행 API는 202와 현재 상태(PENDING)를 바로 돌려준다 (고침 #107: 대기 50건은 줄 끝이 최악 약 1시간 PENDING이라 10건(최악 약 20분)으로 줄이고 접수 시각을 더함) | 분석은 수십 초~몇 분 걸려 nginx 응답 대기(60초)를 넘는다. 조건부 UPDATE는 동시에 두 번 눌러도 한 번만 성공한다. 화면은 접수 시각으로 "n분째 분석 중"을 보여 준다 |
| 2 | 분석 서버 응답은 5분까지 기다린다(`analysis.review-analysis-read-timeout`). 후속 질문·비교는 그대로 30초다 | 사용자 요청을 붙잡지 않아 nginx 시간과 상관없다 |
| 3 | 분석이 실패하면(분석 서버 오류, 계약과 다른 응답, 저장 실패) `FAILED`로 바꾸고 기존 결과와 `analyzed_at`은 그대로 둔다. 그래서 지난 결과가 있으면 버전 비교는 계속 쓸 수 있고, 마지막 실패는 상태 `FAILED`로 알린다. 스레드 대기열이 차서 시작하지 못해도 같고 503 `AI_UNAVAILABLE`이다 (고침 #107: 처음에는 비교가 `DONE`만 받아, 재분석에 한 번 실패하면 다시 성공할 때까지 비교가 막혔다) | 저장은 한 트랜잭션이라 실패하면 지우기 전 상태로 돌아간다. 실패를 알리는 값을 따로 두지 않아도 상태(`FAILED`)와 `analyzed_at`으로 "지난 결과는 있고 마지막 시도는 실패"를 나타낼 수 있다 |
| 4 | 서버가 멈출 때(배포) 진행 중인 분석을 8초까지 기다려, 그 안에 끝나면 저장까지 마친다. 서버가 시작될 때 남아 있는 `PENDING`은 모두 `FAILED`로 바꾼다 (11-07 결정, 고침 #107: 멈출 때 기다리지 않아 배포마다 진행 중인 분석이 실패했다) | `docker stop`은 종료 신호 10초 뒤 강제로 끝내서 그보다 짧게 기다린다. 못 끝낸 분석은 끝나지 않는데, PENDING이 남으면 그 모집글은 다시 분석할 수 없다. 서버가 한 대라서 맞는 방법이다. 여러 대가 되면 접수 시각(`analysis_requested_at`)이 오래된 PENDING만 정리한다 |
| 5 | 보내는 리뷰는 그 모집글의 참가에 달린 제출(`SUBMITTED`)·지급(`REWARDED`) 리뷰이고, 1,000개가 넘으면 최근 제출한 1,000개다. 보낼 리뷰가 없으면 409 `NO_FEEDBACKS` (고침 #107: 신고(`REPORTED`)·보상 제외(`EXCLUDED`) 리뷰가 그룹과 리뷰 수에 섞였다) | 분석 서버는 1~1,000개를 받는다. 빠진 리뷰는 "아직 분석에 포함되지 않은 리뷰"로 센다 |
| 6 | 저장할 때 이 모집글의 기존 그룹과 매핑을 지운다. GitHub에 등록한(`git_issue_url`이 있는) 그룹은 매핑과 함께 그대로 둔다 | 등록한 이슈의 링크를 잃지 않는다. 남긴 그룹은 예전 분석 내용 그대로다 |
| 7 | 응답은 그대로 믿지 않는다. 그룹의 `feedbackIds` 중 이번에 보낸 리뷰만 매핑하고(중복은 한 번), 남는 리뷰가 없으면 그 그룹은 버린다. `representativeFeedbackId`가 그 그룹의 매핑에 있을 때만 대표 리뷰로 표시한다. `key`는 저장하지 않는다 | 리뷰 하나가 여러 그룹에 들어가는 것은 정상이다. 같은 그룹 안 중복은 유니크 제약(`cluster_group_id`, `feedback_id`)에 걸린다 |
| 8 | 카테고리는 `BUG`, `UX`, `REQUEST`, `PRAISE`, `UNCLASSIFIED`이다. 칭찬·미분류는 심각도와 이슈 초안을 null로 저장한다. 심각도가 1~4가 아니면 null로 저장한다. 모르는 카테고리는 계약 어긋남으로 분석 실패다 | 분석 서버 계약. #108 비교 요청도 칭찬·미분류만 심각도를 빼고 보낸다(고침 #107: 처음에는 BUG에만 보냈다) |
| 9 | 새 그룹은 응답 순서대로 프로젝트 최대 코드 + 1부터 코드를 받는다. 지우기 전에 최대 코드를 읽어 지운 코드를 다시 쓰지 않는다 | 코드는 백엔드만 발급한다. 같은 버전을 다시 분석하면 그룹은 새 코드를 받고, 이어 붙이기는 버전 비교(#108)가 한다 |
| 10 | 그룹 이름과 이슈 제목은 255자에서 자른다 | 두 컬럼이 `varchar(255)`라 길면 저장이 통째로 실패한다 |
| 11 | `recruitments.praise_summary`(칭찬 한 줄 요약, null 허용)를 더하고, `completeAnalysis(praiseSummary, now)`가 `DONE`·`analyzed_at`과 함께 기록한다 | 엔티티에 없었다. ERD에는 있다 |
| 12 | 실행은 개발자 한 명당 일주일에 3번이고 버전 비교와 따로 센다. 서울 시간 월요일 0시에 다시 세고, 분석이 실패하면 되돌린다 (11-07 결정) 지금은 `analysis.weekly-limit-enabled: false`(환경 변수 `ANALYSIS_WEEKLY_LIMIT_ENABLED`)로 꺼 두었고, `true`로 바꾸면 다시 센다 (고침 #107: 로컬 테스트 동안 횟수 제한을 끔, 11-07) | 이슈 #107의 "일주일에 3번". 세는 방식은 버전 비교(#108 결정 10)와 같다 |
| 13 | 그룹 수정은 보낸 값만 바꾼다(null은 그대로). 이름은 비울 수 없고, 칭찬·미분류 그룹은 심각도와 이슈 초안을 받으면 400 `INVALID_INPUT`이다 | 결정 8과 맞춘다. 엔티티에는 setter 대신 `rename`, `changeImprovementRank`, `editIssueDraft`를 둔다 |

## API

### 분석 실행 `POST /api/v1/developer/recruitments/{recruitmentId}/analysis`
- 본문 없음. 성공하면 202이고 본문은 조회와 같다(보통 `analysisStatus`가 `PENDING`이고 그룹은 지난 결과)
- 오류: 401 `UNAUTHORIZED`, 403 `SUBSCRIPTION_REQUIRED`, 404 `NOT_FOUND`(없거나 남의 모집글), 409 `NO_FEEDBACKS`, 409 `ANALYSIS_IN_PROGRESS`, 429 `ANALYSIS_LIMIT_EXCEEDED`, 503 `AI_UNAVAILABLE`(대기열이 참)
- 분석 서버 오류는 응답이 아니라 `analysisStatus: FAILED`로 알린다. 화면이 조회하는 방법은 [화면과 맞출 규칙](#화면과-맞출-규칙)을 따른다

### 분석 조회 `GET /api/v1/developer/recruitments/{recruitmentId}/analysis`
- 분석한 적이 없으면 `analysisStatus`가 `NONE`이고 그룹이 비어 있다
- 오류: 401, 403, 404 `NOT_FOUND`

```json
{
  "success": true,
  "data": {
    "recruitmentId": 12,
    "version": 1,
    "analysisStatus": "DONE",
    "analysisRequestedAt": "2026-11-07T09:59:30",
    "analyzedAt": "2026-11-07T10:00:00",
    "praiseSummary": "기록 화면이 깔끔하다는 의견이 많아요",
    "lastAnalyzedFeedbackAt": "2026-11-07T09:40:00",
    "unanalyzedFeedbackCount": 2,
    "groups": [
      {
        "groupId": 31, "groupCode": "7", "name": "로그인 시 앱 종료", "category": "BUG", "improvementRank": 1,
        "gitIssueTitle": "로그인 직후 앱 종료", "gitIssueContent": "## 재현\n…", "gitIssueUrl": null,
        "representativeFeedback": "로그인하면 앱이 꺼져요", "feedbackCount": 5, "testerCount": 4
      }
    ]
  }
}
```
- 정렬: 심각도 오름차순(null은 맨 뒤) → 테스터 수 내림차순 → 그룹 id
- `feedbackCount`는 그룹에 매핑된 리뷰 수, `testerCount`는 그 리뷰를 쓴 테스터 수(`register.user_id` 중복 제외)다. 저장하지 않고 `feedback_clusters`로 계산한다
- `lastAnalyzedFeedbackAt`은 매핑된 리뷰 중 가장 늦은 `submitted_at`, `unanalyzedFeedbackCount`는 이 모집글의 제출·지급 리뷰 중 어느 그룹에도 없는 수다(신고·보상 제외 리뷰는 세지 않는다)

### 그룹 수정 `PATCH /api/v1/developer/recruitments/{recruitmentId}/analysis/groups/{groupId}`
```json
{ "name": "로그인 직후 종료", "improvementRank": 2, "gitIssueTitle": "로그인 직후 앱 종료", "gitIssueContent": "…" }
```
- 모든 필드는 선택이다. 이름·이슈 제목 255자, 심각도 1~4
- 성공하면 200이고 본문은 조회와 같다. 오류: 400 `INVALID_INPUT`, 401, 403, 404 `NOT_FOUND`(없거나 그 모집글의 그룹이 아님)

### 분석 서버 `POST {analysis.base-url}/v1/analyses`
- 요청: `context`(프로젝트 제목·설명, 모집글 제목·설명·버전, 후속 질문과 같은 글자 수 자르기)와 `feedbacks`(`feedbackId`, `userId` = 참가한 테스터, `content`, `testItemTitle`, 기타 의견은 null)
- 응답: `groups`(`key`, `name`, `category`, `improvementRank`, `representativeFeedbackId`, `feedbackIds`, `gitIssueTitle`, `gitIssueContent`), `praiseSummary`. `groups`가 없으면 계약 어긋남이다

## 화면과 맞출 규칙
분석은 비동기라 화면이 상태를 다시 조회한다. 분석은 보통 수십 초, 길면 5분이고, 대기열에서 기다리면 최악 약 20분까지 `PENDING`일 수 있다.

| 상황 | 화면 |
| --- | --- |
| 실행 POST가 202 | 조회를 시작한다 |
| 실행 POST가 409 `ANALYSIS_IN_PROGRESS` | 오류로 보이지 않는다. 이미 분석 중이라는 뜻이라 202와 같이 조회를 시작한다(계속 기다리기) |
| 실행 POST가 503 `AI_UNAVAILABLE` | "잠시 후 다시 시도해 주세요"와 다시 시도 버튼을 보여 준다. 상태는 `FAILED`가 된다 |
| 조회 결과가 `PENDING` | 5초마다 다시 조회하고, `analysisRequestedAt`으로 "n분째 분석 중"을 보여 준다. 지난 결과(그룹)가 있으면 그대로 보여 준다 |
| 조회 결과가 `DONE` | 조회를 멈추고 결과를 보여 준다 |
| 조회 결과가 `FAILED` | 조회를 멈추고 "마지막 분석에 실패했어요"와 다시 시도 버튼을 보여 준다. `analyzedAt`이 있으면 지난 결과를 그대로 보여 준다 |
| 화면을 떠남 | 조회를 멈춘다 |

- 5초는 분석이 끝난 뒤 늦어도 5초 안에 결과가 보이고, 몇 분 동안 불러도 요청이 많지 않은 간격이다
- 버전 비교 버튼은 두 버전 모두 `analyzedAt`이 있고 어느 쪽도 `PENDING`이 아닐 때 켠다([버전 비교 결정 2](ai-version-comparison.md#정한-것-11-07))

## 1. 분석 실행과 저장 (#107-R1)

#107-S1 그룹·매핑·대표 리뷰 저장 [테스트]
- Given 구독한 개발자 A의 모집글에 테스터 3명의 리뷰 4개가 있다
- When  분석을 실행하고, 분석 서버가 그룹 3개를 주며 리뷰 하나가 두 그룹에 들어 있고, 칭찬 그룹에 보내지 않은 리뷰 ID가 섞여 있다
- Then  분석 서버에 리뷰 4개가 작성자·테스트 항목과 함께 간다
- Then  그룹 3개와 매핑이 저장되고, 두 그룹에 든 리뷰는 매핑이 두 줄이다. 보내지 않은 리뷰 ID는 버린다
- Then  대표 리뷰만 `is_representative`가 true이고, 칭찬 그룹은 심각도·이슈 초안이 null이다
- Then  칭찬 요약, `DONE`, `analyzed_at`, 접수 시각(`analysis_requested_at`)이 저장된다

#107-S2 새 코드 발급 [테스트: ReviewAnalysisControllerTest #107-S1]
- Given 같은 프로젝트의 다른 버전에 코드 "5"가 있다
- Then  새 그룹은 응답 순서대로 "6", "7", "8"을 받는다

#107-S3 다시 분석 [테스트]
- Given 지난 분석의 그룹 중 하나는 GitHub에 등록했다
- When  다시 분석한다
- Then  등록하지 않은 그룹과 그 매핑은 지워지고, 등록한 그룹은 매핑과 함께 남는다. 새 그룹은 새 코드를 받는다

#107-S4 분석 실패 [테스트]
- When  분석 서버가 실패한다(5xx, 연결 실패, 계약과 다른 응답)
- Then  `analysis_status`가 `FAILED`이고 지난 분석 결과와 `analyzed_at`은 그대로다. 이번 주 횟수는 되돌린다
- Then  지난 결과가 있으면 버전 비교는 그대로 쓸 수 있다 (#108-S7)

#107-S5 서버 재시작 [직접] (고침 #107: 멈출 때 진행 중인 분석을 기다림)
- Given 분석 중(PENDING)에 서버가 다시 시작된다(배포)
- Then  멈출 때 진행 중인 분석을 8초까지 기다려, 그 안에 끝나면 결과를 저장한다
- Then  못 끝낸 분석은 서버가 뜨면 `FAILED`가 되고 다시 실행할 수 있다. 지난 결과는 그대로다

#107-S13 신고·보상 제외 리뷰 [테스트: ReviewAnalysisControllerTest #107-S1]
- Given 모집글에 신고된(`REPORTED`) 리뷰와 보상에서 제외된(`EXCLUDED`) 리뷰가 있다
- Then  두 리뷰는 분석 서버에 보내지 않고, 아직 분석하지 않은 리뷰 수에도 세지 않는다

## 2. 권한과 조건 (#107-R2)

#107-S6 구독하지 않음 [테스트]
- When  구독하지 않은 프로젝트 주인이 실행한다
- Then  403 `SUBSCRIPTION_REQUIRED`이고 분석 서버를 부르지 않는다

#107-S7 내 모집글이 아님 [직접]
- Then  다른 회원의 모집글은 실행·조회·수정 모두 404 `NOT_FOUND`다 (확인 코드는 #108-S5와 같다)

#107-S8 중복 실행 [테스트]
- Given 분석이 진행 중이다(PENDING)
- When  다시 실행한다
- Then  409 `ANALYSIS_IN_PROGRESS`이고 분석 서버를 부르지 않으며 횟수를 쓰지 않는다

#107-S9 리뷰 없음 [직접]
- Then  리뷰가 없는 모집글은 409 `NO_FEEDBACKS` "분석할 리뷰가 없어요"

#107-S10 일주일에 3번 [테스트: VersionComparisonLimiterTest #108-S8]
- 버전 비교와 같은 주 단위 셈(`PeriodUsageLimiter`)이고 오류 코드만 `ANALYSIS_LIMIT_EXCEEDED`다. 비교 횟수와 따로 센다
- 참고: 지금은 한도를 꺼 두어 횟수 제한이 없다. 켰을 때와 껐을 때의 셈은 VersionComparisonLimiterTest가 확인한다

## 3. 조회와 수정 (#107-R3)

#107-S11 조회 [테스트: ReviewAnalysisControllerTest #107-S1]
- Then  그룹은 심각도 오름차순(null은 맨 뒤), 같으면 테스터 수 내림차순이다
- Then  그룹마다 리뷰 수, 테스터 수(같은 테스터의 리뷰는 한 명), 대표 리뷰 내용이 있다
- Then  마지막으로 분석한 리뷰 시각과 아직 분석하지 않은 리뷰 수가 있다

#107-S12 그룹 수정 [직접]
- When  그룹 이름·심각도·이슈 제목·내용을 보낸다
- Then  보낸 값만 바뀐다. 이름을 비우거나, 심각도가 1~4가 아니거나, 칭찬·미분류 그룹에 심각도·이슈 초안을 보내면 400 `INVALID_INPUT`이다

## 범위 밖
- GitHub 이슈 등록(`git_issue_url` 저장)
- 다시 분석한 뒤 이어진 버전 비교를 자동으로 다시 하는 것(#108 범위 밖과 같다)
- 분석 진행률, 완료 알림
- 서버 여러 대에서 멈춘 분석 정리, 여러 대가 함께 쓰는 한도

## 작업 순서
1. 엔티티 — `ClusterCategory`에 `UX`·`REQUEST`, `Recruitment.praiseSummary`·`completeAnalysis(praiseSummary, now)`, `ClusterGroup.rename`·`changeImprovementRank`·`editIssueDraft`
2. 공통 — 그룹 코드 발급(`GroupCodeIssuer`, #108에서 꺼냄), 분석 요청 값 만들기(`AnalysisRequests`, #109에서 꺼냄), 모집글 주인 확인 쿼리
3. 분석 서버 클라이언트 — `AnalysisClient.analyze`, 긴 응답 대기용 RestClient
4. 비동기와 상태 — `config/AsyncConfig`, 조건부 UPDATE, 시작 때 PENDING 정리(`InterruptedAnalysisRecovery`), 한도(`ReviewAnalysisLimiter`)
5. 조회·저장·서비스·API — `ReviewAnalysisReader`, `ReviewAnalysisWriter`, `ReviewAnalysisWorker`(@Async), `ReviewAnalysisService` + `impl`, `ReviewAnalysisController`, DTO, `ErrorCode`
6. 테스트 — `ReviewAnalysisControllerTest`(분석 서버 클라이언트는 `@MockitoBean`, 분석 스레드는 `@TestBean`으로 호출한 스레드에서 바로 실행)

## 참고
- 테스트는 분석 스레드를 `SyncTaskExecutor`로 바꿔 요청 안에서 분석까지 끝낸다. 그래서 비동기 경계와 트랜잭션 분리는 테스트가 확인하지 않는다
- `@Modifying` 조건부 UPDATE·삭제는 영속성 컨텍스트를 거치지 않아 `flushAutomatically`·`clearAutomatically`로 앞뒤를 맞춘다
