# 시나리오·요구사항 번호

모든 프론트엔드 문서의 시나리오(S)·요구사항(R) 번호를 한곳에서 관리한다. 번호를 새로 쓰거나 바꾸는 PR은 이 문서를 같은 PR에서 고친다. 기능 문서마다 표를 두면 PR마다 같은 표를 고쳐 충돌해서, 이 문서 하나로 모았다(2026-11-02).

## 시나리오 번호(S)
시나리오 번호(S)는 2026-11-02에 문서끼리 겹치지 않게 정리했다. 지금은 번호만 보면 어느 문서의 시나리오인지 알 수 있다. 테스트 파일 사이에서 같은 번호를 쓰는 것은 아래 규칙의 "한 시나리오를 여러 테스트로 확인하는 경우"뿐이다.

| 번호 | 문서 | 테스트 파일 |
| --- | --- | --- |
| S1~S82 | 홈 (`frontend-home.md`) | 여러 파일 |
| S83~S113 | 마이페이지 (`2026-10-30-frontend-my.md`) | `my.spec.ts` |
| S114~S140, S319~S320, S322, S339 | 채팅함 (`2026-10-30-frontend-chats.md`) | `chats.spec.ts` |
| S141~S158, S317~S318, S321, S335~S338, S340 | 채팅방 (`2026-11-01-frontend-chat-room.md`) | `chat-room.spec.ts` |
| S163~S184 | 개인정보 수정 (`2026-10-30-frontend-profile-edit.md`) | `profile.spec.ts` |
| S191~S219, S281, S284 | 출금 요청 관리 (`frontend-admin-withdrawals.md`) | `admin-withdrawals.spec.ts` |
| S220~S249, S280 | 회원 관리 (`frontend-admin-users.md`) | `admin-users.spec.ts` |
| S250~S279, S283 | 모집 취소 요청 관리 (`frontend-admin-cancellations.md`) | `admin-cancellations.spec.ts` |
| S286~S316, S347 | 로그인·회원가입 (`2026-11-01-frontend-auth.md`) | `auth.spec.ts`, `no-js-forms.spec.ts` |
| S323~S334, S341~S346 | 헤더 (`2026-11-01-frontend-header.md`) | `header.spec.ts`, `header-layout.spec.ts`, `mobile-menu.spec.ts` |
| S348~S381 | 크레딧 (`2026-10-30-frontend-credits.md`) | `credits.spec.ts` |
| S382~S400 | 구독 관리 (`2026-10-30-frontend-subscription.md`) | `subscription.spec.ts` |
| S401~S422 | 운영자 홈 (`frontend-admin-home.md`) | `admin-home.spec.ts` |
| S423~S447 | 신고·제재 관리 (`frontend-admin-reports.md`) | `admin-reports.spec.ts` |
| S448~S482 | 참여 테스트·참여 상세 (`frontend-participations.md`) | `participations.spec.ts`, `participation-detail.spec.ts` |
| S483~S526 | 개발자 프로젝트 (`frontend-projects.md`) | `projects.spec.ts` |

## 번호 규칙
- **새 시나리오는 지금 가장 큰 번호 다음부터 쓴다.** 2026-11-02 기준 가장 큰 번호는 S526이라 다음은 S527이다. 쓰기 전에 `grep -rn "S527" docs frontend/e2e`처럼 비어 있는지 확인한다.
- **한 번호를 여러 테스트가 쓰려면, 문서의 그 시나리오에 모든 확인이 적혀 있어야 한다.** 지금 그런 번호는 S26(경로마다 반복), S64(마우스·reduced motion), S177·S288·S300(JS 없이 제출), S314(가입과 개인정보 수정의 닉네임 길이), S327(패널 내용과 로고), S340(키보드·휴대폰 Enter)이다.
- **번호가 바뀐 시나리오는 옛 번호를 문서 본문에 남기지 않는다.** PR 설명이나 커밋 메시지에 남은 옛 번호는 아래 대응표로 찾는다.

## 옛 번호 → 새 번호 (2026-11-02 번호 정리)
번호를 그대로 둔 문서(채팅함, 마이페이지, 채팅방, 출금 요청 관리)를 옮겨야 하는 시나리오가 가장 적은 조합으로 골랐다. 옮긴 문서는 비어 있던 S348부터 문서 단위로 이어서 배정했고, 문서 안의 순서는 그대로다.

| 문서 | 옛 번호 | 새 번호 |
| --- | --- | --- |
| 크레딧 | S135~S162, S185~S190 | S348~S375, S376~S381 |
| 구독 관리 | S193~S211 | S382~S400 |
| 운영자 홈 | S83~S104 | S401~S422 |
| 신고·제재 관리 | S114~S137, S282 | S423~S446, S447 |
| 참여 테스트·참여 상세 | S83~S104, S191~S202, S285 | S448~S469, S470~S481, S482 |
| 개발자 프로젝트 | S101~S144 | S483~S526 |
| 헤더 | S317~S322 | S341~S346 |
| 로그인·회원가입 | S335 | S347 |

## 요구사항 번호(R)
요구사항 번호도 2026-11-02에 문서끼리 겹치지 않게 정리했다. 문서 제목의 `(R번호)`와 테스트 파일의 `test.describe("R번호 …")`가 같은 번호를 쓴다.

| 번호 | 문서 |
| --- | --- |
| R1~R13 | 홈 (`frontend-home.md`) |
| R14~R22 | 운영자 홈 (`frontend-admin-home.md`) |
| R23~R30 | 신고·제재 관리 (`frontend-admin-reports.md`) |
| R31~R38 | 출금 요청 관리 (`frontend-admin-withdrawals.md`) |
| R39~R46 | 회원 관리 (`frontend-admin-users.md`) |
| R47~R54 | 모집 취소 요청 관리 (`frontend-admin-cancellations.md`) |
| R101~R112 | 개발자 프로젝트 (`frontend-projects.md`) |
| R113~R122 | 채팅함 (`2026-10-30-frontend-chats.md`) |
| R123~R129 | 크레딧 (`2026-10-30-frontend-credits.md`) |
| R130~R141 | 마이페이지 (`2026-10-30-frontend-my.md`) |
| R142~R147 | 개인정보 수정 (`2026-10-30-frontend-profile-edit.md`) |
| R148~R154 | 구독 관리 (`2026-10-30-frontend-subscription.md`) |
| R155~R162 | 로그인·회원가입 (`2026-11-01-frontend-auth.md`) |
| R163~R174 | 채팅방 (`2026-11-01-frontend-chat-room.md`) |
| R175~R181 | 헤더 (`2026-11-01-frontend-header.md`) |
| R182~R195 | 참여 테스트·참여 상세 (`frontend-participations.md`) |

- **새 요구사항은 지금 가장 큰 R번호 다음부터 쓴다.** 2026-11-02 기준 가장 큰 번호는 R195라 다음은 R196이다.
- **옛 번호 → 새 번호:** 홈, 운영자 문서, 개발자 프로젝트는 그대로 두고, R1부터 따로 쓰던 아홉 개 문서를 R113부터 문서 단위로 이어서 옮겼다. 문서 안의 순서는 그대로다.

  | 문서 | 옛 번호 | 새 번호 |
  | --- | --- | --- |
  | 채팅함 | R1~R10 | R113~R122 |
  | 크레딧 | R1~R7 | R123~R129 |
  | 마이페이지 | R1~R12 | R130~R141 |
  | 개인정보 수정 | R1~R6 | R142~R147 |
  | 구독 관리 | R1~R7 | R148~R154 |
  | 로그인·회원가입 | R1~R8 | R155~R162 |
  | 채팅방 | R1~R12 | R163~R174 |
  | 헤더 | R1~R7 | R175~R181 |
  | 참여 테스트·참여 상세 | R1~R14 | R182~R195 |
