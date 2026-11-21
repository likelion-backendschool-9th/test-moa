# 채팅방 메시지 검색 API (#105)

참여자가 한 채팅방의 메시지 내용을 검색해, 찾은 메시지의 순번을 받는 API다. 채팅 전체에서 정한 것은 [README.md](README.md)에 있다. 메시지 조회(`before=`)는 [messages.md](messages.md)(#49), 화면은 [chat-search.md](../../frontend/chat/chat-search.md)에 있다.

## 한눈에
- 끝나면: 참여자가 `GET /api/v1/chats/{roomKey}/messages/search?q=사진`을 부르면, 내용에 "사진"이 들어간 메시지의 순번이 최신 메시지부터 최대 100개 돌아온다. 대소문자를 가리지 않고, `%`·`_`도 글자 그대로 찾는다. 참여자가 아니거나 방을 지운 회원은 방 조회(#49)와 같은 404를 받는다
- 결정 필요: 없음
- 규모: 3단계

## 1. 검색 (#105-R1)
참여자가 검색어를 보내면, 그 방에서 내용에 검색어가 들어간 메시지의 순번을 최신 메시지부터 최대 100개 받는다. 100개가 넘으면 더 있다는 것(`hasMore`)도 함께 받는다.

#105-S1 정상 [테스트]
- Given 테스터 B와 개발자 A의 방 R에 순번 1 "사진 올렸어요", 2 "확인했어요", 3 "사진 순서가 바뀌어요", 4 "Photo 앱에서 찍은 사진이에요"가 있다
- When  B가 `GET /api/v1/chats/{R}/messages/search?q=사진`을 부른다
- Then  HTTP 200이고 `data`는 `{"seqs": [4, 3, 1], "hasMore": false}`다
- When  A가 `q=photo`로 부른다
- Then  `seqs`는 `[4]`다 (대소문자를 가리지 않는다)
- When  B가 `q=없는말`로 부른다
- Then  HTTP 200이고 `seqs`는 빈 배열, `hasMore`는 false다

#105-S2 정상: 검색어 앞뒤 공백과 다른 방 [테스트]
- Given #105-S1의 방 R과, B가 들어간 다른 방 R2에 "사진 다시 보내요"가 있다
- When  B가 R에 `q=%20사진%20`(앞뒤 공백)으로 부른다
- Then  `seqs`는 `[4, 3, 1]`이고, R2의 메시지는 들어가지 않는다

#105-S3 경계: LIKE 특수 문자 [테스트]
- Given 방에 순번 1 "진행률 50% 넘었어요", 2 "진행률 500 넘었어요", 3 "file_name 확인", 4 "filexname 확인"이 있다
- When  `q=50%`로 부른다
- Then  `seqs`는 `[1]`이다
- When  `q=file_`로 부른다
- Then  `seqs`는 `[3]`이다

#105-S4 경계: 100개가 넘는 결과 [테스트]
- Given 방에 "버그"가 들어간 메시지 101개(순번 1~101)가 있다
- When  `q=버그`로 부른다
- Then  `seqs`는 순번 101부터 2까지 100개이고 `hasMore`는 true다

## 2. 검색어 검증 (#105-R2)
받은 검색어가 100자를 넘거나, 앞뒤 공백을 빼면 비면 400으로 거절한다. 길이는 공백을 빼기 전의 길이다. 화면의 입력창 `maxLength` 100과 같은 기준이다.

#105-S5 실패: 빈 검색어와 긴 검색어 [테스트]
- When  B가 `q` 없이, `q=`, `q=%20%20`, 101자 검색어, 앞에 공백 하나를 붙인 100자 검색어(모두 101자)로 부른다
- Then  모두 HTTP 400, `error.code` "INVALID_INPUT"이다
- When  100자 검색어로 부른다
- Then  HTTP 200이다

## 3. 들어갈 수 없는 방 (#105-R3)
메시지 조회(#49-R5)와 같이 비로그인은 401, 참여자가 아니거나 방을 지운 회원·운영자·없는 roomKey는 모두 같은 404로 거절한다.

#105-S6 실패 [테스트]
- When  토큰 없이 `q=사진`으로 부른다
- Then  HTTP 401, `error.code` "UNAUTHORIZED"다
- When  방과 관계없는 회원 C, 운영자 D가 부르고, B가 없는 roomKey "aaaaaaaaaaaaaaaaaaaaaa"로 부르고, 방을 삭제한 B가 부른다
- Then  모두 HTTP 404이고 본문은 #49-S14와 같다

## 범위 밖
- 화면(검색창, 결과로 이동, 강조): [chat-search.md](../../frontend/chat/chat-search.md)
- 모든 채팅방에 걸친 통합 검색: 기획이 정하지 않았다
- PostgreSQL 전문 검색(`pg_trgm` 등)과 검색용 인덱스: 검색 범위가 한 방이라 `(room_id, seq)` 인덱스로 방을 고른 뒤 그 방 메시지만 훑는다. 한 방의 메시지가 수만 개로 늘면 그때 정한다
- 결과 100개 뒤의 결과 받기(페이지 나누기): 화면은 "100+"로 알린다

## 작업 순서
1. 검색의 가장 얇은 경로 — #105-S1, #105-S6
   - 파일: `controller/ChatController.java`(`GET /{roomKey}/messages/search`, `@RequestParam @NotBlank @Size(max = 100) String q`. `@Size`는 공백을 빼기 전 길이를 본다), `service/ChatService.java`·`service/impl/ChatServiceImpl.java`(`searchMessages(roomKey, userId, q)`: `requireParticipant`로 참여자를 찾고, 검색어를 `strip()`한 뒤 채팅함 검색처럼 `toLowerCase(Locale.ROOT)`로 바꿔 찾는다), `repository/ChatMessageRepository.java`, `dto/response/ChatMessageSearchResponse.java`(`seqs`, `hasMore`), 테스트 `controller/ChatSearchControllerTest.java`
   - 쿼리: 이름으로 만드는 쿼리는 `lower(...) like ... escape`를 쓸 수 없어 `@Query`로 쓴다. `@Query("select m.seq from chat_messages m where m.room = :room and lower(m.content) like :pattern escape '\\' order by m.seq desc") List<Long> findSeqsByContent(ChatRoom room, String pattern, Limit limit)`. 엔티티 이름은 지금 쿼리들처럼 `chat_messages`다(#272에서 바뀌면 그때 같이 바꾼다)
   - 확인: `./gradlew test --tests '*ChatSearchControllerTest'`
2. 공백·특수 문자·개수 — #105-S2, #105-S3, #105-S4
   - 파일: `global/util/LikePattern.java`(새로. `contains(keyword)`가 `\`·`%`·`_`를 이스케이프해 `%…%`를 만든다), `repository/RecruitmentSearchRepositoryImpl.java`(`private static escapeLike`를 지우고 `LikePattern.contains`를 쓴다. 동작은 같다), `ChatServiceImpl.java`(`Limit.of(101)`로 받아 100개만 주고, 101개면 `hasMore` true), 같은 테스트
   - 확인: 같은 명령, `./gradlew test --tests '*RecruitmentListControllerTest'`(모집 검색이 그대로인지)
3. 검증과 문서 — #105-S5
   - 파일: 같은 테스트, `docs/backend/chat/README.md`(정한 것에 검색 방식: 주소, 부분 일치, 최신순 100개)
   - 확인: 같은 명령, `git diff --check`

## 가정
- 주소는 메시지 조회 아래인 `GET /api/v1/chats/{roomKey}/messages/search`다. 새 컨트롤러를 만들지 않고 `ChatController`에 더한다. 채팅은 테스터·개발자가 함께 쓰는 기능이라 응답 DTO는 `dto/response`에 평평하게 둔다
- 응답은 순번만 준다(`{seqs, hasMore}`). 화면은 순번으로 메시지 조회(`before=`)를 이어 불러 그 자리로 이동하고, 내용은 이미 받은 메시지에서 쓴다. 내용·보낸 사람을 다시 주지 않아 응답이 작다
- 찾는 방법은 `lower(content) like :pattern escape '\'`(부분 일치)다. 모집 검색과 같은 방식이고, 한국어는 대소문자가 없어 영향이 없다
- 검색어는 앞뒤 공백만 빼고 가운데 공백은 그대로 찾는다. "사진 순서"는 그 글자 그대로 이어진 메시지만 찾는다
- 결과 수 100개는 서비스의 상수 하나(`SEARCH_RESULT_LIMIT`)로 둔다. 전체 개수는 세지 않는다
- 채팅 정지(`Restriction.CHAT`, #86)는 채팅 걸기와 보내기만 막는다. 검색은 메시지 조회처럼 읽기라서 막지 않는다
- 읽기 전용 방(모집·구독이 끝난 방)도 메시지를 볼 수 있으므로 검색할 수 있다
- 검색은 읽음(`last_read_seq`)을 바꾸지 않는다

## 참고 (2026-11-21 확인)
- 메시지 조회는 30개씩이고(`MESSAGE_SLICE_SIZE`), `before`·`after`를 함께 주면 400이다(`ChatServiceImpl.getMessages`)
- `GlobalExceptionHandler`는 `ResponseEntityExceptionHandler`를 상속해, 빠진 요청 파라미터와 검증 실패를 400 `INVALID_INPUT`으로 돌려준다(#49-S6)
- `chat_messages`에는 `(room_id, seq)` unique 인덱스가 있다([README.md](README.md) 데이터 구조)
