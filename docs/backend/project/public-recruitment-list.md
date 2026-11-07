# 공개 모집 목록·검색 API (#112)

누구나 모집글 목록을 검색어, 유형, 모집 중 여부, 구독 모집 여부로 거르고 정렬해 페이지로 나눠 보는 API. 홈의 세 영역(배너의 최신 모집, "이런 테스트도 있어요", 전체 테스트)이 같은 API를 조건만 바꿔 부른다. 도메인 전체에서 정한 것과 데이터 구조는 [README.md](README.md), 모집글 상세는 [public-recruitment-detail.md](public-recruitment-detail.md)에 있다.

시나리오 제목 끝의 태그가 확인 방법이다. `[테스트]`는 백엔드 테스트와 1:1이다(`@DisplayName("#112-S…")`).

## 이슈 #112 확인

| 이슈 항목 | 시나리오 |
| --- | --- |
| 1 비로그인도 홈에서 구독 모집 영역과 최신 모집 3건을 본다 | #112-S1, #112-S6 |
| 2 검색어, 유형, 모집 중만 보기, 정렬로 찾고 페이지를 넘긴다 | #112-S2~#112-S5, #112-S7 |
| 3 결과에 총 개수, 현재 페이지, 전체 페이지 수가 있다 | #112-S1, #112-S7 |
| 4 취소된 모집은 나오지 않는다 | #112-S1 |
| 5 카드마다 프로젝트 이름, 모집글 제목, 대표 이미지, 유형, 마감일, 상태가 보인다 | #112-S1 (보상과 확정 인원은 범위 밖) |
| 6 알 수 없는 정렬·유형 값이나 잘못된 페이지 값은 400 | #112-S8 |

## 1. 공개 모집 목록 (#112-R1)

| 동작 | API | 로그인 | 성공 |
| --- | --- | --- | --- |
| 공개 모집 목록·검색 | `GET /api/v1/recruitments` | 필요 없음 | 200 |

조건은 모두 쿼리 파라미터이고, 생략하면 기본값이다. 이름은 프론트 URL(`q`, `type`, `open`, `sort`, `page`)과 같다.

| 이름 | 값 | 기본값 | 뜻 |
| --- | --- | --- | --- |
| `q` | 100자까지 | 없음 | 프로젝트 이름, 프로젝트 소개, 모집글 제목 중 하나에 들어 있으면 남긴다. 대소문자를 가리지 않고, 앞뒤 공백은 지운다. `%`, `_`는 글자 그대로 찾는다 |
| `type` | `web`, `mobile`, `game`, `api` | 없음(전체) | 그 유형의 모집만 |
| `open` | `true`, `false` (`1`, `0`도 받는다) | `false` | `true`면 모집 마감 전인 모집만 |
| `subscription` | `true`, `false` (`1`, `0`도 받는다) | `false` | `true`면 구독 모집만 |
| `sort` | `latest`, `deadline` | `latest` | 최신순(작성 시각 내림차순) / 마감 임박순(모집 마감 전인 것을 마감이 가까운 순서로, 마감이 지난 것은 그 뒤에 마감이 가까운 순서로) |
| `page` | 1 이상 | 1 | 1부터 센다. 마지막 페이지보다 크면 마지막 페이지를 준다(프론트 `RecruitmentPage.page`와 같다) |
| `size` | 1~50 | 20 | 한 페이지 개수. 전체 테스트는 20, 배너는 3을 쓴다 |

- 취소된 모집은 어떤 조건에서도 나오지 않는다. 마감된 모집은 `open=true`가 아니면 나온다(전체 테스트에서 지난 모집도 찾을 수 있다)
- 같은 순서 안에서는 id가 큰 것(나중에 저장한 것)이 먼저다. 페이지를 넘겨도 같은 모집이 두 번 나오지 않는다
- 응답: `items`, `total`(조건에 맞는 전체 개수), `page`(실제로 준 페이지), `pageCount`(결과가 없어도 1)
- 항목 하나: `id`, `title`(모집글 제목, 카드의 "할 일" 줄), `projectName`, `projectDescription`, `projectImageUrl`, `softwareType`, `subscription`, `status`, `createdAt`, `recruitDeadline`, `submitDeadline`. 상태와 유형 이름은 #113 상세와 같다(`recruiting`, `testing`, `closed` / `web` …)
- 홈의 세 영역은 이렇게 부른다
  - 배너의 최신 모집 3건: `open=true&size=3`
  - "이런 테스트도 있어요": `subscription=true&open=true`. 모집이 끝난 구독 모집은 지원할 수 없어 뺀다
  - 전체 테스트: 화면 URL의 조건을 그대로 넘긴다(`open=1`도 그대로 받는다)
- 코드: `controller.RecruitmentController.search`, `RecruitmentService.search`, `RecruitmentPageResponse`, 조건 쿼리는 `RecruitmentSearchRepository`(+`Impl`)다. 상태는 `Recruitment.phaseAt(now)`로 계산한다([README 정한 것 11·15](README.md#정한-것))
- 로그인 없이 부를 수 있다. `SecurityConfig`에서 이 주소의 `GET`만 연다. 토큰을 보내면 검사하므로 잘못된 토큰은 다른 API처럼 401이다

#112-S1 기본 목록 [테스트]
- Given 모집글 3개(하나는 취소, 하나는 구독 모집이고 프로젝트 대표 이미지와 유형 `web`이 있음)
- When  토큰 없이 `GET /api/v1/recruitments`
- Then  200이고 취소되지 않은 2개가 최신순으로 오며, `total` 2, `page` 1, `pageCount` 1이다
- Then  항목에 모집글 제목, 프로젝트 이름·소개·대표 이미지, `softwareType` `web`, `subscription` true, `status` `recruiting`, 작성 시각과 두 마감일이 있다

#112-S2 검색어 [테스트]
- Given 프로젝트 이름, 프로젝트 소개, 모집글 제목에 각각 검색어가 들어간 모집과 들어가지 않은 모집
- When  검색어를 대문자로 바꾸고 앞뒤에 공백을 붙여 `q`로 보낸다
- Then  검색어가 들어간 3개만 온다
- When  `q`에 `%`를 보낸다
- Then  `%`가 들어간 모집만 온다(모든 모집이 오지 않는다)

#112-S3 유형 [테스트]
- Given 유형이 `web`인 모집과 `mobile`인 모집
- When  `type=mobile`
- Then  `mobile` 모집만 온다

#112-S4 모집 중만 [테스트]
- Given 모집 마감 전인 모집, 모집 마감이 지나고 제출 마감 전인 모집
- When  `open=true`
- Then  모집 마감 전인 모집만 온다
- When  `open`을 빼고 부른다
- Then  둘 다 오고, 지난 모집의 `status`는 `testing`이다

#112-S5 마감 임박순 [테스트]
- Given 모집 마감이 3일 뒤, 1일 뒤인 모집과 이미 지난 모집
- When  `sort=deadline`
- Then  1일 뒤, 3일 뒤, 지난 모집 순서다

#112-S6 구독 모집과 개수 [테스트]
- Given 구독 모집 2개(하나는 모집 마감이 지남), 일반 모집 1개
- When  `subscription=true&open=true`
- Then  모집 마감 전인 구독 모집 1개만 온다
- When  `open=true&size=1`
- Then  가장 최근에 작성한 모집 마감 전 모집 1개가 오고 `total`은 2, `pageCount`는 2다

#112-S7 페이지 [테스트]
- Given 모집 3개
- When  `size=2&page=2`
- Then  가장 오래된 1개가 오고 `page` 2, `pageCount` 2, `total` 3이다
- When  `size=2&page=9`
- Then  마지막 페이지(2)를 준다
- When  아무것도 맞지 않는 검색어
- Then  `items`가 비고 `total` 0, `page` 1, `pageCount` 1이다

#112-S8 잘못된 조건 [테스트]
- When  `sort=reward`, `type=desktop`, `page=0`, `page=abc`, `size=0`, `size=51`, `open=maybe`, 101자 `q`를 각각 보낸다
- Then  모두 400 `INVALID_INPUT`이다

## 범위 밖
- 보상액과 확정 인원. 보상액은 보상 담당이 기준을 정할 때까지 저장하지 않고, 확정 인원은 공개 화면에서 표시를 뺐다(#78). 프론트 `baseReward`·`extraReward`는 지금의 임시 값을 쓰고, 추가 보상 배지는 `subscription`으로 판단한다
- 프론트 연결(`getSubscriptionRecruitments`, `getLatestOpenRecruitments`, `searchRecruitments` 본문 바꾸기)
- 월간 모집 한도, 추천 정렬(이슈에서 뺌)

## 가정
- 프론트 카드의 `request`(할 일 한 줄)는 모집글 제목, `summary`(프로젝트 한 줄 소개)는 프로젝트 소개다. 검색 대상도 프론트 목업과 같은 세 칸이다
- 모집글에는 유형이 하나다(#92가 `WEB` 하나만 저장). 여러 개가 되면 `type` 조건은 그중 하나라도 맞으면 남긴다
- 검색은 `LIKE`로 한다. 모집글 수가 많아져 느려지면 그때 검색 색인을 정한다
