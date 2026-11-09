# 협업 규칙

브랜치, 커밋 메시지, PR을 어떻게 쓰는지 정한 팀 규칙입니다.

## Git Flow

| 브랜치 | 용도 |
| --- | --- |
| `main` | 운영 배포용 브랜치. 지금은 `develop`의 내용을 보관만 하고 배포하지 않음 |
| `develop` | 개발을 위한 브랜치. 머지되면 테스트 서버(3005번 포트)에 배포 |
| `feature` | 각각의 개발자가 기능을 개발하는 브랜치 |
| `hotfix` | 출시 버전에서 발생한 버그를 수정하는 브랜치 |

`release` 브랜치는 쓰지 않습니다. 실제 운영 단계로 넘어가면 `main`을 운영 서버에 배포합니다.

## Commit Message Rules

커밋 메시지는 `유형: 변경 내용` 형식으로 작성합니다.

| 유형 | 사용 기준 |
| --- | --- |
| `Feat` | 새로운 기능 및 관련 파일 추가 |
| `Fix` | 버그 수정 |
| `Docs` | README를 포함한 모든 문서의 추가 및 수정 |
| `Style` | 코드 포맷, 세미콜론 누락 등 코드 자체의 변경이 없는 경우 |
| `Refactor` | 코드 리팩토링 |
| `Test` | 테스트 코드 추가 및 리팩토링 |
| `Chore` | 패키지 매니저 및 설정 파일 수정 등 기타 작업. 예: `.gitignore` |
| `Design` | CSS 등 사용자 UI 디자인 변경 |
| `Comment` | 필요한 주석 추가 및 변경 |
| `Rename` | 파일 또는 폴더 이름 수정 및 위치 변경 |
| `Remove` | 파일 삭제 |
| `!BREAKING CHANGE` | API의 대대적인 변경 |
| `!HOTFIX` | 긴급한 버그 수정 |

예시:

```text
Fix: 북마크 테스트 수정
```

## Pull Request Rules

PR 제목은 커밋 메시지와 같은 `유형: 변경 내용` 형식으로 작성합니다.

| 작업 브랜치 | base 브랜치 |
| --- | --- |
| `feature/*` | `develop` |
| `develop` | `main` |
| `hotfix/*` | `main` |

`develop`과 `main`에는 브랜치 보호 규칙이 걸려 있습니다.

- 직접 push와 force push, 브랜치 삭제는 막혀 있고 PR로만 머지합니다.
- CI 검사 4개(`Frontend lint·build`, `Backend test`, `Docker build (backend)`, `Docker build (frontend)`)가 통과해야 합니다.
- 본인 외 팀원 1명이 승인해야 합니다. 승인 뒤 커밋을 더 올리면 다시 승인을 받습니다.

PR 본문은 [PR 템플릿](.github/pull_request_template.md)을 따릅니다. 필수 섹션은 비우지 않고, 해당 없는 선택 섹션은 지웁니다.

PR을 열면 [PR meta 워크플로](.github/workflows/pr-meta.yml)가 연 사람을 담당자로 넣고, 제목 유형으로 라벨을 붙입니다. 라벨은 붙이기만 하고, 직접 붙인 라벨은 지우지 않습니다.

| 제목 유형 | 라벨 |
| --- | --- |
| `Feat`, `Design` | `enhancement` |
| `Fix`, `!HOTFIX` | `bug` |
| `Docs` | `documentation` |
| `Test` | `test` |
| `Refactor` | `refactor` |
| `Chore`, `Style`, `Comment`, `Rename`, `Remove` | `chore` |
| `!BREAKING CHANGE` | `breaking change` |

| 섹션 | 구분 | 내용 |
| --- | --- | --- |
| 변경 요약 | 필수 | 무엇이 왜 바뀌었는지 사용자·화면 기준으로 한두 문장 |
| 관련 문서·이슈 | 필수 | 계획 문서(`docs/`) 링크, 이슈 번호 |
| 시나리오 | 필수 | 이번 PR에서 완료한 시나리오 번호와 남은 번호. 번호는 이슈마다 1부터 센다(`#42-S1`) |
| 확인 방법 | 필수 | 실행한 테스트와 결과, `[직접]` 시나리오마다 확인한 URL·조건과 결과 |
| 화면 변경 | 선택 | 바뀐 화면의 전후 스크린샷. `Design` 커밋이 있으면 필수 |
| 리뷰 포인트 | 선택 | 판단이 애매했던 곳, 일부러 하지 않은 것, 미정 규칙 |
| 배포 영향 | 선택 | Breaking change·Hotfix의 영향 범위와 되돌리는 방법 |
| 설정·의존성 | 선택 | 새 패키지·환경 변수, 팀원이 따로 해야 할 일 |
