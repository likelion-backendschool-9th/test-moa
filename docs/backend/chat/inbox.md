# 채팅함 조회 (#48)

로그인 회원이 들어가 있는 채팅방 목록을 주는 API. 채팅 전체에서 정한 것과 데이터 구조는 [README.md](README.md)에 있고, 방 정보 응답은 [messages.md](messages.md)(#49)의 방 조회와 같은 모양을 쓴다.

## 한눈에
- 끝나면: 로그인 회원이 `GET /api/v1/chats`로 내가 들어가 있고 지우지 않은 채팅방을 받는다. 검색어(`q`), 역할(`role`), 정렬(`sort`)은 서버가 적용하고, 전체 방 수(`total`)와 검색어만 적용한 역할별 방 수(`counts`)를 함께 준다. 방마다 #49 방 조회와 같은 정보에 최근 메시지와 일시가 붙는다. 페이지는 나누지 않는다
- 결정 필요: 없음
- 규모: 5단계(구현 4, 문서 1)

## 1. 내 채팅방 목록 (#48-R1)
로그인 회원은 내가 참여하고 지우지 않은 채팅방을 최근 메시지 일시가 늦은 것부터 모두 받는다. 테스터로 들어간 방과 개발자로 들어간 방이 함께 온다.

#48-S1 정상: 테스터이면서 개발자인 회원 [테스트]
- Given 개발자 A("모아개발")의 프로젝트 "북로그"(이미지 `https://img.test/booklog.png`)에 회원 B("모아테스터")가 테스터로 선정되어 방 R1이 열려 있다
- Given B의 프로젝트 "가계부"(이미지 없음)에 회원 C("새싹")가 테스터로 선정되어 방 R2가 열려 있다
- Given R1에 A가 "안녕하세요"를 보냈고, 그 뒤 R2에 C가 "로그인이 안 돼요"를 보냈다
- When  B가 `GET /api/v1/chats`를 부른다
- Then  HTTP 200이고 `data.rooms`는 R2, R1 순이다
- Then  `data.total`은 2, `data.counts`는 {all 2, tester 1, developer 1}이다
- Then  R2는 `projectName` "가계부", `projectImage` null, `roomName` null, `myRole` "DEVELOPER", `partner` {nickname "새싹", role "TESTER"}, `lastMessage` "로그인이 안 돼요"다
- Then  R1은 `recruitmentId` 그 모집 건의 id, `projectName` "북로그", `projectImage` `https://img.test/booklog.png`, `myRole` "TESTER", `partner` {nickname "모아개발", role "DEVELOPER"}, `lastMessage` "안녕하세요"다
- Then  두 방 모두 `roomKey`와 `lastMessageAt`(마지막 메시지의 보낸 시각)이 있다
- Then  A와 B는 구독 중이고 두 모집이 종료 전이면 두 방의 `readOnly`는 false다 (고침 #53: 읽기 전용 표시)

#48-S2 정상: 새 메시지가 오면 맨 위로 [테스트]
- Given #48-S1의 두 방
- When  A가 R1에 "확인했어요"를 보낸다
- When  B가 채팅함을 부른다
- Then  `rooms`는 R1, R2 순이고 R1의 `lastMessage`는 "확인했어요"다

#48-S3 정상: 바꾼 이름은 내 채팅함에만 [테스트]
- Given #48-S1에서 B가 R1의 이름을 "북로그 1차"로 바꿨다
- When  B가 채팅함을 부른다
- Then  R1의 `roomName`은 "북로그 1차", `projectName`은 "북로그"다
- When  A가 채팅함을 부른다
- Then  A의 R1 `roomName`은 null이다

#48-S4 경계: 메시지가 없는 방 [테스트]
- Given 방 R3이 막 열려 메시지가 없다
- Given 그보다 먼저 연 방 R1에는 R3을 연 뒤 보낸 메시지가 없다(R1의 마지막 메시지가 R3을 연 시각보다 이르다)
- When  R3의 참여자가 채팅함을 부른다
- Then  R3이 목록에 있고 `lastMessage`는 null, `lastMessageAt`은 방을 연 시각이다
- Then  R3은 R1보다 앞에 온다

#48-S5 경계: 방이 없는 회원과 운영자 [테스트]
- Given 채팅방이 하나도 없는 회원 D와 운영자 E
- When  D와 E가 채팅함을 부른다
- Then  둘 다 HTTP 200이고 `rooms`는 빈 배열, `total`은 0, `counts`는 {all 0, tester 0, developer 0}이다

## 2. 지운 방 (#48-R2)
내가 지운 방은 내 채팅함에 오지 않고, 상대가 그 방에 새 메시지를 보내면 다시 온다(README의 11-04 결정, #49-S9의 삭제 해제).

#48-S6 정상 [테스트]
- Given #48-S1에서 B가 R2를 지웠다
- When  B가 채팅함을 부른다
- Then  `rooms`에는 R1만 있다
- When  C가 채팅함을 부른다
- Then  C의 `rooms`에는 R2가 그대로 있다
- When  C가 R2에 "다시 봐 주세요"를 보낸다
- When  B가 채팅함을 부른다
- Then  `rooms`는 R2("다시 봐 주세요"), R1 순이다

## 3. 검색·역할·정렬 (#48-R3)
서버가 검색어, 역할, 정렬을 적용해 방을 준다. 탭에 붙는 역할별 방 수는 검색어만 적용하고 역할은 적용하기 전의 수이고, 전체 방 수는 조건과 관계없는 내 방 수다. 프론트 채팅함의 검색·탭·정렬(`docs/frontend/chat/chats.md`의 S122~S124, S126)과 같은 규칙이다.

#48-S7 정상: 검색 [테스트]
- Given B가 들어가 있는 방이 셋이다: R1(프로젝트 "북로그", 상대 "모아개발", B는 테스터), R2(프로젝트 "가계부", 상대 "새싹", B는 개발자), R4(프로젝트 "회의록", 상대 "모아개발", B는 테스터, B가 이름을 "정산 회의"로 바꿈)
- When  B가 `GET /api/v1/chats?q=모아개발`을 부른다
- Then  `rooms`는 R1, R4이고 `counts`는 {all 2, tester 2, developer 0}, `total`은 3이다
- When  `q=정산`으로 부른다
- Then  `rooms`는 R4 하나다(바꾼 이름에서 찾는다)
- When  `q=회의록`으로 부른다
- Then  `rooms`는 R4 하나다(이름을 바꿔도 프로젝트명에서 찾는다)
- When  `q=가계`, `q=가계부 `(뒤 공백), `q=%EA%B0%80%EA%B3%84%EB%B6%80`로 부른다
- Then  셋 다 `rooms`는 R2 하나다(부분 일치, 앞뒤 공백 무시)

#48-S8 정상: 영문 대소문자와 특수 문자 [테스트]
- Given B의 방에 프로젝트 "MoaPlan"과 "100%_done"이 있다
- When  `q=moaplan`으로 부른다
- Then  "MoaPlan" 방이 나온다
- When  `q=%25_`(`%_`)로 부른다
- Then  "100%_done" 방만 나온다(`%`, `_`를 와일드카드가 아닌 글자로 찾는다)

#48-S9 정상: 역할 [테스트]
- Given #48-S7의 세 방
- When  `role=TESTER`로 부른다
- Then  `rooms`는 R1, R4이고 `counts`는 {all 3, tester 2, developer 1}이다
- When  `q=모아개발&role=DEVELOPER`로 부른다
- Then  `rooms`는 빈 배열이고 `counts`는 {all 2, tester 2, developer 0}, `total`은 3이다

#48-S10 정상: 정렬 [테스트]
- Given #48-S7의 세 방에 R4, R1, R2 순서로 메시지를 보냈다
- When  `sort=OLDEST`로 부른다
- Then  `rooms`는 R4, R1, R2 순이다
- When  `sort=LATEST`로 부르거나 `sort` 없이 부른다
- Then  `rooms`는 R2, R1, R4 순이다

#48-S11 실패: 잘못된 역할·정렬 값 [테스트]
- When  `role=ADMIN`, `role=tester`(소문자), `sort=newest`로 부른다
- Then  모두 HTTP 400, `error.code` "INVALID_INPUT"이다

## 4. 로그인 (#48-R4)
비로그인 요청은 거절한다.

#48-S12 실패 [테스트]
- When  토큰 없이 `GET /api/v1/chats`를 부른다
- Then  HTTP 401, `error.code` "UNAUTHORIZED"다

## 범위 밖
- 페이지 나누기·무한 스크롤: 채팅함 화면에 없다(프론트 `chats.md`의 범위 밖). 방이 많아져 필요해지면 프론트 기획과 함께 별도 이슈로 하고, 그때 거르기·정렬·개수를 SQL로 옮기고 커서를 더한다(11-05 사용자 결정)
- 프론트 연결: #54. `getChatInbox(query)`는 `q`, `role`, `sort`를 백엔드로 넘기고 받은 결과를 그대로 쓴다. 역할·정렬 값을 대문자로 바꾸는 일도 #54에서 한다
- 채팅방 안의 메시지 검색: 별도 이슈
- 안 읽은 메시지 수와 헤더의 안 읽은 표시: #52
- 새로고침 없이 목록 갱신: #51
- 이름 변경·삭제 API: #50. 테스트에서는 엔티티의 `rename`, `hide`로 상태를 만든다
- 모집·구독이 끝난 방 표시(읽기 전용): [#53](start.md) (고침 #53: 끝난 기준 정함)
- 정지·탈퇴한 상대의 표시: 운영자 제재(#86)에서 정한다

## 작업 순서
1. 목록의 가장 얇은 경로 — #48-S1, #48-S5, #48-S12
   - 파일: `ChatController.java`(`@RequestMapping`을 `/api/v1/chats`로 올리고 기존 세 API는 `/{roomKey}`, `/{roomKey}/messages`로 옮긴다. 주소는 바뀌지 않는다), `ChatService.java`·`ChatServiceImpl.java`(`getInbox(userId, query)`), `ChatParticipantRepository`(내 방 목록 쿼리), `domain/dto/response/ChatInboxResponse.java`, 테스트 `controller/ChatInboxControllerTest.java`
   - 확인: `./gradlew test --tests '*ChatInboxControllerTest' --tests '*ChatControllerTest'`
2. 순서·이름·빈 방·지운 방 — #48-S2, #48-S3, #48-S4, #48-S6
   - 파일: 같은 쿼리와 테스트
   - 확인: 같은 명령
3. 검색·역할·정렬 — #48-S7, #48-S8, #48-S9, #48-S10, #48-S11
   - 파일: `domain/dto/request/ChatInboxQuery.java`(`q`, `role`(`ChatRole`, 생략 가능), `sort`(`ChatInboxSort` `LATEST`·`OLDEST`, 기본 `LATEST`)), `global/common/ChatInboxSort.java`, `ChatServiceImpl.java`(거르기·정렬·개수), 같은 테스트
   - 확인: 같은 명령
4. 전체 테스트 — `./gradlew test`
5. 문서 — README 이슈 표에 이 문서 링크


## 가정
- 응답은 `ApiResponse`로 감싸고 `data`는 `{rooms: [...], total, counts: {all, tester, developer}}`다. 프론트 `ChatInboxData`와 같은 모양이다(`now`는 프론트가 만든다). 나중에 커서나 안 읽은 수 합계(#52)를 더해도 모양이 깨지지 않는다
- 방 하나는 `{roomKey, recruitmentId, projectName, roomName, projectImage, myRole, partner: {nickname, role}, lastMessage, lastMessageAt}`이다. 앞의 일곱 개는 #49 `ChatRoomResponse`와 같은 값이고, `ChatInboxResponse.Room`이 그것에 최근 메시지 두 필드를 더한다
- `roomName`은 내가 바꾼 이름이고 바꾸지 않았으면 null이다. "없으면 프로젝트명"은 프론트가 보여 줄 때 한다(#49와 같은 규칙)
- `lastMessage`는 메시지의 앞 100자이고, 한 줄로 줄이는 것과 말줄임은 프론트 카드가 한다. 메시지가 없으면 null이다. 프론트 `ChatRoom.lastMessage`는 문자열이라 #54에서 null을 다루게 고친다. (고침 #170: 채팅함 응답 크기를 줄이려고 앞 100자만 준다)
- 정렬 기준은 방의 `last_message_at`이다. `LATEST`는 늦은 것부터, `OLDEST`는 이른 것부터이고, 같으면 둘 다 방 id 내림차순(나중에 연 방이 앞)이다. `last_message_at`은 메시지가 없으면 방을 연 시각이다(#47)
- 검색: 앞뒤 공백을 뺀 `q`가 내가 바꾼 이름, 프로젝트명, 상대 닉네임 중 하나에 들어 있으면 남긴다. 대소문자는 무시하고 `%`, `_`는 글자 그대로 찾는다. 공백뿐이거나 없으면 검색하지 않는다. 길이 제한은 두지 않는다
- 거르기·정렬·개수는 서버(서비스)가 한다(11-05 사용자 결정, 일반적인 관행). `total`과 `counts`에 내 방 전부가 필요하므로 내 방을 쿼리 한 번으로 읽고 서비스에서 거르고 센다. 페이지를 나누게 되면 그때 SQL로 옮긴다
- 역할·정렬 값은 `ChatRole`, `ChatInboxSort` 그대로 대문자다. 다른 값은 400이다. 프론트는 잘못된 값을 무시하고 기본값으로 보지만, 프론트가 백엔드에 넘기기 전에 이미 걸러 두므로 백엔드에 잘못된 값이 오는 것은 잘못된 요청이다
- 목록은 쿼리 한 번으로 읽고, 읽기 전용 판단에 필요한 모집 건과 개발자 구독을 각각 한 번씩 일괄 조회한다. 방이 있는 목록은 방 수와 관계없이 총 세 쿼리다 (고침 #53: 모집·구독 일괄 확인). 내 참여자 → 방 → 모집 건 → 프로젝트, 상대 참여자 → 상대 회원, 그리고 `seq = 방의 last_seq`인 메시지(없으면 null, left join)를 함께 가져온다. 방마다 따로 조회하지 않는다. 최근 메시지는 `(room_id, seq)` unique 인덱스로 찾는다
- 운영자는 참여자가 될 수 없어서 따로 막지 않아도 빈 목록이 된다. 프론트 헤더도 운영자에게 채팅 메뉴를 보이지 않는다
- 테스트에서 메시지는 #49의 보내기 API(`POST /api/v1/chats/{roomKey}/messages`)로 보낸다. 그래야 방의 `last_seq`·`last_message_at`이 실제와 같이 바뀐다

## 참고 (2026-11-05 확인)
- 프론트 `getChatInbox(query)`는 지금 목업을 검색어(대화방 이름·프로젝트명·상대 닉네임, 대소문자 무시), 역할, 정렬(최신·오래된)로 거르고, 검색어만 적용한 역할별 개수(`counts`)와 전체 수(`total`)를 함께 돌려준다. `parseChatQuery`는 `q`의 앞뒤 공백을 빼고, 모르는 역할·정렬 값은 무시한다. 실제 API를 붙일 때 함수 본문만 바꾼다(#54)
- 채팅함 화면은 페이지를 나누지 않고 받은 방을 모두 그린다. 프론트 계획(`docs/frontend/chat/chats.md`)이 2026-10-30 목업 단계에서 "페이지 나누기·무한 스크롤"을 범위 밖으로 두었고, 이유는 기록되어 있지 않다
- `ChatFixtures`는 `EntityManager`도 받고, 프로젝트 이미지를 넣는 `recruitment(developer, title, imageUrl)`가 있다(#49)
