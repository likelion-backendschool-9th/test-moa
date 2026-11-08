# 채팅 시작과 읽기 전용 (#53)

구독 개발자가 자기 모집 건에 확정된 테스터에게 채팅을 거는 API와, 모집·구독이 끝난 방을 읽기 전용으로 두는 규칙. 채팅 전체에서 정한 것과 데이터 구조는 [README.md](README.md)에 있고, 방 정보·채팅함 응답은 [messages.md](messages.md)(#49)와 [inbox.md](inbox.md)(#48)의 모양에 필드를 더한다. 보내기는 [messages.md](messages.md)의 `POST /api/v1/chats/{roomKey}/messages`다.

## 한눈에
- 끝나면: 구독 중인 개발자가 `POST /api/v1/chats`에 `{"registerId": 12}`를 보내면 그 참가의 채팅방이 생기고 HTTP 201 `{"roomKey"}`를 받는다. 이미 방이 있으면 HTTP 200으로 그 방의 `roomKey`를 받는다. 방 정보와 채팅함의 방마다 `readOnly`가 오고, 읽기 전용 방에서는 개발자·테스터 모두 보내기가 HTTP 403 `CHAT_READ_ONLY`로 거절된다. 읽기 전용은 모집이 끝났거나(`Recruitment.phaseAt(now)`가 `CLOSED`·`CANCELLED`: 피드백 마감이 지났거나 모집 취소) 개발자의 구독이 끝난 방이다
- 결정 필요: 없음 (Q1~Q3 11-08 답변: 개발자 구독 상태로 판단, 보내기 막기까지 #53, 끝난 기준은 `phaseAt`의 `CLOSED`·`CANCELLED`)
- 규모: 6단계(준비 1, 구현 4, 문서 1)

## 1. 채팅 걸기 (#53-R1)
구독 중인 개발자가 자기 모집 건의 `CONFIRMED` 참가로 채팅을 걸면 방이 생긴다. 이미 방이 있으면 새로 만들지 않고 그 방을 돌려준다.

#53-S1 정상 [테스트]
- Given 개발자 A("모아개발")가 구독 중이다(`start_at <= 지금 < end_at`, `ACTIVE`)
- Given A의 프로젝트 "북로그" 모집 건이 테스트 중(`TESTING`)이다
- Given 테스터 B("모아테스터")의 참가 P가 `CONFIRMED`이고, P의 방은 없다
- When  A가 `POST /api/v1/chats`에 `{"registerId": P}`를 보낸다
- Then  HTTP 201이고 `data`는 `{"roomKey": "<22자>"}`이다
- Then  DB에 P의 방이 1개 있고, 참여자는 A(`DEVELOPER`)와 B(`TESTER`) 2명이다
- Then  방의 `last_seq`는 0이다
- Then  A가 `GET /api/v1/chats/{roomKey}`를 부르면 HTTP 200이고 `partner.nickname`은 "모아테스터", `readOnly`는 false다

#53-S2 정상: 이미 있는 방 [테스트]
- Given #53-S1로 P의 방 R이 있고, R에 메시지 2개가 있다
- When  A가 같은 `{"registerId": P}`를 다시 보낸다
- Then  HTTP 200이고 `data.roomKey`는 R이다
- Then  DB의 방 수와 참여자 수, R의 메시지 수는 그대로다
- Given 이어서 A의 구독이 끝났다(`end_at`이 지남)
- When  A가 같은 요청을 다시 보낸다
- Then  HTTP 200이고 `data.roomKey`는 R이다(기록 보기는 허용)
- Given 이어서 P가 `CANCELLED`가 되었다
- When  A가 같은 요청을 다시 보낸다
- Then  HTTP 200이고 `data.roomKey`는 R이다

#53-S3 정상: 내가 지운 방 [테스트]
- Given #53-S1의 조건(A 구독 중, 모집 건 `TESTING`, P `CONFIRMED`)으로 P의 방 R이 있고, R에 B가 보낸 메시지 2개가 있다
- Given A가 R 이름을 "북로그 1차"로 바꾸고 순번 2까지 읽은 뒤 삭제했다(`hidden = true`)
- Given B도 R을 삭제했다
- When  A가 `{"registerId": P}`를 보낸다
- Then  HTTP 200이고 `data.roomKey`는 R이다
- Then  A의 `hidden`은 false, `custom_room_name`은 "북로그 1차", `last_read_seq`는 2 그대로다
- Then  A의 `GET /api/v1/chats`에 R이 다시 있고, A가 `GET /api/v1/chats/{R}`을 부르면 HTTP 200이다
- Then  B의 `hidden`은 true 그대로다(B는 #50대로 A가 메시지를 보낼 때 다시 나타난다)
- Given 이어서 A가 R을 다시 삭제하고, A의 구독이 끝났다
- When  A가 같은 요청을 보낸다
- Then  HTTP 200이고 A의 `hidden`은 false다(끝난 방도 기록 보기는 허용, R의 `readOnly`는 true)

#53-S4 동시 요청 [테스트]
- Given #53-S1의 조건에서 P의 방이 없다
- When  A의 `{"registerId": P}` 요청 두 개가 동시에 들어온다
- Then  두 응답 모두 성공이고(하나는 201, 하나는 200) `data.roomKey`가 같다
- Then  DB에 P의 방은 1개, 참여자는 2명이다

## 2. 걸 수 없는 경우 (#53-R2)
남의 모집 건, 없는 참가, 확정되지 않은 참가, 구독하지 않은 개발자, 끝난 모집 건에는 새 방을 만들지 않는다. 방이 이미 있으면 #53-S2를 따른다.

#53-S5 실패: 찾을 수 없음 [테스트]
- Given #53-S1의 조건이고, 개발자 C는 구독 중이지만 "북로그"의 주인이 아니다
- When  C가 `{"registerId": P}`를 보낸다
- When  A가 없는 `{"registerId": 999999}`를 보낸다
- When  테스터 B가 `{"registerId": P}`를 보낸다
- Then  모두 HTTP 404, `error.code` "NOT_FOUND"이다
- Then  DB에 방이 생기지 않는다

#53-S6 실패: 확정되지 않은 참가 [테스트]
- Given #53-S1의 조건에서 P의 상태만 `APPLIED`, `REJECTED`, `CANCELLED`로 바꾼다
- When  A가 각각 `{"registerId": P}`를 보낸다
- Then  모두 HTTP 400, `error.code` "INVALID_INPUT"이다
- Then  DB에 방이 생기지 않는다

#53-S7 실패: 구독하지 않은 개발자 [테스트]
- Given #53-S1의 조건에서 A의 구독만 없음, 만료(`end_at` 지남), `CANCELLED`, 시작 전(`start_at`이 내일)으로 바꾼다
- When  A가 각각 `{"registerId": P}`를 보낸다
- Then  모두 HTTP 403, `error.code` "SUBSCRIPTION_REQUIRED"이다
- Then  DB에 방이 생기지 않는다

#53-S8 실패: 끝난 모집 건 [테스트]
- Given #53-S1의 조건에서 모집 건만 피드백 마감이 어제로 지났다
- When  A가 `{"registerId": P}`를 보낸다
- Then  HTTP 403, `error.code` "CHAT_READ_ONLY"이다
- Given 피드백 마감은 다음 주이고 모집 건이 취소(`CANCELLED`)되었다
- Then  같은 요청이 HTTP 403, `error.code` "CHAT_READ_ONLY"이다
- Then  DB에 방이 생기지 않는다

#53-S9 실패: 잘못된 본문 [테스트]
- When  A가 `{}`, `{"registerId": 0}`, `{"registerId": -1}`, `{"registerId": "abc"}`를 보낸다
- Then  모두 HTTP 400, `error.code` "INVALID_INPUT"이다

#53-S10 실패: 비로그인 [테스트]
- When  토큰 없이 `POST /api/v1/chats`를 부른다
- Then  HTTP 401, `error.code` "UNAUTHORIZED"이다

## 3. 읽기 전용 표시 (#53-R3)
방 정보와 채팅함의 방마다 `readOnly`가 온다. 모집 건의 `phaseAt(now)`가 `CLOSED`·`CANCELLED`이거나 그 방 개발자의 구독이 끝났으면 true다. 두 참여자에게 같은 값이다.

#53-S11 정상: 열린 방 [테스트]
- Given #53-S1의 방 R(모집 건 `TESTING`, A 구독 중)이 있다
- Given 같은 A의 다른 모집 건(`RECRUITING`, 선착순으로 확정된 테스터 D)의 방 R2가 있다
- When  A와 B가 각각 `GET /api/v1/chats/{R}`와 `GET /api/v1/chats`를 부른다
- Then  두 사람 모두 R의 `readOnly`는 false다
- Then  A의 채팅함에서 R2의 `readOnly`도 false다

#53-S12 정상: 읽기 전용이 되는 경우 [테스트]
- Given #53-S11의 방 R이 있다
- When  모집 건의 피드백 마감이 지난다
- Then  A와 B의 방 정보·채팅함에서 R의 `readOnly`는 true다
- When  피드백 마감을 다음 주로 되돌리고 모집 건을 취소한다
- Then  R의 `readOnly`는 true다
- When  모집 건을 `TESTING`으로 되돌리고 A의 구독이 끝난다
- Then  A와 B 모두 R의 `readOnly`는 true다
- Then  이름 변경 응답(`PATCH /api/v1/chats/{R}`)의 `readOnly`도 true다

## 4. 읽기 전용 방의 보내기 (#53-R4)
읽기 전용 방에서는 개발자·테스터 모두 메시지를 보낼 수 없다. 메시지 조회, 읽음 처리, 이름 변경, 삭제는 그대로 된다.

#53-S13 실패 [테스트]
- Given #53-S12처럼 R이 읽기 전용이고, R의 `last_seq`는 2이다
- When  A와 B가 각각 `POST /api/v1/chats/{R}/messages`에 `{"text": "추가 질문 있어요"}`를 보낸다
- Then  모두 HTTP 403, `error.code` "CHAT_READ_ONLY"이다
- Then  R의 메시지 수와 `last_seq`(2), `last_message_at`은 그대로다
- Then  삭제했던 상대의 `hidden`도 그대로다
- Then  SSE `message` 이벤트가 가지 않는다

#53-S14 정상: 읽기 전용 방의 다른 기능 [테스트]
- Given #53-S13의 방 R
- When  B가 메시지 조회, `{"seq": 2}` 읽음 처리, 이름 변경, 삭제를 차례로 한다
- Then  모두 HTTP 200으로 성공한다 (고침 #53: 기존 삭제 API의 응답 유지)

#53-S15 정상: 열린 방의 보내기는 그대로 [테스트: ChatControllerTest #49-S7]
- 구독 중인 개발자의 `TESTING` 모집 건 방에서 보내기는 #49와 같다. #49의 테스트 준비에 구독과 마감일을 넣어 계속 통과시킨다

## 범위 밖
- 화면: 참여 관리의 "채팅" 링크를 이 API로 바로 방으로 보내기, 채팅방 입력창을 읽기 전용으로 바꾸기, 채팅함 카드의 읽기 전용 표시: #54
- 새 방이 생겼다는 SSE 알림: 메시지가 없는 방은 첫 메시지의 `message` 이벤트로 상대 채팅함에 반영한다(#51)
- 피드백 마감 뒤 며칠 더 열어 두기: Q3 B. 필요해지면 `ChatReadOnlyPolicy`의 조건만 바꾼다
- 테스터가 채팅을 거는 것: 기획 4장이 "구독 개발자가 선정 후 시작"으로 정했다
- 정지·탈퇴 회원의 제한: 운영자 제재(#86)

## 작업 순서
1. 준비: 바탕 브랜치에 `Recruitment.phaseAt`(#113)이 있게 한다
   - #174 병합 뒤 `feature/chat-realtime`(#51)을 develop 위로 rebase하고, 이 브랜치를 그 위로 rebase한다
   - 확인: `git grep -n "phaseAt" backend/src/main`에 `Recruitment.java`가 나온다
2. 채팅 걸기 — #53-S1, S2, S5~S10
   - 파일: `controller/ChatController.java`(`POST /api/v1/chats`, 새로 만들면 `ResponseEntity` 201, 있으면 200), `dto/request/ChatStartRequest.java`(`@NotNull @Positive Long registerId`), `dto/response/ChatStartResponse.java`(`String roomKey`), `service/ChatService.java`, `service/impl/ChatServiceImpl.java`(`startChat`), `repository/RegisterRepository.java`(`findLockedById`: `PESSIMISTIC_WRITE`, 모집 건·프로젝트 fetch join), `repository/ChatRoomRepository.java`(`findByRegisterId`), `global/exception/ErrorCode.java`(`CHAT_READ_ONLY`)
   - 순서: 참가를 잠가 읽음 → 주인이 아니거나 없으면 404 → 방이 있으면 200 → `CONFIRMED`가 아니면 400 → `subscriptionChecker.require` 403 → `ChatReadOnlyPolicy`의 모집 끝남 403 → `ChatRoom.builder().register(...)` 저장 후 201
   - 확인: `./gradlew test --tests '*ChatStartControllerTest*'`
3. 지운 방과 동시 요청 — #53-S3, S4
   - 파일: `repository/ChatParticipantRepository.java`(`unhideMine(roomId, userId)`: 방 ID와 회원 ID로 내 행의 `hidden`·`updated_at`만 바꾸는 update), `ChatServiceImpl.startChat`
   - 참여자 목록을 로딩해 내 ID를 찾는 대신 방 ID와 회원 ID로 바로 갱신한다(사용자 승인). 이름·읽은 순번과 상대의 숨김은 보존한다
   - 동시 요청은 2단계의 참가 행 잠금으로 막는다. 두 번째 요청은 잠금을 기다린 뒤 이미 있는 방을 찾아 200이다
   - 확인: 같은 명령
4. 읽기 전용 계산과 표시 — #53-S11, S12
   - 파일: `service/ChatReadOnlyPolicy.java`(새로 만듦, 읽기 전용 판단은 여기에만 둔다), `service/SubscriptionChecker.java`(`activeUserIds(Collection<Long>)`: `findActive`와 같은 조건으로 구독 중인 회원 id만), `repository/projection/ChatRoomEntry.java`·`ChatInboxEntry.java`(`developerId` 추가), `ChatParticipantRepository`의 두 조회(`project.user.id`), `dto/response/ChatRoomResponse.java`·`ChatInboxResponse.java`(`readOnly`)
   - `ChatReadOnlyPolicy`: `isClosed(Recruitment, now)`는 `phaseAt(now)`가 `CLOSED` 또는 `CANCELLED`인지 본다(취소 단계가 별도인 현재 도메인에 맞춤, 11-08 승인), `isReadOnly(Recruitment, developerActive, now)`는 `isClosed || !developerActive`
   - 채팅함은 쿼리를 방마다 더 하지 않는다. 모집 건은 `recruitmentRepository.findAllById`로, 구독은 `activeUserIds`로 한 번씩 읽는다
   - 확인: `./gradlew test --tests '*ChatStartControllerTest*' --tests '*ChatInboxControllerTest*' --tests '*ChatControllerTest*'`
5. 읽기 전용 방의 보내기 — #53-S13, S14, S15
   - 파일: `ChatServiceImpl.sendMessage`(방을 잠근 뒤, 메시지를 만들기 전에 `ChatReadOnlyPolicy`로 확인), 기존 채팅 테스트의 준비 데이터(개발자 구독, 모집 건 마감일이 미래)
   - 확인: `./gradlew test --tests '*Chat*'`
6. 문서
   - 파일: `docs/backend/chat/README.md` 정한 것에 "끝난 기준은 `phaseAt`의 `CLOSED`·`CANCELLED`, 읽기 전용은 보내기만 막고 `CHAT_READ_ONLY` 403" 한 줄을 더한다. `messages.md:128`과 `inbox.md:115`의 "#53"에 `(고침 #53: 끝난 기준 정함)`을 붙인다
   - 확인: 문서 링크가 열린다

## 가정
- 이미 방이 있으면 구독·모집 상태·참가 상태를 보지 않고 200으로 돌려준다. 끝난 방도 기록은 볼 수 있어야 하기 때문이다(기획 4장 "구독 만료 후에도 기존 채팅 기록은 조회")
- 확인 순서는 404 → 이미 있는 방 200 → 400 → 403 구독 → 403 끝난 모집이다. 남의 참가가 있는지를 다른 오류로 알려 주지 않도록 404를 가장 먼저 둔다
- 테스터가 부르면 "내 모집 건이 아님"과 같은 404다
- 끝난 모집 건과 읽기 전용 방의 보내기는 같은 `CHAT_READ_ONLY`(403, "대화가 끝난 방이라 메시지를 보낼 수 없어요")다. 화면은 이 코드로 입력창을 닫는다
- 구독 판단은 `SubscriptionChecker`만 쓴다. `CANCELLED`를 만료일까지 이용으로 볼지 바뀌면 그 클래스만 고친다(그 클래스의 주석)
- `phaseAt`은 취소 시 `CANCELLED`, 피드백 마감(한국 시간 그날 23:59:59, 프로젝트 README 정한 것 10)이 지났거나 저장 상태가 모집 중·취소가 아니면 `CLOSED`를 반환한다. `ChatReadOnlyPolicy`에서 두 단계를 모두 종료로 판단한다(11-08 승인). 저장값 `RecruitmentStatus.CLOSED`(모집 마감)는 직접 판단하지 않는다
- 읽기 전용이어도 읽음 처리·이름 변경·삭제는 내 행만 바꾸므로 막지 않는다
- 동시 요청은 `register_id` unique 제약을 믿고 위반을 잡는 대신 참가 행을 잠근다. Postgres는 제약 위반이 난 트랜잭션을 중단시켜 같은 트랜잭션에서 다시 조회할 수 없다([entities.md](entities.md))
- `RegisterRepository`는 프로젝트 담당 파일이다. 잠금 조회 메서드 하나만 더하고 기존 메서드는 바꾸지 않는다

## 참고 (2026-11-08 확인)
- 기획 4장 "채팅·노출·구독 만료": 구독 개발자와 선정된 테스터만, 선정 후 시작, 만료 뒤 기록 조회 가능, 메시지 전송은 구독 중에만 (`project-lion/.scratch/tester-platform-planning/spec.md`)
- 채팅 README 정한 것: "모집이 끝나거나 구독이 끝난 방은 읽기 전용(#53, 11-04)", "거는 시점에 개발자가 구독 중이고 `Register`가 `CONFIRMED`(#53, 11-05)"
- `messages.md:128`: `RecruitmentStatus.CLOSED`로 막으면 테스트 중 대화가 막혀서 끝나는 기준을 #53에서 정하기로 함
- `Recruitment.phaseAt(now)`(develop, #113): 취소는 `CANCELLED`, 나머지 저장 상태가 `RECRUITING`이 아니면 `CLOSED`, 모집 마감 전 `RECRUITING`, 피드백 마감 전 `TESTING`, 그 뒤 `CLOSED`
- `SubscriptionChecker.require`: 구독 중이 아니면 403 `SUBSCRIPTION_REQUIRED`
- `ChatRoom` 생성자가 개발자(`recruitment.project.user`)와 테스터 참여자를 함께 만들고, "구독·선정 확인은 호출하는 쪽에서" 한다
