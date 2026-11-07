# 채팅 메시지 최대 길이 10,000자 (#111)

메시지 한 개의 최대 길이를 500자에서 10,000자로 늘린다. 테스터가 버그 재현 순서·기대 동작·실제 동작을 한 메시지로 보낼 수 있게 하기 위해서다. 채팅 전체에서 정한 것은 [README.md](README.md)에, 보내기 검증의 원래 결정은 [messages.md](messages.md)의 #49-R4에 있다.

## 한눈에
- 끝나면: `POST /api/v1/chats/{roomKey}/messages`가 공백·줄바꿈을 포함해 10,000자까지 저장하고, 10,001자는 HTTP 400 "메시지는 10,000자까지 보낼 수 있어요"로 거절한다. 채팅함은 10,000자 메시지도 최근 메시지 전체로 돌려준다. 테스트 서버의 기존 `chat_messages.content` 컬럼은 배포 때 `ddl-auto: update`가 10,000자로 넓힌다. 프론트 입력 제한은 #54에서 올린다
- 결정 필요: 없음
- 규모: 5단계(백엔드 2, 로컬 DB 확인 1, 문서 1, 배포 확인 1)

## 1. 서버 저장 한도 (#111-R1)
서버는 공백·줄바꿈을 포함해 10,000자(UTF-16 코드 단위)까지 받은 그대로 저장하고 돌려준다. 저장 컬럼도 10,000자다.

#49-S12의 값을 500에서 10,000으로 바꾼다 (messages.md의 #49-S12에 `(고침 #111: 최대 길이 10,000자로 확대)`).

#49-S12 경계: 길이 [테스트] (고침 #111: 최대 길이 10,000자로 확대)
- When  B가 "가"를 10,000번 이어 쓴 메시지를 보낸다
- Then  HTTP 200이고 응답 `data.text`가 보낸 10,000자 그대로다
- When  "가" 9,998번 앞뒤에 공백을 한 칸씩 붙인 10,000자 메시지를 보낸다
- Then  HTTP 200이고 공백까지 10,000자 그대로다

#111-S1 정상: 줄바꿈이 섞인 긴 메시지를 다시 읽는다 [테스트]
- Given #49-S1의 방
- When  B가 "재현 순서\n1. 로그인\n2. 결제" 뒤에 "가"를 채워 정확히 10,000자로 만든 메시지를 보낸다
- Then  HTTP 200이다
- When  B가 `GET /api/v1/chats/{roomKey}/messages`를 부른다
- Then  마지막 메시지의 `text`가 보낸 10,000자와 같고 줄바꿈 두 개가 그대로 있다

## 2. 넘는 메시지 거절 (#111-R2)
10,001자 이상은 저장하지 않고 HTTP 400, `INVALID_INPUT`, "메시지는 10,000자까지 보낼 수 있어요"로 거절한다. 빈 메시지·공백만 있는 메시지 거절(#49-S11)은 그대로다.

#49-S12 (이어서)
- When  "가"를 10,001번 이어 쓴 메시지를 보낸다
- Then  HTTP 400, `error.code` "INVALID_INPUT", `error.fields.text` "메시지는 10,000자까지 보낼 수 있어요"다
- When  "가" 9,999번 앞뒤에 공백을 한 칸씩 붙인 10,001자 메시지를 보낸다
- Then  같은 HTTP 400이다(공백을 빼면 9,999자지만 공백도 글자 수에 들어간다)
- Then  방의 `last_seq`는 앞의 성공한 두 메시지만큼(2) 늘었다

#111-S2 경계: 서로게이트 쌍 [테스트]
- When  B가 "😀"(UTF-16 2단위)를 5,000번 이어 쓴 메시지를 보낸다
- Then  HTTP 200이다(10,000단위)
- When  "😀" 5,000번 뒤에 "가"를 붙여 보낸다
- Then  HTTP 400이다(10,001단위). 길이는 프론트 `slice`와 같은 UTF-16 단위로 센다

## 3. 채팅함 최근 메시지 (#111-R3)
채팅함은 10,000자 메시지로 끝난 방도 목록에 보여 주고, `lastMessage`는 자르지 않은 메시지 전체다(11-06 사용자 결정: #48의 "메시지 전체 내용"을 유지한다).

#111-S3 경계: 긴 메시지로 끝난 방 [테스트]
- Given #48-S1의 R1에서 B가 "가"를 10,000번 이어 쓴 메시지를 마지막으로 보냈다
- When  B가 `GET /api/v1/chats`를 부른다
- Then  HTTP 200이고 R1이 맨 위에 있다
- Then  R1의 `lastMessage`는 그 10,000자 그대로다

## 4. 기존 테이블 (#111-R4)
이미 만들어진 테스트 서버·로컬 DB의 `chat_messages.content`(`varchar(500)`)는 테이블을 지우지 않고, 앱이 시작할 때 `ddl-auto: update`가 `varchar(10000)`으로 넓힌다. develop에 병합하면 CI/CD가 backend 컨테이너를 새 이미지로 다시 띄우므로 따로 할 일이 없다 (고침 11-06: Hibernate 7.4의 `update`는 있는 컬럼의 길이도 바꾼다. 바꾸지 않는다고 잘못 알고 테이블 삭제로 정했었다)

#111-S4 정상: 기존 varchar(500) 테이블이 넓어진다 [직접]
- Given 로컬 Postgres에 검증용 DB를 새로 만든다: `CREATE DATABASE testmoa_s111;`
- Given 이 브랜치가 갈라진 `develop` 커밋(한도 500)을 임시 worktree로 꺼내, backend를 `SPRING_DATASOURCE_URL`만 `…/testmoa_s111`로 바꾸고 `ddl-auto: update`로 한 번 띄웠다가 끈다
- Then  `testmoa_s111`의 `chat_messages.content`가 `varchar(500)`이다(아래 `SELECT`가 500)
- Given 같은 DB에서 `SET session_replication_role = replica;`로 외래 키 검사를 끄고, `INSERT INTO chat_messages (room_id, seq, sender_id, content, sent_at) VALUES (1, 1, 1, '기존 메시지', now());`로 메시지 한 행을 넣는다
- When  이 브랜치의 backend를 같은 `testmoa_s111`과 `ddl-auto: update`로 띄운다
- Then  `SELECT character_maximum_length FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'content';`가 10000이다
- Then  `SELECT content FROM chat_messages;`가 '기존 메시지' 한 행이다
- Then  `spring.jpa.show-sql: true`로 띄웠다면 `alter column content set data type varchar(10000)`을 실행한 SQL이 보인다
- When  확인이 끝나면 backend를 끄고, SQL 세션을 `postgres` DB로 옮긴 뒤(`psql`이면 `\c postgres`) `DROP DATABASE testmoa_s111;`로 지운다. 지우려는 DB에 연결이 하나라도 남아 있으면 삭제가 실패한다. 다시 확인할 때는 처음부터 되풀이한다

#111-S5 정상: 배포 뒤 저장 한도 [직접]
- Given #111 PR이 develop에 병합되고 CI/CD 배포가 끝났다
- When  테스트 서버 DB에서 #111-S4의 `SELECT`를 실행한다
- Then  10000이다
- When  테스트 서버의 방에서 "가"를 10,000번 이어 쓴 메시지를 `POST /api/v1/chats/{roomKey}/messages`로 보낸다
- Then  HTTP 200이다
- When  같은 방의 `GET /api/v1/chats/{roomKey}/messages`를 부른다
- Then  마지막 메시지의 `text`가 보낸 10,000자 그대로다
- When  "가"를 10,001번 이어 쓴 메시지를 보낸다
- Then  HTTP 400, `error.fields.text` "메시지는 10,000자까지 보낼 수 있어요"이고 방의 메시지 수가 그대로다

## 범위 밖
- 프론트 입력 제한(`CHAT_MESSAGE_MAX`)과 긴 메시지 표시: #54(11-06 사용자 결정). 프론트는 보낸 메시지를 시연용 쿠키 하나(`demo-chat-sent`, 3,600자)에 담아서 한글 약 900자를 넘는 메시지를 저장할 수 없다. #54에서 실제 API로 바꿀 때 S150의 `maxlength`를 10,000으로 고치고(`고침 #111`) 긴 메시지 표시 시나리오를 더한다. 그 전까지 화면은 500자 그대로다
- 메시지 조회 개수(30개)와 채팅함 페이지 나누기: 이슈에서 뺐다. 30개 × 10,000자 한글이면 메시지 조회 응답이 최악 약 900KB다. 채팅함도 방 30개가 모두 10,000자로 끝나면 약 900KB다
- 스키마 관리 방식(Flyway 등) 도입: 팀 결정
- 피드백 칸 등 다른 500자 제한(`FeedbackList`, `FEEDBACK_MAX_LENGTH`): 채팅과 관계없다

## 작업 순서
1. 서버 한도와 거절 — #49-S12(고침), #111-S1, #111-S2
   - 파일: `entity/ChatMessage.java`(`CONTENT_MAX = 10_000`, 주석 "프론트의 CHAT_MESSAGE_MAX와 같다"를 "프론트의 CHAT_MESSAGE_MAX는 #54에서 맞춘다"로), `dto/request/ChatMessageSendRequest.java`(message "메시지는 10,000자까지 보낼 수 있어요"), 테스트 `controller/ChatControllerTest.java`(`messageLength`를 10,000 경계로, `@DisplayName("#49-S12 공백을 포함해 10,000자까지 허용")`, 새 테스트 `#111-S1`·`#111-S2`)
   - 확인: `./gradlew test --tests '*ChatControllerTest'`
2. 채팅함 — #111-S3
   - 파일: 테스트 `controller/ChatInboxControllerTest.java`(`#111-S3` 하나 추가, 코드는 그대로)
   - 확인: `./gradlew test --tests '*ChatInboxControllerTest' --tests '*ChatSendConcurrencyTest'`
3. 문서 — 서버 한도만 10,000으로 고치고, 프론트 동작은 #54 전까지 500 그대로라고 구분해 적는다. 고친 줄 끝에 `(고침 #111: 서버 최대 길이 10,000자로 확대)`를 붙인다
   - messages.md: #49-R4 본문과 #49-S12를 10,000으로 고친다(이 문서의 #49-S12와 같게). 가정의 "저장 컬럼도 500자라"는 10,000자로 고친다. 가정의 "프론트는 500자를 넘으면 잘라서 보내지만 …"은 "프론트는 #54 전까지 500자(`CHAT_MESSAGE_MAX`)를 넘으면 잘라서 보내고, 서버는 10,000자를 넘으면 자르지 않고 400으로 거절한다. #54에서 프론트도 10,000으로 맞춘다"로 고친다. 참고의 "프론트 `sendChatMessage`는 … (500)까지 자르고 …"는 프론트 부분을 그대로 두고, "백엔드 `ChatMessage.CONTENT_MAX`도 500이다"만 "백엔드 `ChatMessage.CONTENT_MAX`는 10,000이다(#111)"로 고친다. 작업 순서의 `@Size(max = 500)`은 #49 당시 기록이라 고치지 않는다
   - inbox.md: 가정의 "메시지 전체 내용(최대 500자)"를 "최대 10,000자"로 고친다
   - entities.md: "메시지 내용 컬럼은 500자(`CHAT_MESSAGE_MAX`)"를 "메시지 내용 컬럼은 10,000자(`ChatMessage.CONTENT_MAX`)"로 고친다. 프론트 `CHAT_MESSAGE_MAX`는 #54 전까지 500이라 이름을 섞지 않는다
   - README: 이슈 표에 #111과 이 문서를 더한다. "아직 정하지 않은 것"의 배포 DB 항목을 "테스트 서버는 `ddl-auto: update`(11-05). `update`는 없는 테이블·컬럼을 더하고 있는 컬럼의 타입·길이를 엔티티에 맞추지만, 컬럼을 지우거나 이름을 바꾸지는 않는다"로 고친다
   - #54 이슈에 프론트 할 일(`CHAT_MESSAGE_MAX` 10,000, S150 고침, 긴 메시지 표시)을 적는 댓글을 단다(올리기 전에 묻는다)
4. 검증용 DB에서 기존 테이블 넓히기 확인 — #111-S4. 1단계 뒤, PR을 올리기 전에 한다. 평소 쓰는 로컬 DB는 건드리지 않는다
   - 확인: #111-S4의 `SELECT` 두 개
5. 배포 확인 — #111-S5. 병합·배포 뒤 서버 접근 권한이 있는 사람이 한다. 컬럼이 500으로 남았으면 `ALTER TABLE chat_messages ALTER COLUMN content TYPE varchar(10000);`을 실행한다

## 가정
- 오류 문구는 천 단위 쉼표를 넣어 "메시지는 10,000자까지 보낼 수 있어요"로 쓴다. `@Size`의 `{max}` 치환은 쉼표 없이 "10000"이 되므로 문구는 직접 적는다
- 컬럼은 `text`가 아니라 지금처럼 `length = CONTENT_MAX`(`varchar(10000)`)로 둔다. 엔티티 상수 하나로 검증과 컬럼이 같은 한도를 쓴다
- PostgreSQL `varchar(n)`은 코드 포인트로 세고 Java `@Size`는 UTF-16 단위로 센다. UTF-16 단위 수는 코드 포인트 수보다 작지 않으므로, 검증을 통과한 메시지는 항상 컬럼에 들어간다
- 각자의 로컬 DB(`application-local.yml`의 `update`)도 backend를 다시 띄우면 넓어져서 팀원이 따로 할 일은 없다. `ddl-auto`를 `update`가 아닌 값으로 쓰는 로컬 DB만 위의 `ALTER TABLE`을 실행한다. PR 본문에 적는다 (고침 11-06: Hibernate 7.4의 `update`는 있는 컬럼의 길이도 바꾼다. 바꾸지 않는다고 잘못 알고 테이블 삭제로 정했었다)
- #111-S4의 `session_replication_role` 변경은 Postgres 슈퍼유저 권한이 필요하다. 로컬 compose의 `POSTGRES_USER`는 슈퍼유저다. 넣은 행은 다른 테이블을 가리키지 않는 가짜 값이라 검증용 DB에서만 쓴다
- 테스트는 CI와 같이 빈 DB에 `create-drop`으로 만든 테이블에서 돌아서, 기존 테이블이 넓어지는지(#111-S4)는 자동 테스트로 확인할 수 없다

## 참고 (2026-11-06 확인)
- develop에 push(병합)되면 CI/CD가 검사 뒤 이미지를 올리고 테스트 서버에서 `docker compose -f compose.prod.yaml pull`·`up -d --no-build`를 실행한다. 이미지가 바뀐 backend 컨테이너는 새로 만들어지고, 시작할 때 `ddl-auto: update`가 돈다
- 컬럼이 넓어지지 않은 채 배포돼도, 프론트가 #54 전까지 500자로 자르고 실제 API에 연결되지 않아 화면에서 500자를 넘는 메시지가 서버로 가지 않는다. 서버를 직접 부를 때만 501자 이상이 DB 오류(HTTP 500)가 난다
- 테스트 서버(`compose.prod.yaml`)와 로컬 compose는 `SPRING_JPA_HIBERNATE_DDL_AUTO: update`다(11-05). CI 테스트는 `create-drop`이다
- 프로젝트의 Hibernate는 7.4.13.Final이다. `ddl-auto: update`의 `StandardTableMigrator.sqlAlterStrings`는 있는 컬럼의 타입이나 길이(`varchar(n)`의 n)가 엔티티와 다르면 `ALTER`를 만든다. `PostgreSQLDialect`는 `supportsAlterColumnType()`이 true이고 `alter column … set data type …`을 쓴다. 이 `ALTER`는 타입만 바꾸고 not null·default는 건드리지 않는다. (고침 11-06: Hibernate 7.4의 `update`는 있는 컬럼의 길이도 바꾼다. 바꾸지 않는다고 잘못 알고 테이블 삭제로 정했었다)
- PostgreSQL에서 `varchar(n)`의 n을 늘리는 `ALTER COLUMN … TYPE`은 테이블을 다시 쓰지 않는다
- 프론트 시연 저장(`frontend/demo/chat.ts`): `demo-chat-sent` 쿠키 값이 3,600자(`CHAT_SENT_COOKIE_MAX`)를 넘으면 오래된 메시지부터 지운다. 메시지 하나가 그보다 길면 지우지 못하고 그대로 쓴다. 한글은 UTF-8 3바이트를 base64로 담아 한 글자에 약 4자다
