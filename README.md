<a id="readme-top"></a>

<div align="center">
  <a href="https://github.com/likelion-backendschool-9th/test-moa/graphs/contributors"><img src="https://img.shields.io/github/contributors/likelion-backendschool-9th/test-moa.svg?style=for-the-badge" alt="Contributors"></a>
  <a href="https://github.com/likelion-backendschool-9th/test-moa/issues"><img src="https://img.shields.io/github/issues/likelion-backendschool-9th/test-moa.svg?style=for-the-badge" alt="Issues"></a>
  <a href="https://github.com/likelion-backendschool-9th/test-moa/pulls"><img src="https://img.shields.io/github/issues-pr/likelion-backendschool-9th/test-moa.svg?style=for-the-badge" alt="Pull Requests"></a>
</div>

<br/>

<div align="center">
  <a href="https://test-moa.newlecture.com">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="docs/images/logo-dark.png">
      <img src="docs/images/logo-light.png" width="240" alt="test moa">
    </picture>
  </a>

  <h3 align="center">써 보고, 남기고, 받고</h3>

  <p align="center">
    개발자와 테스터를 연결하는 소프트웨어 테스터 모집 플랫폼
    <br/>
    <a href="docs/README.md"><strong>문서 살펴보기 »</strong></a>
    <br/>
    <br/>
    <a href="https://test-moa.newlecture.com">테스트 서버</a>
    &middot;
    <a href="https://github.com/likelion-backendschool-9th/test-moa/issues/new?template=2-bug.yml">버그 제보</a>
    &middot;
    <a href="https://github.com/likelion-backendschool-9th/test-moa/issues/new?template=1-feature.yml">기능 제안</a>
  </p>
</div>

<br/>

<details>
  <summary>목차</summary>
  <ol>
    <li>
      <a href="#프로젝트-소개">프로젝트 소개</a>
      <ul>
        <li><a href="#기획-의도">기획 의도</a></li>
        <li><a href="#이용-흐름">이용 흐름</a></li>
        <li><a href="#주요-기능">주요 기능</a></li>
        <li><a href="#기술-스택">기술 스택</a></li>
      </ul>
    </li>
    <li>
      <a href="#시스템-설계">시스템 설계</a>
      <ul>
        <li><a href="#시스템-구성">시스템 구성</a></li>
        <li><a href="#데이터-모델">데이터 모델</a></li>
        <li><a href="#기술적으로-고민한-점">기술적으로 고민한 점</a></li>
      </ul>
    </li>
    <li>
      <a href="#시작하기">시작하기</a>
      <ul>
        <li><a href="#사전-준비">사전 준비</a></li>
        <li><a href="#설치-및-실행">설치 및 실행</a></li>
      </ul>
    </li>
    <li><a href="#로드맵">로드맵</a></li>
    <li><a href="#협업">협업</a></li>
    <li><a href="#팀">팀</a></li>
    <li><a href="#참고-문서">참고 문서</a></li>
  </ol>
</details>

<br/>
<br/>

## 프로젝트 소개

![Test Moa 홈 화면](docs/images/home-mockup.png)

<p align="center"><sub>목업 데이터로 띄운 홈 화면입니다. 실제 시연 화면은 추가할 예정입니다.</sub></p>

<br/>

### 기획 의도

서비스를 만든 개발자에게는 실제로 써 보고 의견을 줄 사람이 필요합니다. 하지만 **적합한 테스터를 모으는 일도, 유용한 피드백을 받는 일도** 쉽지 않습니다. Test Moa는 이 두 가지 어려움을 함께 풀기 위해 시작했습니다.

| 어려움 | Test Moa의 방식 |
| --- | --- |
| 적합한 테스터를 찾기 어렵다 | 필요한 경험·관심사·사용 환경을 모집 조건으로 안내합니다. 개발 경험이 없어도 테스터가 될 수 있습니다. |
| 유용한 피드백을 받기 어렵다 | 요청한 항목별 수행 결과와 사용 경험, 버그 재현 방법을 정해진 양식으로 받습니다. |
| 테스터가 참여할 이유가 필요하다 | 피드백을 제출하면 크레딧으로 보상합니다. 버그를 찾지 못해도 요청한 테스트를 수행했다면 보상 대상입니다. |
| 모집 비용이 부담스럽다 | 무료로 모집할 수 있고, 개발자가 보상 예산을 따로 충전하지 않습니다. |

<br/>

### 이용 흐름

1. **등록** 개발자가 프로젝트를 등록하고 모집 글을 작성합니다.
2. **지원** 테스터가 조건과 일정을 확인하고 지원합니다.
3. **테스트** 참여가 확정되면 안내된 항목을 직접 사용해 봅니다.
4. **피드백** 수행 결과와 사용 경험, 발견한 버그를 제출합니다.
5. **보상** 제출 후 72시간 동안 신고가 없으면 크레딧을 지급합니다. 신고가 있으면 운영자가 검토합니다.

| | 무료 개발자 | 구독 개발자 |
| --- | --- | --- |
| 참여 확정 | 모집 인원까지 선착순 자동 확정 | 지원자 중 직접 선정 |
| 모집 글 노출 | 일반 목록 | 상단 전용 영역에 순환 노출 |
| 테스터와 1대1 채팅 | 없음 | 선정된 테스터와 가능 |

테스트로 받은 크레딧은 구독 결제에 쓰거나 현금으로 출금을 요청할 수 있습니다.

<br/>

### 주요 기능

| 기능 | 내용 |
| --- | --- |
| 회원 | 회원가입, 로그인, 소셜 로그인(Google·GitHub) |
| 모집 | 모집 목록·검색·상세, 테스트 지원 |
| 프로젝트 | 프로젝트 등록·수정, 모집 글 작성 |
| 모집 관리 | 지원자 선정, 받은 피드백 관리 |
| 참여 테스트 | 내 참여 목록, 피드백 제출 |
| 채팅 | 구독 개발자와 선정된 테스터의 실시간 1대1 대화 |
| 크레딧·구독 | 잔액·내역, 구독 결제, 출금 신청 |
| 운영자 | 신고 판정, 출금 처리 |
| AI 분석 | 리뷰 묶기·우선순위, 버전 비교, 후속 질문 추천 |

기능별 진행 상태는 [로드맵](#로드맵)에 있습니다.

<br/>

### 기술 스택

| 영역 | 기술 |
| --- | --- |
| 프론트엔드 | ![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white) ![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white) |
| 백엔드 | ![Java](https://img.shields.io/badge/Java_21-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white) ![Spring Boot](https://img.shields.io/badge/Spring_Boot_4.1-6DB33F?style=for-the-badge&logo=springboot&logoColor=white) ![Spring Security](https://img.shields.io/badge/Spring_Security-6DB33F?style=for-the-badge&logo=springsecurity&logoColor=white) ![JPA](https://img.shields.io/badge/JPA-59666C?style=for-the-badge&logo=hibernate&logoColor=white) |
| 데이터베이스 | ![PostgreSQL](https://img.shields.io/badge/PostgreSQL_17-4169E1?style=for-the-badge&logo=postgresql&logoColor=white) |
| 인프라 | ![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white) ![nginx](https://img.shields.io/badge/nginx-009639?style=for-the-badge&logo=nginx&logoColor=white) ![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white) |
| 테스트 | ![JUnit](https://img.shields.io/badge/JUnit5-25A162?style=for-the-badge&logo=junit5&logoColor=white) ![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=for-the-badge) |

<p align="right">(<a href="#readme-top">맨 위로</a>)</p>

<br/>
<br/>

## 시스템 설계

### 시스템 구성

```mermaid
flowchart LR
  B[브라우저] --> N[nginx] --> F["Next.js (BFF)"] --> S[Spring Boot] --> D[(PostgreSQL)]
  S --> A["AI 분석 서버 (Python)"]
```

<br/>

### 데이터 모델

서비스의 주요 테이블 23개와 관계입니다. 이미지·첨부 파일 테이블은 생략했습니다.

```mermaid
erDiagram
  users ||--o{ accounts : "user_id"
  users ||--o{ cashouts : "user_id"
  chat_rooms ||--o{ chat_messages : "room_id"
  chat_participants ||--o{ chat_messages : "sender_id"
  chat_rooms ||--o{ chat_participants : "room_id"
  users ||--o{ chat_participants : "user_id"
  recruitments ||--o{ chat_rooms : "recruitment_id"
  registers ||--o| chat_rooms : "register_id"
  recruitments ||--o{ cluster_groups : "recruitment_id"
  credit_wallets ||--o{ credit_ledgers : "credit_wallet_id"
  users ||--o| credit_wallets : "user_id"
  registers ||--o{ feedbacks : "register_id"
  test_items |o--o{ feedbacks : "test_item_id"
  cluster_groups ||--o{ feedback_clusters : "cluster_group_id"
  feedbacks ||--o{ feedback_clusters : "feedback_id"
  subscriptions ||--o| payments : "subscription_id"
  users ||--o{ projects : "user_id"
  projects ||--o{ recruitments : "project_id"
  types ||--o{ recruitment_types : "type_id"
  recruitments ||--o{ recruitment_types : "recruitment_id"
  users ||--o{ refresh_tokens : "user_id"
  recruitments ||--o{ registers : "recruitment_id"
  users ||--o{ registers : "user_id"
  users ||--o{ reports : "user_id"
  users ||--o{ reports : "reported_user_id"
  users |o--o{ reports : "reviewer_id"
  users ||--o{ subscriptions : "user_id"
  plans ||--o{ subscriptions : "plan_id"
  recruitments ||--o{ test_items : "recruitment_id"
  recruitments ||--o| version_comparisons : "recruitment_id"
  recruitments ||--o{ version_comparisons : "previous_recruitment_id"

  accounts {
    bigint id PK
    bigint user_id FK
    varchar password
    varchar provider
    text provider_code
    timestamp created_at
    timestamp updated_at
  }
  cashouts {
    bigint id PK
    bigint user_id FK
    integer amount
    varchar bank
    varchar account_number
    varchar account_holder
    varchar status
    varchar reject_reason
    varchar reject_memo
    timestamp processed_at
    timestamp created_at
    timestamp updated_at
  }
  chat_messages {
    bigint id PK
    bigint room_id FK
    bigint seq
    bigint sender_id FK
    varchar content
    timestamp sent_at
  }
  chat_participants {
    bigint id PK
    bigint room_id FK
    bigint user_id FK
    varchar role
    varchar custom_room_name
    boolean hidden
    bigint last_read_seq
    timestamp created_at
    timestamp updated_at
  }
  chat_rooms {
    bigint id PK
    varchar room_key
    bigint recruitment_id FK
    bigint register_id FK
    bigint last_seq
    timestamp last_message_at
    timestamp created_at
    timestamp updated_at
  }
  cluster_groups {
    bigint id PK
    bigint recruitment_id FK
    varchar group_code
    varchar name
    integer improvement_rank
    varchar category
    varchar git_issue_title
    text git_issue_content
    text git_issue_url
    integer git_issue_number
    timestamp git_issue_registering_at
    timestamp created_at
    timestamp updated_at
  }
  credit_ledgers {
    bigint id PK
    bigint credit_wallet_id FK
    integer delta
    varchar description
    varchar type
    timestamp created_at
    timestamp updated_at
  }
  credit_wallets {
    bigint id PK
    bigint user_id FK
    integer event_credit
    integer earned_balance
    integer locked_balance
    timestamp created_at
    timestamp updated_at
  }
  feedbacks {
    bigint id PK
    bigint register_id FK
    bigint test_item_id FK
    text content
    timestamp submitted_at
    varchar status
    boolean is_recommended
    text report_reason
    timestamp created_at
    timestamp updated_at
  }
  feedback_clusters {
    bigint id PK
    bigint cluster_group_id FK
    bigint feedback_id FK
    boolean is_representative
    timestamp created_at
    timestamp updated_at
  }
  payments {
    bigint id PK
    bigint subscription_id FK
    varchar method
    integer amount
    timestamp paid_at
    varchar status
    timestamp created_at
    timestamp updated_at
  }
  plans {
    bigint id PK
    varchar tier
    integer cash_price
    integer credit_price
    integer version
    text description
    text image_url
    integer period_days
    timestamp created_at
    timestamp updated_at
  }
  projects {
    bigint id PK
    bigint user_id FK
    varchar title
    text description
    text image_url
    timestamp created_at
    timestamp updated_at
  }
  recruitments {
    bigint id PK
    bigint project_id FK
    varchar title
    text description
    text conditions
    text access_url
    timestamp recruit_deadline
    timestamp feedback_deadline
    varchar status
    varchar selection_mode
    boolean is_subscription
    integer version
    varchar analysis_status
    timestamp analyzed_at
    timestamp analysis_requested_at
    text praise_summary
    text cancel_reason
    timestamp cancelled_at
    timestamp created_at
    timestamp updated_at
  }
  recruitment_types {
    bigint id PK
    bigint type_id FK
    bigint recruitment_id FK
    timestamp created_at
    timestamp updated_at
  }
  refresh_tokens {
    bigint id PK
    bigint user_id FK
    varchar token_hash
    varchar session_id
    timestamp used_at
    timestamp expires_at
    timestamp created_at
  }
  registers {
    bigint id PK
    bigint recruitment_id FK
    bigint user_id FK
    varchar status
    timestamp applied_at
    timestamp confirmed_at
    integer base_reward_snapshot
    integer extra_reward_snapshot
    timestamp created_at
    timestamp updated_at
  }
  reports {
    bigint id PK
    bigint user_id FK
    bigint reported_user_id FK
    bigint reviewer_id FK
    varchar target_type
    bigint target_id
    text reason
    varchar status
    timestamp reviewed_at
    timestamp created_at
  }
  subscriptions {
    bigint id PK
    bigint user_id FK
    bigint plan_id FK
    timestamp start_at
    timestamp end_at
    varchar status
    timestamp created_at
    timestamp updated_at
  }
  test_items {
    bigint id PK
    bigint recruitment_id FK
    varchar title
    text description
    boolean is_required
    integer sort_order
    timestamp created_at
    timestamp updated_at
  }
  types {
    bigint id PK
    varchar code
    text image_url
    timestamp created_at
    timestamp updated_at
  }
  users {
    bigint id PK
    varchar name
    varchar nickname
    varchar email
    varchar role
    varchar status
    text image_url
    timestamp created_at
    timestamp updated_at
  }
  version_comparisons {
    bigint id PK
    bigint recruitment_id FK
    bigint previous_recruitment_id FK
    text summary
    timestamp created_at
    timestamp updated_at
  }
```

<br/>

### 기술적으로 고민한 점

- **실시간 채팅은 알림과 내용을 나눴습니다.** SSE로는 새 메시지가 있다는 알림만 보내고 내용은 REST로 받습니다. 연결이 끊겨도 마지막 순번 이후의 메시지를 다시 받아 빠짐없이 채웁니다.
- **느린 AI 호출이 DB 연결을 붙잡지 않게 했습니다.** 분석 서버는 트랜잭션 밖에서 호출하고, 결과는 받은 뒤 짧은 트랜잭션으로 저장합니다.
- **백엔드를 외부에 직접 열지 않았습니다.** 브라우저는 nginx를 거쳐 Next.js에만 접속하고, 백엔드는 Next.js가 서버 안에서 호출합니다.
- **출금 계좌 정보는 암호화해 저장합니다.** 계좌번호와 예금주는 DB에 AES-GCM 암호문으로 들어갑니다.
- **요구사항과 테스트를 같은 번호로 이었습니다.** 계획 문서의 시나리오 번호를 E2E 테스트 이름에 붙여, 어떤 요구사항을 어떤 테스트가 확인하는지 바로 찾을 수 있습니다.

<p align="right">(<a href="#readme-top">맨 위로</a>)</p>

<br/>
<br/>

## 시작하기

Docker Compose로 프론트엔드, 백엔드, PostgreSQL을 한 번에 띄웁니다.

<br/>

### 사전 준비

- [Docker](https://www.docker.com/) (Docker Compose 포함)

<br/>

### 설치 및 실행

1. 저장소를 내려받습니다.
   ```sh
   git clone https://github.com/likelion-backendschool-9th/test-moa.git
   cd test-moa
   ```
2. 환경 변수 파일을 만들고 값을 채웁니다. 각 값의 설명은 파일의 주석에 있습니다.
   ```sh
   cp .env.example .env
   ```
3. 서비스를 띄웁니다.
   ```sh
   docker compose up --build
   ```
4. 브라우저에서 `http://localhost:<TEAM_PORT>`로 접속합니다.

개발 모드, 로컬 HTTPS, 자주 쓰는 명령은 [실행 방법](docs/running.md)을 참고하세요.

<p align="right">(<a href="#readme-top">맨 위로</a>)</p>

<br/>
<br/>

## 로드맵

- [x] 회원가입·로그인·소셜 로그인
- [x] 모집 목록·검색·상세와 테스트 지원
- [x] 프로젝트 등록·수정과 모집 글 작성
- [x] 실시간 1대1 채팅
- [ ] 화면과 API 연결
  - [ ] 모집 관리
  - [ ] 참여 테스트와 피드백 제출
  - [ ] 크레딧·구독·출금
  - [ ] 운영자 신고 판정·출금 처리
  - [ ] AI 분석
- [ ] 모바일 앱·게임·API 테스트 지원 검토

실제 결제 대행(PG)과 송금은 아직 연동하지 않았습니다. 전체 작업은 [열린 이슈](https://github.com/likelion-backendschool-9th/test-moa/issues)에서 볼 수 있습니다.

<p align="right">(<a href="#readme-top">맨 위로</a>)</p>

<br/>
<br/>

## 협업

1. `develop`에서 `feature/기능이름` 브랜치를 만듭니다.
2. `유형: 변경 내용` 형식으로 커밋합니다.
3. `develop`으로 PR을 엽니다.
4. CI 통과와 팀원 1명의 승인을 받아 병합합니다.
5. 병합되면 테스트 서버에 자동으로 배포됩니다.

자세한 규칙은 [협업 규칙](CONTRIBUTING.md)을 참고하세요.

<p align="right">(<a href="#readme-top">맨 위로</a>)</p>

<br/>
<br/>

## 팀

<div align="center">
  <table>
    <tr>
      <td align="center" width="20%">
        <a href="https://github.com/isle-blu"><img src="https://avatars.githubusercontent.com/isle-blu?size=200" width="100" alt="양덕관"></a>
        <br/><br/><strong>양덕관</strong>
        <br/><sub><a href="https://github.com/isle-blu">isle-blu</a></sub>
      </td>
      <td align="center" width="20%">
        <a href="https://github.com/jykim78982"><img src="https://avatars.githubusercontent.com/jykim78982?size=200" width="100" alt="김재연"></a>
        <br/><br/><strong>김재연</strong>
        <br/><sub><a href="https://github.com/jykim78982">jykim78982</a></sub>
      </td>
      <td align="center" width="20%">
        <a href="https://github.com/Dev-JihyeMoon"><img src="https://avatars.githubusercontent.com/Dev-JihyeMoon?size=200" width="100" alt="문지혜"></a>
        <br/><br/><strong>문지혜</strong>
        <br/><sub><a href="https://github.com/Dev-JihyeMoon">Dev-JihyeMoon</a></sub>
      </td>
      <td align="center" width="20%">
        <a href="https://github.com/j0615671-arch"><img src="https://avatars.githubusercontent.com/j0615671-arch?size=200" width="100" alt="이재용"></a>
        <br/><br/><strong>이재용</strong>
        <br/><sub><a href="https://github.com/j0615671-arch">j0615671-arch</a></sub>
      </td>
      <td align="center" width="20%">
        <a href="https://github.com/songmin04"><img src="https://avatars.githubusercontent.com/songmin04?size=200" width="100" alt="최송민"></a>
        <br/><br/><strong>최송민</strong>
        <br/><sub><a href="https://github.com/songmin04">songmin04</a></sub>
      </td>
    </tr>
  </table>
</div>

<p align="right">(<a href="#readme-top">맨 위로</a>)</p>

<br/>
<br/>

## 참고 문서

- [실행 방법](docs/running.md): 개발 모드, 로컬 HTTPS, 배포
- [협업 규칙](CONTRIBUTING.md): 브랜치, 커밋 메시지, PR
- [프론트엔드 안내](frontend/README.md): 폴더 구조, 테스트 명령
- [계획 문서](docs/README.md): 도메인별 요구사항과 결정 기록

<p align="right">(<a href="#readme-top">맨 위로</a>)</p>
