# 채팅함 최근 메시지 미리보기 길이 (#170)

채팅함 조회(`GET /api/v1/chats`)의 `lastMessage`를 앞 100자로 줄인다. 채팅함은 내 방을 페이지 없이 모두 주므로, 메시지 최대 길이가 10,000자가 된 뒤(#111) 방 100개가 모두 긴 메시지로 끝나면 응답이 약 3MB가 된다. 카드는 최근 메시지를 한 줄만 보여 준다. 채팅함 전체 계획은 [inbox.md](inbox.md), 메시지 길이는 [message-length.md](message-length.md)에 있다.

## 한눈에
- 끝나면: 채팅함의 `lastMessage`가 최대 100자가 되어, 방 100개가 모두 10,000자 한글로 끝나도 최근 메시지 합계가 약 3MB에서 약 30KB로 준다. 응답 모양과 프론트 코드는 그대로이고, 메시지 조회는 전체 내용을 그대로 준다
- 결정 필요: 없음
- 규모: 3단계(테스트 1, 구현 1, 문서 1), 약 30분

## 1. 채팅함은 앞 100자만 준다 (#170-R1)
채팅함의 `lastMessage`는 메시지의 앞 100자이고, 100자 이하면 그대로다. 글자 수는 PostgreSQL의 문자 단위(UTF-8 코드 포인트)로 세며, 이모지 같은 서로게이트 쌍이 반쪽만 남지 않는다.

#111-S3 경계: 긴 메시지로 끝난 방 [테스트] (고침 #170: 채팅함 응답 크기를 줄이려고 앞 100자만 준다)
- Given #48-S1의 R1에서 B가 "가"를 10,000번 이어 쓴 메시지를 마지막으로 보냈다
- When  B가 `GET /api/v1/chats`를 부른다
- Then  HTTP 200이고 R1이 맨 위에 있다
- Then  R1의 `lastMessage`는 "가" 100자다

#170-S1 경계: 100자와 101자 [테스트]
- Given 방 R1의 마지막 메시지가 "가" 100자다
- Given 방 R2의 마지막 메시지가 "나" 100자 뒤에 "끝"을 붙인 101자다
- When  B가 채팅함을 부른다
- Then  R1의 `lastMessage`는 "가" 100자 그대로다
- Then  R2의 `lastMessage`는 "나" 100자이고 "끝"이 없다

#170-S2 경계: 이모지가 경계에 걸린다 [테스트]
- Given 방 R1의 마지막 메시지가 "가" 99자 뒤에 "😀" 두 개를 붙인 것이다
- Given 방 R2의 마지막 메시지가 "😀" 5,000개다
- When  B가 채팅함을 부른다
- Then  R1의 `lastMessage`는 "가" 99자 뒤에 "😀" 한 개다(UTF-16 101단위)
- Then  R2의 `lastMessage`는 "😀" 100개다(UTF-16 200단위)

#170-S3 경계: 메시지가 없는 방 [테스트: ChatInboxControllerTest #48-S4]
- Given 막 열려 메시지가 없는 방
- Then  `lastMessage`는 null이다

## 2. 메시지 조회는 전체 내용 (#170-R2)
메시지 조회(`GET /api/v1/chats/{roomKey}/messages`)는 자르지 않고 전체 내용을 준다.

#170-S4 정상 [테스트: ChatControllerTest #111-S1]
- Given 방의 마지막 메시지가 정확히 10,000자다
- When  `GET /api/v1/chats/{roomKey}/messages`를 부른다
- Then  마지막 메시지의 `text`가 보낸 10,000자와 같다

## 3. 카드 표시 (#170-R3)
서버가 잘랐는지 응답에 따로 알리지 않고, 말줄임표는 지금처럼 카드 CSS(`-webkit-line-clamp: 1`)가 그린다. 프론트 코드는 바꾸지 않는다.

#170-S5 정상 [직접]
- Given 방 R1의 마지막 메시지가 "가" 300자다
- Given 방 R2의 마지막 메시지가 공백을 포함한 영문 문장 150자다
- When  채팅함 화면(`/my/chats`)을 가장 넓은 화면(내용 폭 48rem)으로 연다
- Then  R1과 R2의 카드 미리보기가 한 줄이고 끝에 말줄임표가 있다

## 범위 밖
- 채팅함 페이지 나누기: [inbox.md](inbox.md)의 범위 밖 그대로, 필요해지면 프론트 기획과 함께 별도 이슈로 한다
- 채팅함 검색: `q`는 대화방 이름·프로젝트명·상대 닉네임만 찾아서 잘라도 결과가 바뀌지 않는다
- 시연 데이터(`frontend/demo/chat.ts`): 실제 API를 쓰지 않는 목업이라 그대로 둔다
- 합성 이모지(가족 이모지, 국기 등)의 경계 처리: 코드 포인트 사이에서 잘리면 끝에 구성 요소 일부가 다른 이모지로 보일 수 있으나, 깨진 글자는 생기지 않고 카드 한 줄 밖이라 보이지 않는다

## 작업 순서
1. 실패하는 테스트 — #111-S3(고침), #170-S1, #170-S2
   - 파일: `backend/src/test/java/com/testmoa/backend/controller/ChatInboxControllerTest.java`. 기존 `longLastMessage`의 `@DisplayName`을 `#111-S3 10,000자 메시지로 끝난 방이 맨 위에 표시되고 최근 메시지는 앞 100자`로, 기대값을 `"가".repeat(100)`으로 고친다. `@DisplayName("#170-S1 …")`, `@DisplayName("#170-S2 …")`를 더한다. 두 방의 순서는 `messageTime(room, …)`으로 고정한다
   - 확인: `./gradlew test --tests '*ChatInboxControllerTest'`가 #111-S3, #170-S1, #170-S2에서만 실패한다
2. 쿼리에서 자르기 — #111-S3(고침), #170-S1, #170-S2, #170-S3, #170-S4
   - 파일: `backend/src/main/java/com/testmoa/backend/repository/ChatParticipantRepository.java`. `findInboxByUserId`의 `message.content`를 `substring(message.content, 1, 100)`으로 바꾼다. 위에 주석 한 줄을 단다: "채팅함 카드는 한 줄만 보여 주므로 최근 메시지는 앞 100자만 읽는다(#170). PostgreSQL은 코드 포인트로 세어 서로게이트 쌍이 갈리지 않는다"
   - 확인: `./gradlew test --tests '*ChatInboxControllerTest' --tests '*ChatControllerTest'`. 전체 테스트는 CI에 맡긴다
3. 문서 — 끝에 `(고침 #170: 채팅함 응답 크기를 줄이려고 앞 100자만 준다)`를 붙인다
   - `message-length.md`: 한눈에의 "채팅함은 10,000자 메시지도 최근 메시지 전체로 돌려준다", #111-R3, #111-S3(이 문서의 #111-S3와 같게)
   - `inbox.md`: 가정의 "`lastMessage`는 메시지 전체 내용(최대 10,000자)이다. 한두 줄로 자르는 것은 프론트 카드가 한다"를 "앞 100자이고, 한 줄로 줄이는 것과 말줄임은 프론트 카드가 한다"로 고친다
   - `README.md`: 이슈 표에 #170과 이 문서를 더하고, 정한 것에 "채팅함 `lastMessage`는 앞 100자, 메시지 조회는 전체 내용 (#170, 날짜)"을 더한다
   - 확인: #170-S5를 PR을 올리기 전에 화면에서 한다

## 가정
- 길이는 100자다(11-09 팀 확인, #111-R3의 "전체 내용"을 바꾼다). 카드 폭은 최대 48rem(768px)이고, 가장 넓은 화면에서 한 줄에 한글 약 54자(화면 캡처 기준), 영문 약 80자(추정)가 들어간다. 서버가 잘림을 알리지 않으므로 길이가 한 줄보다 길어야 CSS 말줄임표가 나온다. 200자는 카드가 두 줄 이상으로 늘 때만 필요하다
- SQL에서 자른다. 서비스에서 자르면 DB가 앱으로 전체 내용을 계속 보낸다. SQL에서 자르면 바뀌는 코드가 쿼리 한 줄이고, 서로게이트 쌍 처리 코드도 필요 없다
- 100은 쿼리에만 쓰고 상수를 따로 만들지 않는다. 쓰는 곳이 한 곳이고 프론트가 이 값을 몰라도 된다
- 잘렸는지 알리는 필드(`truncated`)와 서버 말줄임표는 두지 않는다. 카드 CSS가 말줄임을 그리고, 전체 내용이 필요한 화면은 메시지 조회를 쓴다
- 앞 100자 대부분이 공백·줄바꿈이면 미리보기가 짧거나 빈 줄로 보이고, `.`·`i`처럼 좁은 글자만 100자면 말줄임표가 빠질 수 있다. 일부러 만들어야 나오는 입력이고 메시지를 열면 전체 내용이 보이므로 처리하지 않는다

## 참고 (2026-11-09 확인)
- PostgreSQL 17 문서: `substring`은 "starting at the start'th character … stopping after count characters", `varchar(n)`은 "n characters (not bytes)"다. UTF8에서 `ascii`는 "the Unicode code point of the character"를 돌려준다. 운영·로컬·CI 모두 `postgres:17`이다
- Hibernate 7.4 `PostgreSQLDialect`는 JPQL `substring`을 `substr`로 내보낸다(7.4.5 jar 확인). PostgreSQL의 `substr`은 `substring`과 같다
- 채팅 테스트는 `@AutoConfigureTestDatabase(replace = NONE)`이고 CI는 `postgres:17`에서 돌아서, H2가 아닌 실제 PostgreSQL 동작을 확인한다
- `lastMessage`를 읽는 곳은 프론트 `ChatCard` 미리보기뿐이다. 채팅함 실시간 갱신은 SSE 이벤트를 받아 `router.refresh()`로 다시 조회하므로 잘린 값과 SSE 내용이 섞이지 않는다
