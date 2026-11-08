# 대화방 이름 변경·삭제 (#50)

참여자가 대화방 이름을 바꾸고 내 채팅함에서 방을 지우는 API. 채팅 전체에서 정한 것과 데이터 구조는 [README.md](README.md)에 있고, 방 정보·채팅함 응답은 [messages.md](messages.md)(#49)와 [inbox.md](inbox.md)(#48)의 모양을 그대로 쓴다.

## 한눈에
- 끝나면: 참여자가 `PATCH /api/v1/chats/{roomKey}`에 `{"name": "…"}`를 보내면 내 채팅함과 방 정보의 `roomName`만 바뀌고, `DELETE /api/v1/chats/{roomKey}`를 부르면 내 채팅함에서만 방이 빠진다. 상대 쪽은 그대로다. 참여자 컬럼 `custom_name`은 `custom_room_name`으로 바뀐다
- 결정 필요: 없음
- 규모: 5단계(구현 4, 문서 1)

## 1. 이름 변경 (#50-R1)
참여자가 대화방 이름을 바꾸면 내 채팅함과 방 정보에 바꾼 이름이 나오고, 상대에게는 원래대로 나온다.

#50-S1 정상 [테스트]
- Given 개발자 A("모아개발")의 프로젝트 "북로그" 모집 건에 테스터 B("모아테스터")가 선정되어 방 R이 열려 있다
- When  B가 `PATCH /api/v1/chats/{R}`에 `{"name": "북로그 1차"}`를 보낸다
- Then  HTTP 200이고 `data`는 #49 방 정보 모양이며 `roomName`은 "북로그 1차", `projectName`은 "북로그"다
- Then  B가 방 정보와 채팅함을 부르면 R의 `roomName`은 "북로그 1차"다
- Then  A가 방 정보와 채팅함을 부르면 R의 `roomName`은 null이다

#50-S2 정상: 다시 바꾸기와 앞뒤 공백 [테스트]
- Given #50-S1에서 B가 "북로그 1차"로 바꿨다
- When  B가 `{"name": "  결제 문의  "}`를 보낸다
- Then  HTTP 200이고 `roomName`은 앞뒤 공백을 뺀 "결제 문의"다
- Then  DB의 `custom_room_name`도 "결제 문의"다

#50-S3 정상: 다른 컬럼은 그대로 [테스트]
- Given B의 `last_read_seq`가 5다
- When  B가 이름을 "북로그 1차"로 바꾼다
- Then  B의 `last_read_seq`는 5, `hidden`은 false 그대로다

## 2. 이름 검증 (#50-R2)
앞뒤 공백을 뺀 이름이 비었거나 30자(`ChatParticipant.ROOM_NAME_MAX`, 프론트 `CHAT_ROOM_NAME_MAX`와 같음)를 넘으면 거절하고 이름을 바꾸지 않는다.

#50-S4 실패: 빈 이름 [테스트]
- Given B의 R 이름이 "북로그 1차"다
- When  B가 `{"name": ""}`, `{"name": "   "}`, `{}`를 보낸다
- Then  모두 HTTP 400, `error.code` "INVALID_INPUT", `error.fields.name` "대화방 이름을 입력해 주세요"다
- Then  B의 `roomName`은 "북로그 1차" 그대로다

#50-S5 경계: 길이 [테스트]
- When  B가 "가"를 30번 이어 쓴 이름을 보낸다
- Then  HTTP 200이고 `roomName`은 그 30자다
- When  "가" 30번 앞뒤에 공백을 두 칸씩 붙인 34자 이름을 보낸다
- Then  HTTP 200이고 `roomName`은 공백을 뺀 30자다
- When  "가"를 31번 이어 쓴 이름을 보낸다
- Then  HTTP 400, `error.code` "INVALID_INPUT", `error.fields.name` "대화방 이름은 30자까지 쓸 수 있어요"다
- Then  `roomName`은 앞의 30자 그대로다

## 3. 삭제 (#50-R3)
참여자가 대화방을 삭제하면 내 채팅함과 방 정보에서 빠지고, 상대 채팅함에는 그대로 남는다.

#50-S6 정상 [테스트]
- Given #50-S1의 방 R과, B가 테스터로 들어간 다른 방 R2가 있다
- When  B가 `DELETE /api/v1/chats/{R}`를 부른다
- Then  HTTP 200이고 응답은 `{"success": true, "data": null}`이다
- Then  B의 채팅함에는 R2만 있고 `total`은 1이다
- Then  B가 R의 방 정보·메시지 조회·보내기를 부르면 모두 HTTP 404다(#49-S15)
- Then  A의 채팅함에는 R이 그대로 있다

#50-S7 정상: 다시 나타나면 이름과 읽은 순번이 그대로 [테스트]
- Given B가 R 이름을 "북로그 1차"로 바꿨고 `last_read_seq`가 3이다
- When  B가 R을 삭제한다
- When  A가 R에 "다시 확인 부탁드려요"를 보낸다
- Then  B의 채팅함에 R이 다시 있고 `roomName`은 "북로그 1차"다
- Then  B의 `last_read_seq`는 3 그대로다

## 4. 들어갈 수 없는 방 (#50-R4)
참여자가 아닌 회원·운영자·비로그인은 이름을 바꾸거나 삭제할 수 없다. 없는 방, 내가 삭제한 방도 같다. 응답은 #49-R5와 같다.

#50-S8 실패: 비로그인 [테스트]
- When  토큰 없이 이름 변경과 삭제를 부른다
- Then  둘 다 HTTP 401, `error.code` "UNAUTHORIZED"다

#50-S9 실패: 참여자가 아닌 회원·운영자·없는 방 [테스트]
- Given #50-S1의 방 R이 있고, 그 방과 관계없는 회원 C와 운영자 D가 있다
- When  C와 D가 R의 이름 변경(`{"name": "남의 방"}`)과 삭제를 부르고, B가 없는 roomKey "aaaaaaaaaaaaaaaaaaaaaa"로 둘을 부른다
- Then  모두 HTTP 404이고 응답 본문이 #49-S14와 같다
- Then  A와 B의 `custom_room_name`은 null, `hidden`은 false 그대로다

#50-S10 실패: 내가 삭제한 방 [테스트]
- Given B가 R을 삭제했다
- When  B가 R의 이름 변경과 삭제를 다시 부른다
- Then  둘 다 #50-S9와 같은 HTTP 404다
- Then  B의 `custom_room_name`은 그대로, `hidden`은 true 그대로다

## 5. 컬럼 이름 바꾸기 (#50-R5)
참여자의 바꾼 대화방 이름 컬럼은 `custom_room_name`, 엔티티 필드는 `customRoomName`이다(README의 11-06 결정).

#50-S11 정상 [테스트]
- Given 엔티티를 바꾼 뒤 테스트 DB에 스키마를 만든다
- When  B의 이름을 "북로그 1차"로 바꾼다
- Then  `chat_participants`에 `custom_room_name` 컬럼(최대 30자)이 있고 값이 "북로그 1차"다
- Then  `custom_name` 컬럼은 없다

## 범위 밖
- 바꾼 이름을 지워 프로젝트명으로 되돌리기: 이슈가 빈 이름을 거절으로 정했고, 프론트에도 되돌리는 동작이 없다
- 삭제한 방을 내가 되살리기, 상대에게 이름 변경 알리기: 프론트 [chats.md](../../frontend/chat/chats.md)의 범위 밖과 같다
- 삭제하면서 읽음 처리하기: #52
- 실시간 알림(이름 변경·삭제를 다른 탭에 알리기): #51
- 프론트 연결(`frontend/features/chat/api.ts`의 `renameChatRoom`·`deleteChatRoom`): #54
- 테스트 서버 DB에 남는 옛 `custom_name` 컬럼 지우기: README "아직 정하지 않은 것"의 스키마 관리 방식에서 함께 정한다

## 작업 순서
1. 컬럼 이름 바꾸기 — #50-S11
   - 파일: `entity/ChatParticipant.java`(`customName` → `customRoomName`, `rename` 매개변수 이름), `repository/ChatParticipantRepository.java`(두 조회의 `me.customName`), 이를 쓰는 기존 테스트
   - 확인: `./gradlew test --tests '*Chat*'`(기존 #47~#49·#111 테스트가 그대로 통과)
2. 이름 변경 — #50-S1~S5
   - 파일: `dto/request/ChatRoomRenameRequest.java`(새로), `repository/ChatParticipantRepository.java`(`renameRoom`), `service/ChatService.java`, `service/impl/ChatServiceImpl.java`, `controller/ChatController.java`(`@PatchMapping("/{roomKey}")`), `controller/ChatRoomControllerTest.java`(새로)
   - 확인: `./gradlew test --tests '*ChatRoomControllerTest'`
3. 삭제 — #50-S6, S7
   - 파일: `repository/ChatParticipantRepository.java`(`hideRoom`), 서비스, 컨트롤러(`@DeleteMapping("/{roomKey}")`), `ChatRoomControllerTest.java`
   - 확인: 같은 명령
4. 들어갈 수 없는 방 — #50-S8~S10
   - 파일: `ChatRoomControllerTest.java`
   - 확인: 같은 명령, 마지막에 `./gradlew test --tests '*Chat*'`
5. 문서 — README의 데이터 구조 표의 `custom_room_name`, "아직 정하지 않은 것"의 동시 갱신 항목을 고친다

## 가정
- 주소는 #49에서 정한 대로 `PATCH /api/v1/chats/{roomKey}`(본문 `{"name": "…"}`), `DELETE /api/v1/chats/{roomKey}`다. 본문의 칸 이름은 프론트 `renameChatRoom(roomKey, name)`에 맞춰 `name`이다
- 이름 변경 응답은 #49 방 정보(`ChatRoomResponse`)다. 프론트가 바꾼 뒤 머리와 문서 제목을 다시 그릴 때 따로 조회하지 않아도 된다. 삭제 응답은 `ApiResponse.ok()`(`data` null)다. 지운 방은 더 보여 줄 것이 없다
- 이름은 메시지(#49: 받은 그대로 저장)와 달리 서버가 앞뒤 공백을 빼고 저장한다. 이슈가 "앞뒤 공백을 뺀 이름"으로 검증을 정했고, 한 줄 이름이라 앞뒤 공백을 지켜야 할 이유가 없다. 요청 레코드의 compact 생성자에서 공백을 뺀 뒤 `@NotBlank`·`@Size(max = 30)`가 그 값을 검사한다. 가운데 공백과 줄바꿈은 바꾸지 않는다(프론트 입력창이 한 줄이라 줄바꿈이 들어오지 않는다)
- 길이는 #49와 같이 UTF-16 코드 단위로 센다. 프론트 `slice`와 같은 단위다
- 프로젝트명과 같은 이름도 그대로 저장한다(null로 바꾸지 않는다). 보이는 결과는 같다
- 프론트는 #54 전까지 30자를 넘으면 잘라서 보내고 빈 이름은 보내지 않는다. 서버는 자르지 않고 400으로 거절한다(#49의 메시지 길이와 같은 이유)
- 참여자 행은 엔티티를 고쳐 저장하지 않고 바꿀 컬럼만 고치는 update 쿼리로 바꾼다. 이름 변경은 `update chat_participants set custom_room_name = ? where id = ? and hidden = false`, 삭제는 `update … set hidden = true where id = ? and hidden = false`다. 같은 행을 상대의 보내기(`hidden` 해제)나 읽음 처리(#52)가 같은 순간 고쳐도 서로 덮지 않는다. README "아직 정하지 않은 것"의 동시 갱신 가운데 #50 쪽은 이것으로 닫는다. 엔티티의 `rename`·`hide`는 테스트에서 상태를 만드는 데 계속 쓴다
- 참여자는 #49의 `findByRoomRoomKeyAndUserIdAndHiddenFalse`로 먼저 찾는다. 없으면 404다. 찾은 뒤 update가 0행이면(그 사이 같은 회원이 다른 탭에서 삭제) 역시 404다
- 이미 삭제한 방을 다시 삭제하면 404다. #49에서 "내가 삭제한 방은 없는 방과 같다"로 정했고, 프론트는 삭제한 뒤 목록을 다시 그리거나 채팅함으로 보내 같은 요청을 다시 보내지 않는다
- 삭제는 이름과 `last_read_seq`를 지우지 않는다. 상대가 보내 다시 나타나면 그대로 이어진다(#49-S9와 같다)
- `ddl-auto: update`는 컬럼 이름을 바꾸지 않는다. 테스트 서버에 `chat_participants`가 이미 있으면 `custom_room_name`이 새로 생기고 옛 `custom_name`은 남는다. 옛 컬럼은 null을 허용하고 이름 변경 API가 없어 값도 모두 null이라, 남아도 저장과 조회에 영향이 없다

## 참고 (2026-11-07 확인)
- `ChatParticipant`에는 `customName`(길이 `ROOM_NAME_MAX` = 30), `hidden`, `lastReadSeq`와 `rename`·`hide`·`unhide`·`markRead`가 있다. `ChatRoomEntry`·`ChatInboxEntry` 조회가 `me.customName`을 쓴다
- 프론트 `renameChatRoom`은 앞뒤 공백을 빼고 `CHAT_ROOM_NAME_MAX`(30)까지 자르며 빈 이름은 무시한다. `deleteChatRoomAction`은 채팅방 안에서 지우면 채팅함으로 보낸다
