# 프로젝트·테스터·피드백 엔티티 (#89)

프로젝트·모집글·테스트 항목·참가·피드백 엔티티와 그 메서드, enum, 단위 테스트. 프로젝트 하나에 모집글 여러 개를 표현하고, 지원·확정·피드백의 상태 규칙을 엔티티가 지킨다. 보상액은 확정할 때 참가 정보에 고정된다. 도메인 전체에서 정한 것과 데이터 구조는 [README.md](README.md)에 있다.

시나리오 제목 끝의 태그가 확인 방법이다. `[테스트]`는 백엔드 단위 테스트와 1:1이고(`@DisplayName("#89-S…")`), `[직접]`은 사람이 코드와 Hibernate가 만든 DDL로 확인한다.

## 이슈 #89 확인

| 이슈 항목 | 시나리오 |
| --- | --- |
| 1 프로젝트 정보 저장 | #89-S1 |
| 2 프로젝트 하나에 모집글 여러 개 | #89-S2 |
| 3 유형과 이미지는 모집글에 연결 | #89-S3 |
| 4 모집 인원 없이 저장 | #89-S4 |
| 5 모집 취소 | #89-S5~S8 |
| 6 테스트 항목은 모집글에 연결, 필수·선택 | #89-S9 |
| 7 테스트 항목 이미지 | #89-S10 |
| 8 지원 | #89-S11 |
| 9 확정과 보상 고정 | #89-S12~S14 |
| 10 거절과 취소, 잘못된 변경 차단 | #89-S15~S17 |
| 11 항목별 작성, 한 번에 제출, 기타 의견 | #89-S18, #89-S19 |
| 12 피드백에 제목과 보상액 없음 | #89-S20 |
| 13 추천 | #89-S21 |
| 14 피드백 상태와 전이 | #89-S22~S25 |

## 1. 프로젝트와 모집글 (#89-R1)

ERD `프로젝트`는 `projects`, ERD `테스트 모집글`은 `recruitments`다. 모집 조건과 일정은 모집글에 있다.

### `projects`

| 필드 | 컬럼 | 타입 | null | 설명 |
| --- | --- | --- | --- | --- |
| `user` | `user_id` | FK → users | 불가 | 프로젝트 주인 |
| `title` | `title` | String | 불가 | 소프트웨어 이름 |
| `description` | `description` | TEXT | 가능 | 설명 |
| `imageUrl` | `image_url` | TEXT | 가능 | 대표 이미지 |

### `recruitments`

| 필드 | 컬럼 | 타입 | null | 설명 |
| --- | --- | --- | --- | --- |
| `project` | `project_id` | FK → projects | 불가 | 모집글을 올린 프로젝트 |
| `title`, `description`, `conditions`, `accessUrl` | 같은 이름 | | | 모집 내용 |
| `recruitDeadline`, `feedbackDeadline` | 같은 이름 | LocalDateTime | 불가 | 모집·피드백 마감 |
| `status` | `status` | enum `RecruitmentStatus` | 불가 | `RECRUITING`으로 시작 |
| `selectionMode` | `selection_mode` | enum `SelectionMode` | 불가 | 선정 방식 |
| `version` | `version` | Integer | 불가 | 1로 시작 |
| `analysisStatus` | `analysis_status` | enum `AnalysisStatus` | 불가 | `NONE`/`PENDING`/`DONE`/`FAILED`. `NONE`으로 시작 |
| `analyzedAt` | `analyzed_at` | LocalDateTime | 가능 | 피드백 분석 완료 시각. 분석 전에는 null (#108) |
| `praiseSummary` | `praise_summary` | TEXT | 가능 | 칭찬 리뷰 한 줄 요약. 분석 전이거나 칭찬이 없으면 null (#107) |
| `analysisRequestedAt` | `analysis_requested_at` | LocalDateTime | 가능 | 마지막 분석 요청(접수) 시각. 요청한 적이 없으면 null (#107) |
| `cancelReason` | `cancel_reason` | TEXT | 가능 | 테스트 전 취소는 비어 있다 |
| `cancelledAt` | `cancelled_at` | LocalDateTime | 가능 | 취소 시각 |

- `RecruitmentType`(`recruitment_types`)과 `RecruitmentImage`(`recruitment_images`: `recruitment`, `url`, `sortOrder`)는 모집글을 가리킨다
- 메서드: `cancel(String reason, LocalDateTime cancelledAt)`, `completeAnalysis(String praiseSummary, LocalDateTime now)`(#107·#108)
- 취소할 수 있는 시기와 사유가 필수인 경우는 확정 테스터와 일정을 함께 봐야 해서 서비스가 확인한다(`docs/frontend/project/projects.md` 모집 취소 표)

#89-S1 프로젝트에는 프로젝트 정보만 있다 [직접]
- `Project`에 `user`, `title`, `description`, `imageUrl`이 있고 모집 조건·일정은 없다

#89-S2 프로젝트 하나에 모집글 여러 개 [직접]
- DDL의 `recruitments.project_id`에 unique가 없고, 모집 조건·일정은 `recruitments`에 있다

#89-S3 유형과 이미지는 모집글에 연결 [직접]
- DDL의 `recruitment_types`, `recruitment_images`에 `recruitment_id`가 있다

#89-S4 모집 인원 없이 저장 [직접]
- DDL의 `recruitments`에 `recruit_count`가 없다

#89-S5 사유를 적고 취소 [테스트]
- Given `RECRUITING` 모집글
- When  `cancel("서버 장애", now)`
- Then  상태가 `CANCELLED`이고 사유와 취소 시각이 남는다

#89-S6 사유 없이 취소 [테스트]
- When  `cancel(null, now)`
- Then  상태가 `CANCELLED`이고 사유는 null이다

#89-S7 모집글 시작 값 [테스트]
- Given 새 모집글
- Then  상태 `RECRUITING`, 버전 1, 분석 상태 `NONE`, 취소 사유와 시각은 null이다

#89-S8 다시 취소할 수 없음 [테스트]
- Given `CANCELLED` 모집글
- When  `cancel`
- Then  `IllegalStateException`이고 처음 사유와 시각이 그대로다

## 2. 테스트 항목 (#89-R2)

- `TestItem`은 `recruitment`를 가리키고, `required`(`is_required`, boolean, null 불가)가 있다
- `TestItemImage`(`test_item_images`)는 `testItem`(필수), `url`, `sortOrder`를 가진다

#89-S9 테스트 항목은 모집글에 연결되고 필수 여부가 있다 [직접]
- DDL의 `test_items`에 `recruitment_id`와 `is_required`가 있고 `project_id`가 없다

#89-S10 이미지는 테스트 항목에 연결 [직접]
- DDL의 `test_item_images.test_item_id`에 `not null`이 있고 `project_id`가 없다

## 3. 지원과 참가 (#89-R3)

### `registers`

| 필드 | 컬럼 | 타입 | null | 설명 |
| --- | --- | --- | --- | --- |
| `recruitment` | `recruitment_id` | FK → recruitments | 불가 | 지원한 모집글 |
| `user` | `user_id` | FK → users | 불가 | 테스터 |
| `status` | `status` | enum `RegisterStatus` | 불가 | `APPLIED`로 시작 |
| `appliedAt` | `applied_at` | LocalDateTime | 불가 | 지원 시각 |
| `confirmedAt` | `confirmed_at` | LocalDateTime | 가능 | 확정 전에는 null |
| `baseRewardSnapshot` | `base_reward_snapshot` | Integer | 가능 | 확정할 때 고정한 기본 보상. 확정 전에는 null |
| `extraRewardSnapshot` | `extra_reward_snapshot` | Integer | 가능 | 확정할 때 고정한 추가 보상. 확정 전에는 null |

| 지금 상태 | `confirm` | `reject` | `cancel` |
| --- | --- | --- | --- |
| `APPLIED` | `CONFIRMED` | `REJECTED` | `CANCELLED` |
| `CONFIRMED` | 불가 | 불가 | `CANCELLED` |
| `REJECTED` | 불가 | 불가 | 불가 |
| `CANCELLED` | 불가 | 불가 | 불가 |

선착순 모집은 서비스가 지원을 저장한 뒤 바로 `confirm`을 부른다. 피드백을 낸 테스터를 모집 취소에서 제외하는 판단도 서비스가 한다.

#89-S11 지원 [테스트]
- Given 새 `Register`
- Then  상태 `APPLIED`, 확정 시각과 보상 스냅샷은 null이다

#89-S12 확정하면 보상액이 고정된다 [테스트]
- When  `confirm(1000, 300, now)`
- Then  상태 `CONFIRMED`, 확정 시각 now, 기본 1000, 추가 300이다

#89-S13 보상액이 없거나 음수면 확정할 수 없음 [테스트]
- When  `confirm(null, 300, now)` 또는 `confirm(1000, -1, now)`
- Then  `IllegalArgumentException`이고 상태는 `APPLIED`다

#89-S14 대기 중이 아니면 확정할 수 없음 [테스트]
- Given `CONFIRMED`, `REJECTED`, `CANCELLED`
- When  `confirm`
- Then  `IllegalStateException`이고 처음 보상액이 그대로다

#89-S15 거절 [테스트]
- Given `APPLIED`
- When  `reject()`
- Then  `REJECTED`다. `APPLIED`가 아니면 `IllegalStateException`이다

#89-S16 지원과 확정은 취소할 수 있음 [테스트]
- Given `APPLIED` 또는 `CONFIRMED`
- When  `cancel()`
- Then  `CANCELLED`다

#89-S17 거절과 취소는 다시 취소할 수 없음 [테스트]
- Given `REJECTED` 또는 `CANCELLED`
- When  `cancel()`
- Then  `IllegalStateException`이고 상태가 그대로다

## 4. 피드백 (#89-R4)

### `feedbacks`

| 필드 | 컬럼 | 타입 | null | 설명 |
| --- | --- | --- | --- | --- |
| `register` | `register_id` | FK → registers | 불가 | 피드백을 낸 참가 |
| `testItem` | `test_item_id` | FK → test_items | 가능 | 기타 의견은 null |
| `content` | `content` | TEXT | 불가 | 내용 |
| `submittedAt` | `submitted_at` | LocalDateTime | 불가 | 자동 기록 대신 서비스가 넘긴다. 한 번에 낸 피드백은 같은 값이다 |
| `status` | `status` | enum `FeedbackStatus` | 불가 | `SUBMITTED`로 시작 |
| `recommended` | `is_recommended` | boolean | 불가 | false로 시작 |

피드백에는 제목과 보상액이 없다. 보상액은 `feedback.getRegister()`에서 읽는다.

| 지금 상태 | `report` | `reward` | `exclude` |
| --- | --- | --- | --- |
| `SUBMITTED` | `REPORTED` | `REWARDED` | 불가 |
| `REPORTED` | 불가 | `REWARDED` | `EXCLUDED` |
| `REWARDED` | 불가 | 불가 | 불가 |
| `EXCLUDED` | 불가 | 불가 | 불가 |

프론트의 "운영자 검토 중"은 `REPORTED`로, "기한 내 미제출"은 저장하지 않고 마감일과 피드백 유무로 계산한다. 신고 데이터는 신고 담당의 테이블에 있고, 여기에는 상태만 둔다.

#89-S18 항목별 피드백을 같은 시각으로 저장 [테스트]
- Given 같은 `Register`, 테스트 항목 2개, 같은 `submittedAt`
- When  피드백 2개를 만든다
- Then  둘 다 `SUBMITTED`, 추천 false이고 `submittedAt`이 같다

#89-S19 기타 의견 [테스트]
- When  `testItem` 없이 피드백을 만든다
- Then  `testItem`이 null이다

#89-S20 피드백에 제목과 보상액이 없음 [직접]
- DDL의 `feedbacks`에 `title`, `base_reward_snapshot`, `extra_reward_snapshot`이 없고, `registers`에 스냅샷 2개가 있다

#89-S21 추천과 추천 취소 [테스트]
- When  `updateRecommended(true)`, 그다음 `updateRecommended(false)`
- Then  `isRecommended()`가 true, 그다음 false다

#89-S22 신고 접수 [테스트]
- Given `SUBMITTED`
- When  `report()`
- Then  `REPORTED`다

#89-S23 보상 지급 [테스트]
- Given `SUBMITTED` 또는 `REPORTED`
- When  `reward()`
- Then  `REWARDED`다

#89-S24 보상 제외 [테스트]
- Given `REPORTED`
- When  `exclude()`
- Then  `EXCLUDED`다

#89-S25 허용하지 않는 상태 변경 [테스트]
- Given 위 표에서 "불가"인 조합 전부
- When  해당 메서드
- Then  `IllegalStateException`이고 상태가 그대로다
