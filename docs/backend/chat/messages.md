# 채팅 메시지 조회·보내기 (#49)

채팅방 정보와 메시지를 읽고, 메시지를 보내는 API. 채팅 전체에서 정한 것과 데이터 구조는 [README.md](README.md)에 있다.

## 한눈에
- 끝나면: 참여자가 `GET /api/v1/chats/{roomKey}`로 방 정보(대화방 이름, 프로젝트, 상대, 모집 건)를, `GET /api/v1/chats/{roomKey}/messages`로 최근 메시지 30개를, 같은 주소에 `?before={seq}`를 붙여 그보다 오래된 메시지 30개씩을 받는다. `POST /api/v1/chats/{roomKey}/messages`로 보낸 메시지가 저장되고 순번·보낸 시각과 함께 돌아온다. 같은 방에 동시에 보내도 순번이 빠지거나 겹치지 않는다
- 결정 필요: 없음
- 규모: 6단계(구현 5, 문서 1)

## 1. 방 정보 (#49-R1)
참여자는 roomKey로 대화방 이름, 프로젝트, 대화 상대, 모집 건, 나의 역할을 받는다. 메시지는 주지 않는다(11-05 사용자 결정: 방 정보와 메시지 조회를 나눈다).

#49-S1 정상: 테스터가 본 방 [테스트]
- Given 개발자 A("모아개발")의 프로젝트 "북로그"(이미지 `https://img.test/booklog.png`)에 모집 건 M이 있고, 테스터 B("모아테스터")가 선정되어 방이 열려 있다
- When  B가 `GET /api/v1/chats/{roomKey}`를 부른다
- Then  HTTP 200이고 `data`는 roomKey, `recruitmentId` M의 id, `projectName` "북로그", `roomName` null, `projectImage` `https://img.test/booklog.png`, `myRole` "TESTER", `partner` {nickname "모아개발", role "DEVELOPER"}다

#49-S2 정상: 개발자가 본 방과 바꾼 이름 [테스트]
- Given #49-S1의 방에서 A가 대화방 이름을 "결제 테스트"로 바꿔 두었다
- When  A가 같은 방을 부른다
- Then  `roomName`은 "결제 테스트", `myRole`은 "DEVELOPER", `partner`는 {nickname "모아테스터", role "TESTER"}다
- When  B가 같은 방을 부른다
- Then  B의 `roomName`은 null 그대로다

## 2. 메시지 조회 (#49-R2)
참여자는 `before` 없이 부르면 최근 메시지를, `before={seq}`로 부르면 그 순번보다 작은 메시지를 최대 30개씩 오래된 것부터 받는다. 더 오래된 메시지가 남았는지(`hasMore`)도 함께 받는다.

#49-S3 정상: 최근 메시지와 보낸 사람 [테스트]
- Given #49-S1의 방에 B의 "안녕하세요"(순번 1), A의 "반갑습니다"(순번 2)가 있다
- When  B가 `GET /api/v1/chats/{roomKey}/messages`를 부른다
- Then  HTTP 200이고 `data.messages`는 순번 1 "안녕하세요"(`from` "me"), 순번 2 "반갑습니다"(`from` "partner") 순이고 각각 보낸 시각이 있다
- Then  `data.hasMore`는 false다
- When  A가 같은 주소를 부른다
- Then  순번 1은 `from` "partner", 순번 2는 `from` "me"다

#49-S4 경계: 메시지가 없는 방과 30개보다 많은 방 [테스트]
- Given 방이 막 열려 메시지가 없다
- When  B가 `before` 없이 메시지를 부른다
- Then  HTTP 200이고 `messages`는 빈 배열, `hasMore`는 false다
- Given 메시지 31개(순번 1~31)를 더한다
- When  B가 `before` 없이 메시지를 부른다
- Then  `messages`는 순번 2~31의 30개이고 오래된 것부터다
- Then  `hasMore`는 true다

#49-S5 정상: 이전 메시지 더 받기 [테스트]
- Given 방에 메시지 65개(순번 1~65)가 있다
- When  B가 `GET /api/v1/chats/{roomKey}/messages?before=36`을 부른다
- Then  HTTP 200이고 `messages`는 순번 6~35의 30개이고 오래된 것부터다
- Then  `hasMore`는 true다
- When  `before=6`으로 부른다
- Then  `messages`는 순번 1~5이고 `hasMore`는 false다

#49-S6 실패: 잘못된 커서 [테스트]
- Given #49-S5의 방이 있다
- When  `before=0`, `before=-1`, `before=abc`로 부른다
- Then  모두 HTTP 400, `error.code` "INVALID_INPUT"이다

## 3. 메시지 보내기 (#49-R3)
참여자가 보낸 메시지는 그 방의 다음 순번으로 저장되고, 저장된 메시지가 돌아온다. 한 트랜잭션에서 방의 마지막 순번·최근 메시지 일시를 바꾸고, 상대가 방을 삭제했으면 상대의 삭제를 푼다.

#49-S7 정상 [테스트]
- Given 순번 2까지 메시지가 있는 #49-S1의 방
- When  B가 `POST /api/v1/chats/{roomKey}/messages`에 `{"text": "로그인 화면에서\n멈춰요"}`를 보낸다
- Then  HTTP 200이고 `data`는 순번 3, `from` "me", `text` "로그인 화면에서\n멈춰요"(가운데 줄바꿈 그대로), 보낸 시각이다
- Then  A가 메시지를 조회하면 마지막 메시지가 순번 3 "로그인 화면에서\n멈춰요"(`from` "partner")다
- Then  방의 `last_seq`는 3이고 `last_message_at`은 순번 3의 보낸 시각과 같다

#49-S8 정상: 받은 내용 그대로 저장 [테스트]
- When  B가 `{"text": "  \n 확인했어요 \n "}`를 보낸다
- Then  HTTP 200이고 저장된 `text`는 앞뒤 공백·줄바꿈까지 `"  \n 확인했어요 \n "` 그대로다

#49-S9 정상: 상대가 삭제한 방에 보내면 상대에게 다시 나타난다 (README의 11-04 결정) [테스트]
- Given A가 방을 삭제했고(A의 `hidden` true), A가 대화방 이름을 "결제 테스트"로 바꿔 두었다
- When  B가 "다시 확인 부탁드려요"를 보낸다
- Then  A의 `hidden`은 false가 된다
- Then  A의 바꾼 이름 "결제 테스트"와 `last_read_seq`는 그대로다
- When  A가 방 정보와 메시지를 조회한다
- Then  둘 다 HTTP 200이고, 메시지의 마지막이 "다시 확인 부탁드려요"다

#49-S10 동시 전송: 순번이 빠지거나 겹치지 않는다 [테스트]
- Given 메시지가 없는 방
- When  A와 B가 스레드 두 개로 동시에 각각 10개씩 보낸다
- Then  20개 요청이 모두 성공한다
- Then  그 방의 메시지 순번은 1~20이 하나씩이다
- Then  방의 `last_seq`는 20이다

## 4. 메시지 검증 (#49-R4)
공백·줄바꿈만 있는 메시지와 500자(`CHAT_MESSAGE_MAX`)를 넘는 메시지는 저장하지 않는다. 길이는 받은 그대로(공백 포함) 센다.

#49-S11 실패: 빈 메시지 [테스트]
- When  B가 `{"text": ""}`, `{"text": "  \n  "}`, `{}`를 보낸다
- Then  모두 HTTP 400, `error.code` "INVALID_INPUT", `error.fields.text` "메시지를 입력해 주세요"다
- Then  방의 `last_seq`는 그대로다

#49-S12 경계: 길이 [테스트]
- When  B가 "가"를 500번 이어 쓴 메시지를 보낸다
- Then  HTTP 200이고 500자 그대로 저장된다
- When  "가"를 501번 이어 쓴 메시지를 보낸다
- Then  HTTP 400, `error.fields.text` "메시지는 500자까지 보낼 수 있어요"다
- When  "가" 498번 앞뒤에 공백을 한 칸씩 붙인 500자 메시지를 보낸다
- Then  HTTP 200이고 공백까지 500자 그대로 저장된다
- When  "가" 499번 앞뒤에 공백을 한 칸씩 붙인 501자 메시지를 보낸다
- Then  HTTP 400이다(공백을 빼면 499자지만 공백도 글자 수에 들어간다)

## 5. 들어갈 수 없는 방 (#49-R5)
비로그인 요청은 401로, 그 방의 참여자가 아니거나 방을 삭제한 회원, 운영자, 없는 roomKey는 모두 같은 404로 거절한다. 그래서 응답만으로는 방이 있는지 알 수 없다.

아래 시나리오의 "세 API"는 방 조회(`GET /api/v1/chats/{roomKey}`), 메시지 조회(`GET /api/v1/chats/{roomKey}/messages`), 보내기(`POST /api/v1/chats/{roomKey}/messages`, `{"text": "안녕하세요"}`)다.

#49-S13 실패: 비로그인 [테스트]
- When  토큰 없이 방 조회, 메시지 조회, 보내기를 부른다
- Then  셋 다 HTTP 401, `error.code` "UNAUTHORIZED"다

#49-S14 실패: 참여자가 아닌 회원·운영자·없는 방 [테스트]
- Given #49-S1의 방이 있고, 그 방과 관계없는 회원 C와 운영자 D가 있다
- When  C와 D가 그 방의 세 API를 부르고, B가 없는 roomKey "aaaaaaaaaaaaaaaaaaaaaa"로 세 API를 부른다
- Then  모두 HTTP 404이고 응답 본문이 `{"success": false, "data": null, "error": {"code": "NOT_FOUND", "message": "찾을 수 없어요"}}`로 같다
- Then  C·D·B가 보낸 메시지는 저장되지 않는다(방의 `last_seq` 그대로)

#49-S15 실패: 내가 삭제한 방 [테스트]
- Given B가 방을 삭제했다
- When  B가 그 방의 세 API를 부른다
- Then  모두 #49-S14와 같은 HTTP 404다
- Then  B의 보내기로는 삭제가 풀리지 않는다(B의 `hidden` true 그대로)

## 범위 밖
- 읽기 전용(모집·구독이 끝난 방)의 보내기 거절과 방 정보의 `readOnly`: #53(11-05 사용자 결정). README의 "모집이 끝나거나 구독이 끝난 방은 읽기 전용"에서 "모집이 끝났다"의 기준이 정해지지 않았다. `RecruitmentStatus.CLOSED`는 모집 마감이라 선정된 테스터가 테스트하며 개발자와 대화하는 기간과 겹쳐서, 그것으로 막으면 채팅이 필요한 때에 막힌다. #53에서 채팅을 거는 조건을 정할 때 끝나는 기준(`feedbackDeadline`, `CANCELLED` 등)과 구독 종료를 함께 정한다
- 읽음 처리, 안 읽은 수, 상대의 읽음 표시(`partnerLastReadSeq`): #52. 방을 불러도 `last_read_seq`는 바꾸지 않는다
- `after={seq}`로 새 메시지만 받기, 실시간 알림: #51
- 채팅함 목록(최근 메시지 미리보기 포함): #48
- 이름 변경·삭제 API: #50. 테스트에서는 엔티티의 `rename`, `hide`로 상태를 만든다
- 정지·탈퇴 회원의 조회·보내기 제한: 운영자 제재(#86)에서 회원 상태를 어디서 막을지 정할 때
- 프론트 연결(`frontend/src/features/chat/api.ts`): #54
- 배포 DB에 테이블 만들기: README의 "아직 정하지 않은 것". 그 전까지 로컬 테스트로만 확인한다

## 작업 순서
1. 방 조회의 가장 얇은 경로 — #49-S1, #49-S2, #49-S13
   - 파일: `controller/ChatController.java`, `service/ChatService.java`, `service/impl/ChatServiceImpl.java`, `domain/dto/response/ChatRoomResponse.java`, 테스트 `controller/ChatControllerTest.java`, `support/ChatFixtures.java`(`TestEntityManager` 대신 `EntityManager`도 받게)
   - 확인: `./gradlew test --tests '*ChatControllerTest'`
2. 메시지 조회 — #49-S3, #49-S4, #49-S5, #49-S6
   - 파일: `ChatController.java`(`before`는 생략 가능, 있으면 `@Min(1)`), `ChatMessageRepository`(`before`가 없으면 최근, 있으면 `seq < before`를 순번 내림차순으로 30개 받는 `Slice<ChatMessage>`. 31번째가 있는지로 `hasNext`를 정한다), `domain/dto/response/ChatMessageResponse.java`·`ChatMessageSliceResponse.java`, 같은 테스트
   - 확인: 같은 명령
3. 접근 거절(조회 두 API) — #49-S13·#49-S14·#49-S15의 조회 부분
   - 파일: `ChatServiceImpl.java`(참여자 찾기: roomKey와 내 회원 id로 숨기지 않은 참여자, 없으면 `NOT_FOUND`), 같은 테스트
   - 확인: 같은 명령
4. 보내기와 검증 — #49-S7, #49-S8, #49-S9, #49-S11, #49-S12, #49-S13~S15의 보내기 부분
   - 파일: `domain/dto/request/ChatMessageSendRequest.java`(`@NotBlank`·`@Size(max = 500)`), `ChatRoomRepository`(방 행 `PESSIMISTIC_WRITE` 잠금 조회), `ChatRoom.java`(`createMessage(sender, content)`로 순번·메시지 생성·최근 일시 갱신), `ChatParticipantRepository`(상대 삭제만 푸는 update 쿼리), 같은 테스트
   - 확인: 같은 명령
5. 동시 전송 — #49-S10
   - 파일: 테스트 `service/ChatSendConcurrencyTest.java`(트랜잭션 없는 `@SpringBootTest`, 끝나면 만든 행을 지운다)
   - 확인: `./gradlew test`
6. 문서 — README 이슈 표에 이 문서 링크, README의 프론트 문서 링크를 `docs/frontend/chat/`으로 고침, "아직 정하지 않은 것"의 동시 갱신 항목에 #49에서 정한 방법을 적음


## 가정
- 주소는 `/api/v1/chats/{roomKey}`(방 정보 GET), `/api/v1/chats/{roomKey}/messages`(메시지 GET, 보내기 POST)다. 채팅방 화면을 열면 Next 서버가 두 GET을 동시에 부른다. 방 조회는 프론트 `getChatRoomTitle`(문서 제목)에도 그대로 쓴다. #51의 `after={seq}`는 메시지 조회에 붙인다. 채팅함(#48)은 `GET /api/v1/chats`, 이름 변경·삭제(#50)는 `PATCH`·`DELETE /api/v1/chats/{roomKey}`로 이어 쓴다. 지금 있는 `/api/auth`, `/api/users`에는 `v1`이 없지만, 원래 붙어야 하는 것이라 나중에 따로 고친다(11-05 사용자 확인)
- 응답은 `ApiResponse`로 감싼다. 메시지 조회는 `{messages: [{seq, from: "me"|"partner", text, sentAt}], hasMore}`, 보내기는 메시지 하나, 방은 `{roomKey, recruitmentId, projectName, roomName, projectImage, myRole, partner: {nickname, role}}`이다. 이름은 프론트 `types.ts`에 맞췄고, `recruitmentSlug` 자리는 entities.md의 결정대로 `recruitmentId`다. 역할 값은 `ChatRole` 그대로 대문자이고, 프론트 소문자로 바꾸는 일은 #54에서 한다
- 한 번에 주는 메시지 수는 30개로 고정하고 서비스의 상수 하나(`MESSAGE_SLICE_SIZE`)로 둔다. 조회는 Spring Data `Slice`로 한다. `Slice`는 31개를 읽어 다음이 있는지(`hasNext`)만 판단하고 전체 개수는 세지 않는다. 응답 이름은 `ChatMessageSliceResponse`이고, 필드는 오래된 쪽이 더 있다는 뜻이 바로 보이게 `hasNext` 대신 `hasMore`로 둔다(11-05 사용자 결정)
- 일시는 기존 응답처럼 `LocalDateTime`(시간대 없음, 서버 시각)으로 내려간다
- 내가 삭제한 방은 프론트(`getChatRoom`: 삭제했으면 404)와 같이 열 수도 보낼 수도 없다. 다시 보이는 것은 상대가 보냈을 때뿐이다(README의 11-04 결정)
- 서버는 내용을 고치지 않고 받은 그대로 저장한다. 앞뒤 공백 제거는 프론트가 보내기 전에 이미 한다(11-05 사용자 확인). 빈 메시지 판단만 `@NotBlank`(공백·줄바꿈만 있으면 빈 것)로 한다. 글자 수는 공백을 포함해 프론트 `slice`와 같은 UTF-16 길이로 센다. 저장 컬럼도 500자라 받은 그대로의 길이로 막아야 한다
- 프론트는 500자를 넘으면 잘라서 보내지만, 서버는 자르지 않고 400으로 거절한다. 서버를 직접 부르는 잘못된 요청을 조용히 바꾸지 않기 위해서다
- 순번은 방 행을 `SELECT … FOR UPDATE`(`@Lock(PESSIMISTIC_WRITE)`)로 잠근 뒤 `last_seq + 1`로 받는다. 방 행은 보내기만 고치므로 전체 컬럼 update여도 덮어쓸 값이 없다
- 상대의 삭제 해제는 참여자 엔티티를 고치지 않고 `update chat_participants set hidden = false where room_id = ? and id <> 나 and hidden = true`로 `hidden`만 바꾼다. 상대가 같은 순간 이름을 바꾸거나(#50) 읽음 처리(#52)해도 그 컬럼을 예전 값으로 덮지 않는다. README "아직 정하지 않은 것"의 동시 갱신 문제 가운데 보내기 쪽은 이것으로 닫고, #50·#52 쪽은 그때 정한다
- 운영자는 참여자가 될 수 없어서(채팅은 모집 건의 개발자와 테스터 사이) 따로 막지 않아도 참여자가 아닌 회원과 같이 404가 된다

## 참고 (2026-11-05 확인)
- 프론트 `sendChatMessage`는 앞뒤 공백을 빼고 `CHAT_MESSAGE_MAX`(500)까지 자르고, 빈 메시지는 보내지 않는다. 백엔드 `ChatMessage.CONTENT_MAX`도 500이다
- 프론트 `getChatRoom`은 비로그인이면 로그인으로, 없거나 삭제했거나 내가 없는 방이면 404로 보낸다
- 인증: Next 서버가 `Authorization: Bearer`로 부르고, 컨트롤러는 `@AuthenticationPrincipal Long userId`로 회원 id를 받는다. 401·403·404는 `GlobalExceptionHandler`가 `ApiResponse.fail` 모양으로 바꾼다
- 토큰 인증에서도 `ACTIVE` 회원인지 확인한다. 정지·탈퇴 회원의 추가 정책은 #86 범위다
- 프론트 채팅 문서는 `docs/frontend/chat/chats.md`, `docs/frontend/chat/chat-room.md`에 있다
