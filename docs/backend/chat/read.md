# 읽음 처리·안 읽은 수·읽음 표시 (#52)

참여자가 방의 메시지를 읽었다고 알리고, 채팅함과 헤더에 안 읽은 수를, 채팅방에 상대가 어디까지 읽었는지를 주는 API. 채팅 전체에서 정한 것과 데이터 구조는 [README.md](README.md)에 있고, 방 정보·채팅함 응답은 [messages.md](messages.md)(#49)와 [inbox.md](inbox.md)(#48)의 모양에 필드를 더한다.

## 한눈에
- 끝나면: 참여자가 `POST /api/v1/chats/{roomKey}/read`에 `{"seq": 7}`을 보내면 내 `last_read_seq`가 7로 오른다(내려가지 않는다). 채팅함의 방마다 `unreadCount`(내 `last_read_seq`보다 큰 상대 메시지 수)가, `GET /api/v1/chats/unread`로 헤더용 전체 안 읽은 수가, 방 정보에 `partnerLastReadSeq`(상대가 읽은 마지막 순번)가 온다. 내가 보낸 메시지는 안 읽은 수에 들어가지 않는다
- 결정 필요: 없음
- 규모: 6단계(구현 5, 문서 1)

## 1. 읽음 처리 (#52-R1)
참여자가 순번을 보내면 내 `last_read_seq`가 그 순번으로 오른다. 지금보다 작거나 같은 순번이면 바꾸지 않는다.

#52-S1 정상 [테스트]
- Given 개발자 A("모아개발")의 프로젝트 "북로그" 모집 건에 테스터 B("모아테스터")가 선정되어 방 R이 열려 있다
- Given R에 A가 메시지 3개(순번 1~3)를 보냈고 B의 `last_read_seq`는 0이다
- When  B가 `POST /api/v1/chats/{R}/read`에 `{"seq": 3}`을 보낸다
- Then  HTTP 200이고 `data`는 `{"lastReadSeq": 3}`이다
- Then  DB의 B `last_read_seq`는 3이고 `updated_at`이 갱신된다
- Then  A의 `last_read_seq`는 0 그대로다

#52-S2 정상: 일부만 읽기 [테스트]
- Given #52-S1의 방에서 B의 `last_read_seq`가 0이다
- When  B가 `{"seq": 2}`를 보낸다
- Then  `data.lastReadSeq`는 2다
- Then  B의 채팅함에서 R의 `unreadCount`는 1이다

#52-S3 정상: 뒤로 가지 않는다 [테스트]
- Given B의 `last_read_seq`가 3이다
- When  B가 `{"seq": 2}`를 보내고, 이어서 `{"seq": 3}`을 보낸다
- Then  둘 다 HTTP 200이고 `data.lastReadSeq`는 3이다
- Then  B의 `last_read_seq`는 3 그대로이고 `updated_at`도 바뀌지 않는다

#52-S4 정상: 다른 컬럼은 그대로 [테스트]
- Given B가 R 이름을 "북로그 1차"로 바꿨다
- When  B가 `{"seq": 3}`을 보낸다
- Then  B의 `custom_room_name`은 "북로그 1차", `hidden`은 false 그대로다

## 2. 읽음 처리 검증 (#52-R2)
순번이 없거나 1보다 작거나 방의 마지막 순번보다 크면 거절하고 읽음을 바꾸지 않는다.

#52-S5 실패 [테스트]
- Given #52-S1의 방(마지막 순번 3)에서 B의 `last_read_seq`가 1이다
- When  B가 `{}`, `{"seq": 0}`, `{"seq": -1}`, `{"seq": "abc"}`, `{"seq": 4}`를 보낸다
- Then  모두 HTTP 400, `error.code` "INVALID_INPUT"이다
- Then  B의 `last_read_seq`는 1 그대로다

## 3. 채팅함의 안 읽은 수 (#52-R3)
채팅함의 방마다 내 `last_read_seq`보다 순번이 큰 상대 메시지 수가 `unreadCount`로 온다. 내가 보낸 메시지는 세지 않는다.

#52-S6 정상 [테스트]
- Given B가 테스터로 들어간 방 R1과 개발자로 들어간 방 R2가 있다
- Given R1에 A가 "안녕하세요"(순번 1), B가 "네"(순번 2), A가 "확인 부탁드려요"(순번 3)를 보냈다
- Given R2에는 B만 "시작할게요"(순번 1)를 보냈다
- When  B가 `GET /api/v1/chats`를 부른다
- Then  R1의 `unreadCount`는 2, R2의 `unreadCount`는 0이다
- When  B가 R1에 `{"seq": 3}`을 보내고 채팅함을 다시 부른다
- Then  R1의 `unreadCount`는 0이다
- When  A가 채팅함을 부른다
- Then  A의 R1 `unreadCount`는 1이다(B의 "네")

#52-S7 경계: 메시지가 없는 방 [테스트]
- Given 방 R3이 막 열려 메시지가 없다
- When  R3의 참여자가 채팅함을 부른다
- Then  R3의 `unreadCount`는 0이다

## 4. 헤더의 전체 안 읽은 수 (#52-R4)
로그인 회원은 지우지 않은 내 방 전체의 안 읽은 상대 메시지 수를 따로 받는다.

#52-S8 정상 [테스트]
- Given #52-S6의 R1(B의 안 읽은 수 2)과, B가 테스터로 들어간 방 R4에 상대가 메시지 1개를 보냈다
- When  B가 `GET /api/v1/chats/unread`를 부른다
- Then  HTTP 200이고 `data`는 `{"count": 3}`이다
- When  B가 R4를 삭제하고 다시 부른다
- Then  `data.count`는 2다(지운 방은 세지 않는다)
- When  B가 R1에 `{"seq": 3}`을 보내고 다시 부른다
- Then  `data.count`는 0이다

#52-S9 정상: 지운 방이 다시 나타나면 지우기 전 안 읽은 메시지도 센다 [테스트]
- Given R4에 상대 메시지 2개(순번 1~2)가 있고 B의 `last_read_seq`는 0이다
- When  B가 R4를 삭제한다
- When  상대가 R4에 "다시 확인 부탁드려요"(순번 3)를 보낸다
- Then  B의 채팅함에 R4가 다시 있고 `unreadCount`는 3이다
- Then  B의 `GET /api/v1/chats/unread`의 `count`에 R4의 3이 들어간다
- Then  B의 `last_read_seq`는 0 그대로다

#52-S10 경계: 방이 없는 회원과 운영자 [테스트]
- Given 채팅방이 없는 회원 D와 운영자 E
- When  둘이 `GET /api/v1/chats/unread`를 부른다
- Then  둘 다 HTTP 200이고 `data.count`는 0이다

## 5. 상대의 읽음 표시 (#52-R5)
방 정보에 상대가 읽은 마지막 순번(`partnerLastReadSeq`)이 온다. 내 메시지의 순번이 그 값 이하이면 상대가 읽은 것이다(README의 11-05 결정).

#52-S11 정상 [테스트]
- Given #52-S1의 방에 B가 "네"(순번 4)를 보냈고 A의 `last_read_seq`는 0이다
- When  B가 `GET /api/v1/chats/{R}`를 부른다
- Then  `data.partnerLastReadSeq`는 0이다
- When  A가 `{"seq": 4}`를 보내고 B가 방 정보를 다시 부른다
- Then  `data.partnerLastReadSeq`는 4다
- When  A가 방 정보를 부른다
- Then  A의 `partnerLastReadSeq`는 B의 `last_read_seq`(0)다
- Then  이름 변경 응답(`PATCH /api/v1/chats/{R}`)에도 같은 `partnerLastReadSeq`가 있다

## 6. 들어갈 수 없는 방 (#52-R6)
읽음 처리는 #49-R5와 같이 거절한다. 비로그인은 401, 참여자가 아닌 회원·운영자·없는 방·내가 지운 방은 같은 404다. 헤더 수도 비로그인은 401이다.

#52-S12 실패: 비로그인 [테스트]
- When  토큰 없이 읽음 처리와 `GET /api/v1/chats/unread`를 부른다
- Then  둘 다 HTTP 401, `error.code` "UNAUTHORIZED"다

#52-S13 실패: 참여자가 아닌 회원·운영자·없는 방·지운 방 [테스트]
- Given #52-S1의 방 R과, 그 방과 관계없는 회원 C와 운영자 D가 있다
- When  C와 D가 R에 `{"seq": 1}`을 보내고, B가 없는 roomKey "aaaaaaaaaaaaaaaaaaaaaa"로 보낸다
- When  B가 R을 삭제한 뒤 R에 `{"seq": 1}`을 보낸다
- Then  모두 HTTP 404이고 응답 본문이 #49-S14와 같다
- Then  A의 `last_read_seq`는 0 그대로다

## 범위 밖
- 채팅방을 열어 둔 동안 받은 메시지의 읽음 처리와 상대에게 "읽었다" 알리기: #51. 화면이 SSE로 메시지를 받으면 이 API를 부르고, 서버는 읽음 처리 뒤 상대에게 알린다
- 프론트 연결(채팅함 카드의 안 읽은 수, 헤더 "채팅" 탭 표시, 말풍선의 읽음 표시, 방을 열면 읽음 처리): #54. 프론트 `types.ts`에는 아직 안 읽은 수·읽음 필드가 없다
- 채팅함의 전체 안 읽은 수 합계와 "안 읽은 방만" 거르기: 채팅함 화면에 없다
- 메시지마다 읽음 여부를 응답에 넣기: `partnerLastReadSeq` 하나로 화면이 판단한다
- 알림(푸시·메일): README "기획이 정하지 않은 것"

## 작업 순서
1. 읽음 처리의 가장 얇은 경로 — #52-S1, S3, S4, S12의 읽음 처리
   - 파일: `dto/request/ChatReadRequest.java`(새로, `@NotNull @Min(1) Long seq`), `dto/response/ChatReadResponse.java`(새로, `long lastReadSeq`), `repository/ChatParticipantRepository.java`(`markRead`), `service/ChatService.java`, `service/impl/ChatServiceImpl.java`(`markRead(roomKey, userId, seq)`), `controller/ChatController.java`(`@PostMapping("/{roomKey}/read")`), 테스트 `controller/ChatReadControllerTest.java`(새로)
   - 확인: `./gradlew test --tests '*ChatReadControllerTest'`
2. 검증과 들어갈 수 없는 방 — #52-S5, S13
   - 파일: `ChatServiceImpl.java`(`seq > room.lastSeq`면 `INVALID_INPUT`), 같은 테스트
   - 확인: 같은 명령
3. 채팅함의 안 읽은 수 — #52-S2, S6, S7
   - 파일: `ChatParticipantRepository.java`(`findInboxByUserId`에 안 읽은 수 하위 쿼리), `repository/projection/ChatInboxEntry.java`(`unreadCount`), `dto/response/ChatInboxResponse.java`(`Room.unreadCount`), 같은 테스트. 기존 `ChatInboxControllerTest`의 전체 비교(`JsonCompareMode`)가 있으면 기대값에 `unreadCount`를 더한다
   - 확인: `./gradlew test --tests '*ChatReadControllerTest' --tests '*ChatInboxControllerTest'`
4. 헤더 수와 지운 방 — #52-S8, S9, S10, S12의 헤더
   - 파일: `ChatParticipantRepository.java`(`countUnreadByUserId`), `dto/response/ChatUnreadResponse.java`(새로, `long count`), 서비스, 컨트롤러(`@GetMapping("/unread")`), 같은 테스트. `hideRoom`은 바꾸지 않는다
   - 확인: `./gradlew test --tests '*ChatReadControllerTest'`
5. 상대의 읽음 표시 — #52-S11
   - 파일: `ChatParticipantRepository.java`(`findRoomByRoomKeyAndUserId`에 `partner.lastReadSeq`), `repository/projection/ChatRoomEntry.java`, `dto/response/ChatRoomResponse.java`(`partnerLastReadSeq`), 같은 테스트. 기존 `ChatControllerTest`·`ChatRoomControllerTest`의 전체 비교가 있으면 기대값에 더한다
   - 확인: `./gradlew test --tests '*Chat*'`
6. 문서 — README 이슈 표에 이 문서 링크, "아직 정하지 않은 것"의 동시 갱신 항목에서 #52 쪽을 닫고 "정한 것"으로 옮김, "정한 것"의 읽음 표시 항목에서 "#52 이슈의 '범위 밖' 문구는 고쳐야 한다" 문장을 지움(11-08 이슈 수정), "정한 것"에 "삭제는 읽음을 바꾸지 않는다" 결정 추가. [rooms.md](rooms.md)·[messages.md](messages.md)는 고치지 않는다(#50-S7 그대로)

## 가정
- 읽음 처리는 방 정보·메시지 조회(GET)의 부수 효과로 하지 않고 따로 `POST /api/v1/chats/{roomKey}/read`로 한다. GET은 상태를 바꾸지 않아야 하고(Next 서버가 미리 불러오거나 다시 불러도 안전), #51에서 SSE로 받은 메시지도 같은 API로 읽음 처리할 수 있다
- 본문에 화면이 실제로 그린 마지막 순번 `seq`를 받는다. 순번 없이 "방의 마지막 순번까지"로 처리하면, 화면이 메시지를 받은 뒤 읽음 요청이 도착하기 전에 온 새 메시지까지 읽음이 된다
- `seq`가 방의 `last_seq`보다 크면 400이다. 화면은 받은 메시지의 순번만 보내므로 그런 값은 잘못된 요청이다. #49처럼 잘못된 요청을 조용히 바꾸지 않는다. 지금 값보다 작거나 같으면 오류가 아니라 200이다. 다른 탭이 먼저 더 읽었거나 요청 순서가 바뀐 경우라 정상이다. 응답의 `lastReadSeq`는 처리 뒤 DB 값이다
- 갱신은 `update chat_participants p set p.lastReadSeq = :seq, p.updatedAt = local datetime where p.id = :id and p.hidden = false and p.lastReadSeq < :seq`다. `last_read_seq`만 바꾸므로 상대의 보내기(`hidden` 해제)나 내 이름 변경·삭제와 겹쳐도 다른 컬럼을 덮지 않고, `lastReadSeq < :seq` 조건으로 동시에 와도 값이 내려가지 않는다. 0행이면 다시 읽어 지금 값을 돌려준다. 그 사이 같은 회원이 다른 탭에서 방을 지웠으면 404다. README "아직 정하지 않은 것"의 동시 갱신 항목은 이것으로 닫는다
- 방을 잠그지 않는다. `last_seq`는 보내기만 올리므로, 검사 시점보다 커질 수는 있어도 작아지지 않는다
- 안 읽은 수는 `chat_messages`에서 `room_id = 방`, `seq > 내 last_read_seq`, `sender_id <> 나`인 행 수다. 내가 보낸 메시지는 순번 사이에 끼어도 세지 않는다. 별도 카운터 컬럼을 두지 않는다. `(room_id, seq)` unique 인덱스로 범위를 찾으므로 1대1 방의 안 읽은 메시지 수만큼만 읽는다
- 채팅함은 지금처럼 쿼리 한 번으로 읽고, 안 읽은 수는 select 절의 상관 하위 쿼리로 더한다. 방마다 따로 조회하지 않는다
- 헤더 수는 `GET /api/v1/chats/unread`, 응답 `{"count": n}`이다. 숫자 뱃지와 "있다/없다" 점 표시 모두 이 값으로 할 수 있어서 안 읽은 방 수는 따로 주지 않는다. 주소 `/unread`는 `/{roomKey}`보다 Spring이 고정 경로를 먼저 고르고, roomKey는 22자라 겹치지 않는다
- 지운 방(`hidden = true`)은 헤더 수에 넣지 않는다. 채팅함에 보이지 않는 방의 수가 헤더에만 잡히면 눌러도 찾을 수 없다
- 방을 지워도 읽음 처리하지 않는다(11-08 사용자 결정, #50-S7 그대로). 상대가 다시 보내 방이 나타나면 지우기 전에 안 읽은 메시지까지 함께 센다. 그래서 상대가 1개를 보내도 헤더 수가 그보다 많이 오를 수 있다. 검토한 다른 안은 지울 때 방의 `last_seq`까지 읽음 처리해 다시 나타나면 새 메시지만 안 읽음으로 세는 것이었다
- `partnerLastReadSeq`는 방 정보(`ChatRoomResponse`)에만 넣고 채팅함 방(`ChatInboxResponse.Room`)에는 넣지 않는다. 채팅함 카드에는 읽음 표시가 없다. 이름 변경 응답은 방 정보를 그대로 쓰므로 함께 온다
- 상대가 방을 지워도 상대의 `last_read_seq`는 그대로 읽음 표시에 쓴다
- 메시지를 보내도 내 `last_read_seq`는 바뀌지 않는다. 안 읽은 수는 상대 메시지만 세므로 영향이 없고, 상대가 보낸 앞의 메시지를 읽었는지는 화면이 따로 알린다
- 테스트의 메시지는 #49 보내기 API로 보낸다(#48과 같다). `last_seq`와 보낸 사람이 실제와 같이 기록된다

## 참고 (2026-11-08 확인)
- `ChatParticipant.lastReadSeq`(not null, 기본 0)와 테스트용 `markRead(seq)`는 #47에서 이미 있다. 이 이슈에서 컬럼을 더하지 않는다
- `ChatMessage.sender`는 `ChatParticipant`다. 내 메시지 제외는 회원 id가 아니라 참여자 id로 비교한다
- 프론트 채팅 문서([chats.md](../../frontend/chat/chats.md), [chat-room.md](../../frontend/chat/chat-room.md))는 안 읽은 수와 읽음 표시를 범위 밖으로 두었다. #54에서 화면을 정할 때 이 API를 쓴다
