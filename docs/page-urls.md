# 페이지 URL

## 공통

| 페이지 | URL | 상태 |
| --- | --- | --- |
| 홈 | `/` | 후보 |
| 로그인 | `/login` | 확정 |
| 회원가입 | `/signup` | 확정 |

## 소식

| 페이지 | URL | 상태 |
| --- | --- | --- |
| 이벤트 | `/events` | 후보 |
| 공지사항 | `/notices` | 후보 |

## 테스트 모집

| 페이지 | URL | 상태 |
| --- | --- | --- |
| 모집 목록 | `/recruitments` | 확정 |
| 모집 게시글 상세 | `/recruitments/:slug` | 확정 (`docs/frontend/recruitment-detail.md`) |
| 테스트 지원 | `/recruitments/:slug/apply` | 우선 채택 |

## 참여 테스트

| 페이지 | URL | 상태 |
| --- | --- | --- |
| 참여 테스트 목록 | `/my/participations` | 확정 |
| 지원한 테스트 탭 | `/my/participations?tab=applied` | 확정 |
| 참여 중인 테스트 탭 | `/my/participations?tab=ongoing` | 확정 |
| 참여했던 테스트 탭 | `/my/participations?tab=history` | 확정 |
| 내 참여 상세 | `/my/participations/:participationKey` | 후보 |

## 개발자 프로젝트

| 페이지 | URL | 상태 |
| --- | --- | --- |
| 내 프로젝트 목록 | `/my/projects` | 확정 |
| 프로젝트 등록 | `/my/projects/new` | 후보 |
| 프로젝트 상세 | `/my/projects/:projectKey` | 확정 |
| 프로젝트 수정 | `/my/projects/:projectKey/edit` | 후보 |
| 테스트 모집 작성 | `/my/projects/:projectKey/recruitments/new` | 확정 |
| 테스트 모집 관리 | `/my/projects/:projectKey/recruitments/:recruitmentKey` | 확정 |
| 테스터 관리 탭 | `/my/projects/:projectKey/recruitments/:recruitmentKey?tab=testers` | 후보 |
| 피드백 탭 | `/my/projects/:projectKey/recruitments/:recruitmentKey?tab=feedback` | 후보 |
| 분석 탭 | `/my/projects/:projectKey/recruitments/:recruitmentKey?tab=analytics` | 후보 |

## 마이페이지

| 페이지 | URL | 상태 |
| --- | --- | --- |
| 마이페이지 | `/my` | 확정 |
| 개인정보 수정 | `/my/profile/edit` | 확정 |
| 크레딧 관리 | `/my/credits` | 확정 |
| 출금 신청·내역 | `/my/credits/withdrawals` | 확정 |
| 구독 관리 | `/my/subscription` | 확정 |
| 구독 결제 | `/my/subscription/checkout` | 후보 |

## 채팅

| 페이지 | URL | 상태 |
| --- | --- | --- |
| 채팅함 | `/my/chats` | 확정 |
| 채팅방 | `/my/chats/:roomKey` | 확정 |

## 관리자

| 페이지 | URL | 상태 |
| --- | --- | --- |
| 관리자 진입 | `/admin` | 후보 |
| 회원 관리 | `/admin/users` | 후보 |
| 회원 검색·필터 | `/admin/users?filter=sanctioned\|reported&q=:nickname` | 후보 |
| 회원 상세 | `/admin/users/:userKey` | 후보 |
| 신고·제재 관리 | `/admin/reports` | 후보 |
| 처리 완료 신고 탭 | `/admin/reports?tab=done` | 후보 |
| 신고 대상 종류 필터 | `/admin/reports?tab=…&target=feedback\|recruitment\|user` | 후보 |
| 신고 상세 | `/admin/reports/:reportKey` | 후보 |
| 출금 요청 관리 | `/admin/withdrawals` | 후보 |
| 처리 완료 출금 탭 | `/admin/withdrawals?tab=done` | 후보 |
| 출금 요청 모달 | `/admin/withdrawals?open=:withdrawalKey` | 후보 |
| 모집 취소 요청 관리 | `/admin/cancellations` | 후보 |
| 처리 완료 모집 취소 탭 | `/admin/cancellations?tab=done` | 후보 |
| 모집 취소 요청 상세 | `/admin/cancellations/:cancellationKey` | 후보 |

## 변경 이력
- 2026-11-03: 출금 요청 상세(`/admin/withdrawals/:withdrawalKey`)를 목록 모달(`/admin/withdrawals?open=:withdrawalKey`)로 바꿨다.
