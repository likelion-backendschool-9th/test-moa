# 공개 모집글 상세 API (#113)

누구나 모집글 하나의 프로젝트 정보, 모집 내용, 일정, 선정 방식, 테스트 항목을 보는 API. 로그인한 회원에게는 그 모집에 지원했는지도 함께 준다. 도메인 전체에서 정한 것과 데이터 구조는 [README.md](README.md), 모집 작성은 [project-recruitment-api.md](project-recruitment-api.md)에 있다.

시나리오 제목 끝의 태그가 확인 방법이다. `[테스트]`는 백엔드 테스트와 1:1이다(`@DisplayName("#113-S…")`).

## 이슈 #113 확인

| 이슈 항목 | 시나리오 |
| --- | --- |
| 1 비로그인도 프로젝트 정보, 설명, 조건, 마감일, 보상, 선정 방식을 본다 | #113-S1, #113-S6 (보상액은 범위 밖, 구독 모집 여부만 준다) |
| 2 테스트 항목을 순서대로 필수 여부, 설명, 이미지와 함께 본다 | #113-S2 |
| 3 취소된 모집이나 없는 모집은 404 | #113-S3, #113-S4 (상태 계산 #113-S7) |
| 4 로그인한 테스터에게는 지원 여부가 함께 온다 | #113-S5 |

## 1. 공개 모집글 상세 (#113-R1)

| 동작 | API | 로그인 | 성공 |
| --- | --- | --- | --- |
| 공개 모집글 상세 | `GET /api/v1/recruitments/{recruitmentId}` | 선택 | 200 |

- 주소 변수는 모집글 id다([README 정한 것 7](README.md#정한-것)). 프론트 `/recruitments/:slug`의 slug 자리에 같은 id를 넣는다
- 로그인 없이 부를 수 있다. `SecurityConfig`에서 이 주소의 `GET`만 열고, 같은 주소 아래 지원(#114) 같은 쓰기 요청은 로그인이 필요하다
- 토큰을 보내면 회원으로 본다. 토큰이 잘못됐거나 만료됐으면 다른 API처럼 401이다. 프론트 proxy가 만료 전에 갱신한다
- 접속 링크(`accessUrl`)는 참여가 확정된 테스터에게만 안내하므로 응답에 넣지 않는다
- 상태는 마감일로 계산한다([README 정한 것 11](README.md#정한-것)). 계산은 엔티티 `Recruitment.phaseAt(now)`가 하고, `RecruitmentNames`는 그 결과를 프론트 이름으로 바꾸기만 한다(리뷰 반영: 처음에는 `RecruitmentNames.status`가 계산과 이름 바꾸기를 함께 했다). 저장 상태가 `RECRUITING`이 아니면 마감일과 상관없이 종료다. 상태와 선정 방식, 유형은 #92와 같은 프론트 이름이다(`recruiting`, `testing`, `closed` / `firstCome`, `selection` / `web`). 취소된 모집은 404라 `cancelled`는 오지 않는다
- 이미지: 프로젝트 대표 이미지(`project.imageUrl`), 모집글 이미지(`imageUrls`, `sortOrder` 순), 테스트 항목 이미지(`testItems[].imageUrls`, `sortOrder` 순)를 따로 준다. 상세 이미지 띠는 프론트가 대표 이미지 다음에 모집글 이미지를 잇는다(#124)
- 테스트 항목은 저장한 순서(id 순)다. 모집 작성이 요청 순서대로 저장한다
- 지원 여부(`myRegisterStatus`): 로그인한 회원의 이 모집 참가 중 가장 최근 것의 상태(`applied`, `confirmed`, `rejected`, `cancelled`, 프론트 `ApplicationStatus`와 같은 이름). 참가가 없거나 비로그인이면 null. 다시 지원할 수 있는지는 지원 API(#114)가 정한다
- 구독 모집 여부(`subscription`): 모집 작성 때 작성자의 구독 여부를 모집글에 저장한다(`recruitments.is_subscription`). 추가 보상 표시와 공개 목록(#112)의 구독 모집 영역이 같은 값을 쓴다

#113-S1 비로그인 상세 [테스트]
- Given 구독 회원의 프로젝트(대표 이미지 있음)에 선발형 모집글, 모집글 이미지 2장, 테스트 항목 2개
- When  토큰 없이 `GET /api/v1/recruitments/{id}`
- Then  200이고 프로젝트 이름·설명·대표 이미지, 모집글 제목·설명·조건, 두 마감일, `selectionMode` `selection`, `softwareType` `web`, `status` `recruiting`, `subscription` true, `imageUrls`가 저장 순서대로 온다
- Then  `accessUrl`은 없고 `myRegisterStatus`는 null이다

#113-S2 테스트 항목 [테스트]
- Then  항목이 저장 순서대로 오고, 각 항목에 이름, 설명, 필수 여부, 이미지가 `sortOrder` 순서로 있다. 이미지가 없는 항목은 빈 배열이다

#113-S3 마감된 모집도 볼 수 있다 [테스트]
- Given 모집 마감이 지난 모집(제출 마감 전), 제출 마감까지 지난 모집
- Then  각각 200이고 `status`가 `testing`, `closed`다

#113-S4 없거나 취소된 모집 [테스트]
- When  없는 id, 취소된 모집글을 부른다
- Then  404 `NOT_FOUND`다

#113-S5 로그인한 회원의 지원 여부 [테스트]
- Given 테스터가 이 모집에 지원했다
- Then  `myRegisterStatus`가 `applied`다
- Given 지원한 적 없는 회원
- Then  null이다
- Given 같은 모집에 참가가 둘 있다(취소한 참가, 그 뒤의 지원)
- Then  가장 최근 참가의 상태(`applied`)다
- When  잘못된 토큰을 보낸다
- Then  401이다

#113-S6 구독 모집 여부 저장 [테스트]
- When  구독 회원이 모집을 작성한다
- Then  상세의 `subscription`이 true다
- When  구독하지 않은 회원이 작성한다
- Then  false다

#113-S7 진행 단계 계산 [테스트]
- Given 모집 마감이 하루 뒤, 제출 마감이 8일 뒤인 모집
- Then  지금은 `RECRUITING`, 모집 마감 시각에는 `TESTING`, 제출 마감 시각에는 `CLOSED`다
- Given 저장 상태가 `CLOSED`(지금은 저장하는 코드가 없다)
- Then  마감일이 남아도 `CLOSED`다
- Given 취소한 모집
- Then  `CANCELLED`다

## 범위 밖
- 보상액. 저장 위치와 기준은 보상 담당이 정한다. 그때까지 프론트는 지금의 임시 상수를 쓴다
- 프론트 연결(`findPublicRecruitment` 본문 바꾸기)
- 확정 인원. 공개 화면에서 모집 인원 표시를 뺐다(#78)

## 가정
- 참가 행은 회원·모집마다 여러 개일 수 있다(취소 뒤 다시 지원 등). 그래서 가장 최근 것을 쓴다
