# GitHub 레포 연결 (#227)

개발자가 프로젝트에 GitHub 레포를 연결하게 해서, AI 리뷰 분석 그룹의 이슈 등록([ai-review-analysis.md](ai-review-analysis.md), #107)이 실제로 그 레포에 이슈를 올리게 한다. 지금까지는 `ProjectRepositoryLinkProvider`가 늘 "연결 안 됨"을 돌려주는 임시 구현이라 등록이 거절됐다. 도메인 전체에서 정한 것은 [README.md](README.md)에 있다.

시나리오 제목 끝의 태그가 확인 방법이다. `[테스트]`는 백엔드 테스트와 1:1이다(`@DisplayName("#227-S…")`).

## 이슈 #227 확인

| 이슈 항목 | 시나리오 |
| --- | --- |
| 1 저장소와 토큰을 GitHub로 확인한 뒤 저장 | #227-S1 |
| 2 저장소·토큰·이슈 설정이 틀리면 저장하지 않고 이유 | #227-S2 |
| 3 토큰은 암호화해 저장하고 나오지 않는다 | #227-S3 |
| 4 프로젝트 응답에 연결한 저장소 | #227-S4 |
| 5 연결 해제 | #227-S5 |
| 6 이슈 등록은 입력한 저장소로 간다 | #227-S6 |
| 7 다른 회원의 프로젝트는 404 | #227-S7 |

## 1. 연결과 해제 (#227-R1)

- 연결: `PUT /api/v1/developer/projects/{projectId}/repository` 본문 `{ repository, token }`. 응답은 프로젝트(`ProjectResponse`)이고 `repository`에 `owner/repo`가 온다
- 해제: `DELETE /api/v1/developer/projects/{projectId}/repository`. 응답은 프로젝트이고 `repository`는 null이다. 연결하지 않았어도 성공이다
- `repository`는 `owner/repo`와 `https://github.com/owner/repo`(끝의 `.git`·`/` 허용)를 받는다. 프론트 `validateRepository`와 같은 모양이고, `.`·`..`는 이름이 아니다. 틀리면 400 `fields.repository`
- `token`은 비울 수 없고 255자까지다. 레포를 바꿀 때도 토큰을 함께 보낸다. 앞뒤 공백은 지운다
- 저장하기 전에 토큰으로 `GET /repos/{owner}/{repo}`를 불러 확인한다. 통과해야 저장한다
  - 레포가 없거나 토큰으로 볼 수 없음: 424 `GITHUB_REPO_UNAVAILABLE`
  - 토큰이 틀리거나 만료: 424 `GITHUB_AUTH_REQUIRED`
  - 레포의 Issues가 꺼져 있음: 424 `GITHUB_ISSUES_DISABLED`
  - GitHub가 느리거나 한도 초과: 503 `GITHUB_UNAVAILABLE`
- 확인은 읽기만 한다. 이슈를 만들 수 있는지(쓰기 권한)는 실제 등록 때 GitHub가 정한다. 공개 레포는 남의 레포에도 이슈를 만들 수 있어서 쓰기 권한을 따로 확인하지 않는다
- 소유한 프로젝트만 바꾼다. 다른 회원의 프로젝트와 없는 프로젝트는 404이고 GitHub를 부르지 않는다

## 2. 저장 (#227-R2)

- `projects`에 `github_repository`(String 140, null 가능, `owner/repo`)와 `github_token`(String 512, null 가능)을 더한다. 두 칸은 함께 채우고 함께 지운다
- 토큰은 출금 계좌와 같은 `EncryptedStringConverter`(AES-GCM, `CASHOUT_ACCOUNT_CRYPTO_KEY`)로 암호화한다. 새 환경 변수는 없다
- 토큰은 `toString`, 응답, 로그에 나오지 않는다. `RepositoryLink.toString`도 토큰을 뺀다
- 테스트 서버는 `ddl-auto: update`라 컬럼이 자동으로 더해진다. 기존 프로젝트는 두 칸이 null이다
- `ProjectRepositoryLinkProvider`의 실제 구현은 `ProjectRepositoryLinks`다. 임시 구현 `NoRepositoryLinkProvider`는 지운다. 레포나 토큰이 하나라도 없으면 연결 안 됨(409 `GITHUB_REPO_NOT_LINKED`)이다

#227-S1 연결 [테스트]
- When  `https://github.com/Octo/booklog.git/`와 토큰을 앞뒤 공백과 함께 보낸다
- Then  GitHub 확인을 부르고 `Octo/booklog`와 공백을 지운 토큰이 저장된다
- When  `octo/booklog-web`으로 다시 연결한다
- Then  저장소가 바뀐다

#227-S2 확인 실패 [테스트]
- When  `booklog`, `octo/`, 다른 사이트 주소, `octo/..`, 공백이 낀 이름, `a/b/c`를 보낸다
- Then  400이고 `fields.repository`가 있으며 GitHub를 부르지 않는다
- When  토큰이 비어 있다
- Then  400이고 `fields.token`이 있다
- When  GitHub 확인이 레포 없음·토큰 오류·이슈 꺼짐·일시 오류로 거절한다
- Then  각 코드와 상태로 알리고 저장되지 않는다

#227-S3 토큰 암호화 [테스트]
- Then  DB의 `github_token`은 평문이 아닌 암호문이고, 연결·조회 응답에 토큰이 없다

#227-S4 프로젝트 응답 [테스트]
- Then  내 프로젝트 목록과 상세의 `repository`가 연결한 저장소이고 연결 전에는 null이다

#227-S5 해제 [테스트]
- When  연결한 프로젝트를 해제한다
- Then  저장소와 토큰이 지워지고 이슈 등록이 찾는 연결이 없다. 해제를 다시 해도 성공이다

#227-S6 이슈 등록이 쓰는 연결 [테스트]
- Given 레포를 연결했다
- Then  이슈 등록이 찾는 연결(`ProjectRepositoryLinkProvider.find`)이 입력한 owner·repo·토큰이다. 연결 전에는 비어 있다

#227-S7 남의 프로젝트 [테스트]
- When  다른 회원이나 없는 프로젝트의 연결·해제를 부른다
- Then  404이고 저장되지 않으며 GitHub를 부르지 않는다
- When  로그인하지 않고 부른다
- Then  401이다

## 범위 밖

- GitHub App·OAuth 연결: 개발자가 입력한 토큰(PAT)으로 정했다
- 토큰 권한 범위 검사, 이슈 등록 때 토큰을 바꾸는 일
- 프론트 모집 정보 탭의 저장소 칸을 이 API에 연결하는 일

## 가정

- 연결·해제는 구독 여부와 상관없이 할 수 있다. 이슈 등록 자체는 AI 분석처럼 구독이 필요하다([ai-review-analysis.md](ai-review-analysis.md))
- 토큰을 입력받는 방식이라 브라우저 → 프론트 서버 → 백엔드로 토큰이 지나간다. 프론트 서버 액션은 토큰을 로그에 남기지 않는다
- GitHub 확인 동안(최대 15초) 트랜잭션을 연 채로 기다린다. 연결을 바꿀 때만 부르는 드문 요청이라 그대로 두고, 잦아지면 확인을 트랜잭션 밖으로 뺀다(`ProjectServiceImpl.connectRepository`의 shortcut 주석)
