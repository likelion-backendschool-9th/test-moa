# 페이지 URL

## 공통

| 페이지 | URL | 상태 |
| --- | --- | --- |
| 홈 | `/` | 후보 |
| 로그인 | `/login` | 확정 |
| 회원가입 | `/signup` | 확정 |
| 소셜 가입(이름 입력) | `/signup/social` | 후보 |

## 소식

| 페이지 | URL | 상태 |
| --- | --- | --- |
| 이벤트 | `/events` | 후보 |
| 공지사항 | `/notices` | 후보 |

## 테스트 모집

| 페이지 | URL | 상태 |
| --- | --- | --- |
| 모집 목록 | `/recruitments` | 확정 |
| 모집 게시글 상세 | `/recruitments/:slug` | 확정 (`docs/frontend/project/recruitment-detail.md`) |
| 테스트 지원 | `/recruitments/:slug/apply` | 우선 채택 |

## 참여 테스트(테스터) (고침 #101: 역할 경로로 이동)

| 페이지 | URL | 상태 |
| --- | --- | --- |
| 참여 테스트 목록 | `/testers/recruitments` | 확정 |
| 지원한 테스트 탭 | `/testers/recruitments?tab=applied` | 확정 |
| 참여 중인 테스트 탭 | `/testers/recruitments?tab=ongoing` | 확정 |
| 참여했던 테스트 탭 | `/testers/recruitments?tab=history` | 확정 |
| 내 참여 상세 | `/testers/recruitments/:participationKey` | 후보 |

## 개발자 프로젝트(개발자) (고침 #101: 역할 경로로 이동)

| 페이지 | URL | 상태 |
| --- | --- | --- |
| 내 프로젝트 목록 | `/developer/projects` | 확정 |
| 프로젝트 등록 | `/developer/projects/new` | 후보 |
| 프로젝트 상세 | `/developer/projects/:projectKey` | 확정 |
| 프로젝트 수정 | `/developer/projects/:projectKey/edit` | 후보 |
| 테스트 모집 작성 | `/developer/recruitments/new?project=:projectKey` | 확정 |
| 테스트 모집 관리 | `/developer/recruitments/:recruitmentKey` | 확정 |
| 테스터 관리 탭 | `/developer/recruitments/:recruitmentKey?tab=testers` | 후보 |
| 피드백 탭 | `/developer/recruitments/:recruitmentKey?tab=feedback` | 후보 |
| 분석 탭 | `/developer/recruitments/:recruitmentKey?tab=analytics` | 후보 |

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

## 구독

| 페이지 | URL | 상태 |
| --- | --- | --- |
| 구독 소개 | `/subscription` | 확정 (`docs/frontend/payment/subscription-intro.md`) |

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
| 플랜 관리(혜택 편집) | `/admin/plans` | 후보 |
| 회원 구독 관리(탭) | `/admin/plans?tab=subscriptions` | 후보 |
| 회원 구독 검색 | `/admin/plans?tab=subscriptions&email=:email` | 후보 |
| (예전 주소) 구독 관리 | `/admin/subscriptions` → 회원 구독 탭으로 넘어감 | 후보 |
| 출금 요청 관리 | `/admin/withdrawals` | 후보 |
| 처리 완료 출금 탭 | `/admin/withdrawals?tab=done` | 후보 |
| 출금 요청 모달 | `/admin/withdrawals?open=:withdrawalKey` | 후보 |
