# 시나리오·요구사항 번호

이슈 번호가 없는 옛 시나리오(S1~S548)·요구사항(R1~R202) 번호가 어느 문서의 것인지, 2026-11-02 번호 정리 전에는 무엇이었는지 찾는 표다. 새 번호는 이슈마다 1부터 센다(`#42-S1`, [AGENTS.md](../AGENTS.md#테스트)). 이 문서에는 새 번호를 적지 않는다. (고침 #56: 동시에 여러 PR이 같은 "다음 번호"를 받아 겹쳐서 이슈 번호 규칙으로 바꿈)

## 시나리오 번호(S)
시나리오 번호(S)는 2026-11-02에 문서끼리 겹치지 않게 정리했다. 지금은 번호만 보면 어느 문서의 시나리오인지 알 수 있다. 테스트 파일 사이에서 같은 번호를 쓰는 것은 아래 규칙의 "한 시나리오를 여러 테스트로 확인하는 경우"뿐이다.

| 번호 | 문서 | 테스트 파일 |
| --- | --- | --- |
| S1~S82 | 홈 (`frontend/home.md`) | 여러 파일 |
| S83~S113 | 마이페이지 (`frontend/my.md`) | `my.spec.ts` |
| S114~S140, S319~S320, S322, S339 | 채팅함 (`frontend/chats.md`) | `chats.spec.ts` |
| S141~S158, S317~S318, S321, S335~S338, S340 | 채팅방 (`frontend/chat-room.md`) | `chat-room.spec.ts` |
| S163~S184 | 개인정보 수정 (`frontend/profile-edit.md`) | `profile.spec.ts` |
| S191~S219, S281, S284 | 출금 요청 관리 (`frontend/admin-withdrawals.md`) | `admin-withdrawals.spec.ts` |
| S220~S249, S280, S527 | 회원 관리 (`frontend/admin-users.md`) | `admin-users.spec.ts` |
| S250~S279, S283 | 삭제됨(결번, #43) | — |
| S356, S364 | 삭제됨(결번, #74) | — |
| S286~S316, S347 | 로그인·회원가입 (`frontend/auth.md`) | `auth.spec.ts`, `no-js-forms.spec.ts` |
| S323~S334, S341~S346 | 헤더 (`frontend/header.md`) | `header.spec.ts`, `header-layout.spec.ts`, `mobile-menu.spec.ts` |
| S348~S381 | 크레딧 (`frontend/credits.md`) | `credits.spec.ts` |
| S382~S400 | 구독 관리 (`frontend/subscription.md`) | `subscription.spec.ts` |
| S544~S548 | 크레딧 구분·내역 시각 (`frontend/credit-labels.md`) | `credits.spec.ts`, `my.spec.ts` |
| S401~S422 | 운영자 홈 (`frontend/admin-home.md`) | `admin-home.spec.ts` |
| S423~S447, S528~S532 | 신고·제재 관리 (`frontend/admin-reports.md`) | `admin-reports.spec.ts` |
| S448~S482 | 참여 테스트·참여 상세 (`frontend/participations.md`) | `participations.spec.ts`, `participation-detail.spec.ts` |
| S483~S526 | 개발자 프로젝트 (`frontend/projects.md`) | `projects.spec.ts` |
| S533~S543 | 구독 결제 (`frontend/subscription.md`) | `subscription-checkout.spec.ts` |

## 번호 규칙 (#56 전까지)
- **새 시나리오는 지금 가장 큰 번호 다음부터 쓴다.** 2026-11-04 기준 가장 큰 번호는 S548이라 다음은 S549이다. 쓰기 전에 `grep -rn "S549" docs frontend/e2e`처럼 비어 있는지 확인한다. (열려 있는 출금 모달 PR #42가 S537~S539를 쓰면 구독 결제 S533~S543과 겹친다. #30이 먼저 들어가면 #42는 S549~S551로 옮긴다.)
- **한 번호를 여러 테스트가 쓰려면, 문서의 그 시나리오에 모든 확인이 적혀 있어야 한다.** 지금 그런 번호는 S26(경로마다 반복), S64(마우스·reduced motion), S177·S288·S300(JS 없이 제출), S314(가입과 개인정보 수정의 닉네임 길이), S327(패널 내용과 로고), S340(키보드·휴대폰 Enter), S485(프로젝트 경로·다른 회원 404), S521(일괄 확정·모집 종료), S525(모집 종료 거절·결과 반영), S526(확정 실패·오프라인·거절·만료, 5개)이다.
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
| 신고·제재 필터(#28) | S532~S536 | S528~S532 |
| 구독 결제(#25) | S341~S351 | S533~S543 |
| 회원 관리 활동(#27) | S531 | S527 |
| 출금 요청 모달(#42) | S537~S539 (잠시 S549~S551) | `#42-S1`~S3 (이슈 번호 규칙; S4~S9는 리뷰 반영으로 추가) |
| 크레딧 구분·내역 시각(#29, develop 병합) | (본문과 겹치던) S352~S356 | S544~S548 |

## 요구사항 번호(R)
요구사항 번호도 2026-11-02에 문서끼리 겹치지 않게 정리했다. 문서 제목의 `(R번호)`와 테스트 파일의 `test.describe("R번호 …")`가 같은 번호를 쓴다.

| 번호 | 문서 |
| --- | --- |
| R1~R13 | 홈 (`frontend/home.md`) |
| R14~R22 | 운영자 홈 (`frontend/admin-home.md`) |
| R23~R30 | 신고·제재 관리 (`frontend/admin-reports.md`) |
| R31~R38 | 출금 요청 관리 (`frontend/admin-withdrawals.md`) |
| R39~R46 | 회원 관리 (`frontend/admin-users.md`) |
| R47~R54 | 삭제됨(결번, #43) |
| R101~R112 | 개발자 프로젝트 (`frontend/projects.md`) |
| R113~R122 | 채팅함 (`frontend/chats.md`) |
| R123~R129 | 크레딧 (`frontend/credits.md`) |
| R130~R141 | 마이페이지 (`frontend/my.md`) |
| R142~R147 | 개인정보 수정 (`frontend/profile-edit.md`) |
| R148~R154 | 구독 관리 (`frontend/subscription.md`) |
| R155~R162 | 로그인·회원가입 (`frontend/auth.md`) |
| R163~R174 | 채팅방 (`frontend/chat-room.md`) |
| R175~R181 | 헤더 (`frontend/header.md`) |
| R182~R195 | 참여 테스트·참여 상세 (`frontend/participations.md`) |
| R196~R199 | 구독 결제 (`frontend/subscription.md`) |
| R200~R202 | 크레딧 구분·내역 시각 (`frontend/credit-labels.md`) |

- **새 요구사항은 지금 가장 큰 R번호 다음부터 쓴다.** 2026-11-04 기준 가장 큰 번호는 R202라 다음은 R203이다.
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
  | 구독 결제 | R1~R4 | R196~R199 |
  | 크레딧 구분·내역 시각(#29) | R1~R3 | R200~R202 |
