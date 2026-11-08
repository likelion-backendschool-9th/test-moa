# 실시간 전송 (#51)

새 메시지와 읽음을 새로고침 없이 알리는 SSE 연결. 채팅 전체에서 정한 것(SSE 방식, 회원마다 연결 하나, 알림만 보내고 내용은 REST로 받기)은 [README.md](README.md)의 11-05 결정에 있다. 메시지 조회는 [messages.md](messages.md)(#49), 읽음 처리는 [read.md](read.md)(#52)를 그대로 쓰고, 이 문서는 그 위에 알림과 `after` 조회를 더한다.

## 한눈에
- 끝나면: 로그인 회원이 `GET /api/v1/chats/events`(브라우저는 Next의 `GET /api/chats/events`)로 연결하면 곧바로 `ready` 이벤트를 받는다. 내가 들어간 방에 메시지가 저장되면 `message`(`roomKey`, `seq`), 읽음이 올라가면 `read`(`roomKey`, 누가, 순번)를 받는다. 연결이 끊겼다 이어지면 다시 받은 `ready`를 계기로 `GET /api/v1/chats/{roomKey}/messages?after={seq}`로 그 사이 메시지를 채운다. 연결은 25초마다 하트비트를 받고 30분이면 서버가 닫아 다시 연결된다
- 결정 필요: 없음
- 규모: 7단계(백엔드 5, 중계·nginx 1, 문서 1)

## 1. 연결 (#51-R1)
로그인 회원은 회원마다 SSE 연결을 열고, 열자마자 `ready` 이벤트를 받는다. 연결은 하트비트로 유지되고, 정한 시간이 지나면 서버가 정상 종료한다.

#51-S1 정상 [테스트]
- Given 개발자 A("모아개발")의 프로젝트 "북로그" 모집 건에 테스터 B("모아테스터")가 선정되어 방 R이 열려 있다
- When  B가 `GET /api/v1/chats/events`를 `Accept: text/event-stream`으로 부른다
- Then  HTTP 200, `Content-Type`은 `text/event-stream`이다
- Then  첫 이벤트는 `retry: 3000`과 함께 `event: ready`, `data: {}`다

#51-S2 정상: 하트비트 [테스트]
- Given 하트비트 간격을 1초로 둔 테스트 설정
- When  B가 연결하고 아무 일도 없이 2.5초를 기다린다
- Then  `ready` 뒤에 주석 줄(`:`로 시작)이 2개 이상 온다

#51-S3 정상: 연결 시간이 다 되면 서버가 닫는다 [테스트]
- Given 연결 시간을 2초로 둔 테스트 설정
- When  B가 연결한다
- Then  약 2초 뒤 응답 스트림이 끝난다(오류 이벤트 없이)
- Then  B가 다시 연결하면 새 `ready`를 받는다

#51-S4 실패: 비로그인 [테스트]
- When  토큰 없이 `GET /api/v1/chats/events`를 부른다
- Then  HTTP 401, `error.code` "UNAUTHORIZED"이고 스트림을 열지 않는다

## 2. 새 메시지 알림 (#51-R2)
방에 메시지가 저장되면 그 방 두 참여자의 모든 연결에 `message` 이벤트가 간다. 내용은 보내지 않는다. 참여자가 아닌 회원에게는 가지 않는다.

#51-S5 정상 [테스트]
- Given A와 B가 각각 연결해 `ready`를 받았다
- When  A가 R에 "안녕하세요"를 보낸다(순번 1)
- Then  B의 연결에 `event: message`, `data: {"roomKey": "{R}", "seq": 1}`이 온다
- Then  A의 연결에도 같은 이벤트가 온다(A의 다른 탭·기기에 열어 둔 채팅방에도 내 메시지가 나오도록)

#51-S6 정상: 한 회원의 여러 연결 [테스트]
- Given B가 연결을 두 개 열었다
- When  A가 R에 보낸다
- Then  B의 두 연결 모두 `message`를 받는다

#51-S7 정상: 지운 방도 알림이 간다 [테스트]
- Given B가 R을 지웠고 연결해 있다
- When  A가 R에 "다시 확인 부탁드려요"를 보낸다
- Then  B의 연결에 R의 `message`가 온다(#49-S9로 R이 B의 채팅함에 다시 나타났다)

#51-S8 실패: 참여자가 아닌 회원·운영자 [테스트]
- Given R과 관계없는 회원 C와 운영자 D가 연결해 있고, C가 테스터인 다른 방 R2가 있다
- When  A가 R에 보내고, 그다음 R2의 개발자가 R2에 보낸다
- Then  C가 `ready` 다음에 받는 첫 `message`는 R2의 것이다(R의 알림은 오지 않는다)
- Then  D는 `ready` 뒤에 `message`를 받지 않는다(하트비트만 온다)

#51-S9 실패: 저장되지 않은 메시지 [테스트]
- Given A와 B가 연결해 있다
- When  B가 `{"text": "  "}`를 보내 HTTP 400을 받는다
- When  이어서 B가 "확인"을 보낸다(순번 1)
- Then  A가 `ready` 다음에 받는 첫 `message`의 `seq`는 1이다(실패한 요청의 알림은 없다)

## 3. 읽음 알림 (#51-R3)
읽음 처리로 `last_read_seq`가 실제로 오르면 상대의 연결과 내 연결에 `read` 이벤트가 간다. 누가 읽었는지는 받는 사람 기준으로 `reader` "me"/"partner"다(메시지의 `from`과 같은 규칙).

#51-S10 정상 [테스트]
- Given R에 A의 메시지 3개(순번 1~3)가 있고 A와 B가 연결해 있다
- When  B가 `POST /api/v1/chats/{R}/read`에 `{"seq": 3}`을 보낸다
- Then  A의 연결에 `event: read`, `data: {"roomKey": "{R}", "reader": "partner", "lastReadSeq": 3}`이 온다
- Then  B의 연결에는 같은 방·순번에 `"reader": "me"`가 온다(B의 다른 탭·기기의 안 읽은 수가 맞춰지도록)

#51-S11 정상: 오르지 않으면 알리지 않는다 [테스트]
- Given #51-S10 뒤 B의 `last_read_seq`가 3이다
- When  B가 `{"seq": 2}`, `{"seq": 3}`을 보내고(둘 다 200, #52-S3), 이어서 A가 R에 보낸다(순번 4)
- Then  A가 #51-S10의 `read` 다음에 받는 이벤트는 순번 4의 `message`다

## 4. 놓친 메시지 채우기 (#51-R4)
메시지 조회에 `after={seq}`를 주면 그 순번보다 큰 메시지를 오래된 것부터 최대 30개 받고, 더 새로운 메시지가 남았는지 `hasMore`로 받는다.

#51-S12 정상 [테스트]
- Given R에 메시지 5개(순번 1~5)가 있다
- When  B가 `GET /api/v1/chats/{R}/messages?after=2`를 부른다
- Then  HTTP 200이고 `messages`는 순번 3, 4, 5이고 `hasMore`는 false다
- When  `after=5`, `after=9`로 부른다
- Then  둘 다 `messages`는 빈 배열, `hasMore`는 false다

#51-S13 경계: 30개보다 많이 놓쳤을 때 [테스트]
- Given R에 메시지 65개(순번 1~65)가 있다
- When  B가 `after=0`으로 부른다
- Then  `messages`는 순번 1~30이고 `hasMore`는 true다
- When  `after=30`, 이어서 `after=60`으로 부른다
- Then  각각 순번 31~60(`hasMore` true), 61~65(`hasMore` false)다

#51-S14 실패: 잘못된 커서 [테스트]
- When  B가 `after=-1`, `after=abc`, `after=2&before=5`로 부른다
- Then  모두 HTTP 400, `error.code` "INVALID_INPUT"이다
- When  R과 관계없는 회원 C가 `after=0`으로 부른다
- Then  #49-S14와 같은 HTTP 404다

## 5. 연결 정리 (#51-R5)
끊긴 연결은 목록에서 빠져 이후 전송·읽음 처리에 영향을 주지 않는다. 한 회원의 연결은 5개까지이고, 6번째를 열면 가장 오래된 연결을 닫는다.

#51-S15 정상: 끊긴 연결 [테스트]
- Given B가 연결했다가 클라이언트 쪽에서 끊었다
- When  A가 R에 보낸다
- Then  HTTP 200이고 메시지가 저장된다
- Then  B의 연결 목록은 비어 있다(알림 대상 회원 연결 수 0)

#51-S16 경계: 연결 수 제한 [테스트]
- Given B가 연결을 5개 열었다
- When  B가 6번째 연결을 연다
- Then  처음 연 연결의 스트림이 끝난다
- Then  A가 R에 보내면 나머지 5개 연결이 `message`를 받는다

## 6. 브라우저까지 중계 (#51-R6)
브라우저는 Next의 `GET /api/chats/events`에 연결하고, Next 서버가 쿠키의 토큰으로 백엔드 연결을 열어 받은 바이트를 그대로 흘려보낸다. nginx를 지나도 이벤트가 버퍼에 묶이지 않는다.

#51-S17 정상: 로컬 compose [직접]
- Given 로컬 compose(`AUTH_MODE=backend`)로 띄우고 B로 로그인한 쿠키가 있다
- When  `curl -N -b 쿠키 http://localhost/api/chats/events`를 연다
- Then  1초 안에 `event: ready`가 보인다
- When  다른 터미널에서 A로 R에 메시지를 보낸다
- Then  1초 안에 `event: message`가 보인다
- Then  아무 일 없이 90초를 두어도 끊기지 않고 25초마다 하트비트가 보인다(nginx 60초 읽기 시간 제한에 걸리지 않는다)

#51-S18 정상: 브라우저가 끊으면 백엔드 연결도 닫힌다 [직접]
- Given #51-S17처럼 연결해 있다
- When  curl을 끈다
- Then  백엔드 로그에 B의 연결 종료가 남고, A가 다시 보내도 오류가 없다

#51-S19 실패: 비로그인과 목업 모드 [직접]
- When  쿠키 없이 `/api/chats/events`를 연다
- Then  HTTP 401이다(백엔드 401을 그대로 넘긴다)
- When  `AUTH_MODE` 없이(목업 모드) 연다
- Then  HTTP 204다(`EventSource`가 다시 연결하지 않는다)

## 범위 밖
- 화면 연결(`EventSource`로 채팅방 말풍선 추가·읽음 표시, 채팅함 순서·안 읽은 수, 헤더 표시, `ready`마다 다시 채우기, 채팅방을 연 동안 받은 메시지 읽음 처리 호출): #54
- 메시지 내용을 이벤트에 싣기: README 11-05 결정대로 알림만 보낸다. 받은 쪽이 `after`로 조회하므로 권한 검사가 REST 한 곳에만 있다
- 이벤트 id와 `Last-Event-ID`로 끊긴 사이의 이벤트 다시 보내기: 다시 연결하면 `ready`를 계기로 REST로 채운다(README 11-05). 서버가 이벤트를 저장하지 않는다
- 백엔드 여러 대에 걸친 전달(Redis pub/sub, PostgreSQL `LISTEN/NOTIFY` 등): 지금 백엔드는 한 대다. README "아직 정하지 않은 것"에 적는다
- 이름 변경·삭제를 내 다른 탭·기기에 알리기: 채팅함 목록과 제목만 바뀌고, 다른 탭은 채팅함으로 돌아가거나 새로고침하면 맞는다(11-08 사용자 결정). 메시지·읽음은 보낸다(가정 참고)
- 연결 중 정지·탈퇴된 회원의 연결 끊기: #86. 연결 시간(30분)이 지나 다시 연결할 때 토큰 인증의 `ACTIVE` 확인에 걸린다
- 상대의 접속 중 표시, 입력 중 표시: 기획에 없다

## 작업 순서
1. 연결의 가장 얇은 경로 — #51-S1, S4
   - 파일: `global/sse/` 또는 채팅 패키지의 `ChatEventHub.java`(새로, 회원 id → 연결 목록, `ConcurrentHashMap`·`CopyOnWriteArrayList`), `controller/ChatEventController.java`(새로, `@GetMapping(value = "/api/v1/chats/events", produces = TEXT_EVENT_STREAM_VALUE)`, `SseEmitter`를 만들어 허브에 넣고 `ready`·`retry`를 보낸다), `application.yml`(`chat.sse.timeout: 30m`, `chat.sse.heartbeat: 25s`, `chat.sse.max-connections: 5`), 테스트 `controller/ChatEventControllerTest.java`(새로, `@SpringBootTest(webEnvironment = RANDOM_PORT)`와 `java.net.http.HttpClient`로 줄 단위로 읽는다. 트랜잭션 없이 돌고 끝나면 만든 행을 지운다)
   - 확인: `./gradlew test --tests '*ChatEventControllerTest'`
2. 하트비트·연결 시간·정리·제한 — #51-S2, S3, S15, S16
   - 파일: `ChatEventHub.java`(`@Scheduled`로 하트비트 주석 전송, 실패한 연결 제거, `onCompletion`·`onTimeout`·`onError`에서 제거, 6번째에 가장 오래된 연결 `complete()`), 스케줄링 설정(`@EnableScheduling`이 없으면 더한다), 테스트 설정에서 간격·시간을 짧게(`@TestPropertySource`)
   - 확인: 같은 명령
3. 새 메시지 알림 — #51-S5~S9
   - 파일: 이벤트 레코드 `ChatMessageSaved(roomKey, seq, userIds)`, `ChatServiceImpl.sendMessage`(저장 뒤 `ApplicationEventPublisher`로 발행), 리스너 `ChatEventListener.java`(`@TransactionalEventListener(phase = AFTER_COMMIT)`에서 허브로 전송), 같은 테스트
   - 확인: 같은 명령
4. 읽음 알림 — #51-S10, S11
   - 파일: 이벤트 레코드 `ChatReadAdvanced(roomKey, readerUserId, partnerUserId, lastReadSeq)`, `ChatServiceImpl.markRead`(`markRead` update가 1행일 때만 발행), 리스너, 같은 테스트
   - 확인: 같은 명령
5. `after` 조회 — #51-S12~S14
   - 파일: `ChatController.getMessages`(`@RequestParam(required = false) @Min(0) Long after`, `before`와 함께 오면 `INVALID_INPUT`), `ChatMessageRepository`(`findByRoomAndSeqGreaterThanOrderBySeqAsc`, `Slice`), `ChatServiceImpl.getMessages`, 테스트는 `ChatControllerTest`에 더한다
   - 확인: `./gradlew test --tests '*ChatControllerTest' --tests '*ChatEventControllerTest'`, 마지막에 `./gradlew test --tests '*Chat*'`
6. 중계와 nginx — #51-S17~S19
   - 파일: `frontend/app/api/chats/events/route.ts`(새로, `await connection()`으로 요청마다 실행(`cacheComponents: true`와 호환), 목업 모드면 204, 쿠키 토큰으로 백엔드 `fetch`, `request.signal`을 넘겨 브라우저가 끊으면 백엔드 요청도 끊는다, 백엔드 상태가 200이 아니면 그 상태와 본문을 그대로, 200이면 `upstream.body`를 `Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform`, `X-Accel-Buffering: no`로 돌려준다), `nginx/default.conf`·`https.conf`·`server.conf`(`location = /api/chats/events`에 `proxy_buffering off`, `proxy_read_timeout 1h`, `proxy_pass_header X-Accel-Buffering`), `frontend/e2e/pages.ts`는 페이지가 아니라 바꾸지 않는다
   - 확인: `npm run lint`·`npm run build`(frontend), #51-S17~S19를 curl로 확인
7. 문서 — README 이슈 표에 이 문서 링크, "정한 것"에 이벤트 종류·연결 시간·하트비트 결정, "아직 정하지 않은 것"에 백엔드 여러 대일 때의 전달, [rooms.md](rooms.md) 범위 밖의 "실시간 알림(이름 변경·삭제를 다른 탭에 알리기): #51" 줄에 `(고침 #51: 채팅함으로 돌아가면 맞아서 넣지 않음)`, [messages.md](messages.md)의 `after` 범위 밖 줄은 그대로 둔다(#49 당시 범위)

## 가정
- 백엔드 주소는 `/api/v1/chats/events`다. `/api/v1/chats/{roomKey}`의 roomKey는 22자라 "events"와 겹치지 않고, Spring은 고정 경로를 먼저 고른다(#52의 `/unread`와 같다). 브라우저 주소 `/api/chats/events`는 Next Route Handler이고, `v1`은 백엔드 API에만 붙인다
- 이벤트는 세 가지다. `ready`(`{}`, 연결마다 한 번), `message`(`{roomKey, seq}`), `read`(`{roomKey, reader: "me"|"partner", lastReadSeq}`). 하트비트는 이벤트가 아니라 SSE 주석 줄이라 `EventSource`의 핸들러가 불리지 않는다
- `ready`를 받을 때마다 화면이 다시 채운다(#54). 처음 연결과 다시 연결을 구분하지 않아도 되고, 연결이 열리기 전에 온 메시지도 놓치지 않는다
- 하트비트는 25초, `retry`는 3초다. 우리 nginx와 호스트 nginx의 `proxy_read_timeout` 기본값(60초, 두 번의 읽기 사이 시간)보다 짧게 둔다
- 연결 시간은 30분이다(access 토큰 수명과 같다). 서버가 정상 종료하면 `EventSource`가 3초 뒤 다시 연결하고, 그 요청에서 `proxy.ts`가 만료된 토큰을 갱신한다. 그래서 토큰이 만료된 연결이 계속 남지 않는다. `SseEmitter`의 시간 제한은 기본값에 기대지 않고 생성자에 명시한다
- 알림은 트랜잭션 커밋 뒤(`AFTER_COMMIT`)에 보낸다. 커밋 전에 보내면 받은 쪽의 `after` 조회가 아직 저장되지 않은 메시지를 못 볼 수 있고, 롤백된 메시지를 알릴 수 있다
- 알림 대상은 방의 두 참여자 회원 id다. `hidden`과 관계없이 보낸다. 상대가 지운 방은 보내기가 같은 트랜잭션에서 삭제를 풀기 때문이다(#49-S9)
- 메시지·읽음 알림은 상대뿐 아니라 같은 회원의 연결(다른 탭·기기)에도 보낸다. 이름 변경·삭제는 보내지 않는다(11-08 사용자 결정). 다른 기기에서 보낸 내 메시지가 열어 둔 채팅방에 없으면 대화가 빠져 보이고, 안 읽은 수는 모든 페이지의 헤더에 보인다. 이름 변경·삭제는 채팅함 목록과 제목만 바꾸고 채팅함으로 돌아가면 맞는다. 두 참여자에게 같은 알림을 보내므로 보낸 사람을 빼는 처리가 없다
- 전송은 요청 스레드에서 바로 한다. 이벤트가 수십 바이트이고 1대1 방이라 대상 연결이 많아야 10개다. 보내다 실패한 연결은 목록에서 빼고 요청은 성공시킨다
- 한 회원의 연결은 5개까지다. 탭을 많이 열어 둔 회원이 서버 자원을 붙잡지 않게 하고, 넘으면 가장 오래된 연결을 닫는다. 닫힌 탭의 `EventSource`가 다시 연결하면 그 탭이 다시 최신이 된다
- `after`는 0 이상이다. `after=0`은 처음부터다. 방의 마지막 순번 이상이면 빈 목록이다(400이 아니다). 다시 연결하는 순간 다른 탭이 이미 채운 경우처럼 정상적으로 생길 수 있다. `before`와 함께 쓰면 400이다. `hasMore`는 `before`일 때 "더 오래된 것이 남음", `after`일 때 "더 새로운 것이 남음"이다
- 연결은 회원마다 열고 방마다 열지 않는다(README 11-05). 그래서 "참여자가 아닌 회원은 그 방에 연결할 수 없다"(이슈 시나리오 3)는 "참여자가 아닌 회원에게는 그 방의 알림이 가지 않는다"(#51-S8)와 `after` 조회의 404(#51-S14)로 확인한다
- 운영자도 연결할 수 있다. 참여자가 될 수 없어 하트비트만 받는다. 헤더가 운영자에게 채팅 메뉴를 보이지 않으므로 #54에서 연결하지 않는다
- 백엔드는 한 대이고 연결 목록은 메모리에 둔다. 백엔드를 다시 띄우면 연결이 모두 끊기고, 브라우저가 다시 연결해 `ready`로 채운다
- Next Route Handler 중계와 nginx 설정은 이 이슈에서 한다(11-08 사용자 결정). 이슈 참고가 nginx 확인을 #51에 두었고, 버퍼링·읽기 시간 제한은 Spring만 띄워서는 드러나지 않는다. #54에는 `EventSource`를 쓰는 화면만 남는다
- Next 중계는 받은 바이트를 바꾸지 않고 넘긴다. 이벤트를 해석하지 않으므로 이벤트 종류가 늘어도 중계는 그대로다

## 참고 (2026-11-08 확인)
- nginx는 기본으로 응답을 버퍼링하고(`proxy_buffering on`), 위쪽 서버가 보낸 `X-Accel-Buffering: no`로 그 응답만 버퍼링을 끌 수 있다. 하지만 `X-Accel-...` 응답 헤더는 기본으로 다음 단계에 넘기지 않는다(`proxy_hide_header`). 그래서 우리 nginx가 이 헤더를 소비하면 호스트 nginx(서버 앞단, 저장소 밖 설정)는 버퍼링한다. 우리 nginx에 `proxy_pass_header X-Accel-Buffering`을 두어 호스트 nginx까지 전달한다 ([nginx proxy 모듈 문서](https://nginx.org/en/docs/http/ngx_http_proxy_module.html))
- 운영은 `인터넷 → 호스트 nginx(443) → 우리 nginx(server.conf) → frontend:3000 → backend` 순이다. 호스트 nginx 설정은 저장소에 없어서, 병합 뒤 테스트 서버에서 #51-S17과 같은 curl로 한 번 확인한다
- 브라우저는 Spring에 직접 닿지 않고(README 참고), access 토큰은 30분(`JWT_ACCESS_TOKEN_TTL`), 쿠키는 그보다 1분 먼저 만료되며 `proxy.ts`가 access 쿠키 없이 refresh 쿠키만 있는 요청에서 갱신한다
- 구현할 때 확인할 것(버전 소스나 테스트로): `SseEmitter` 비동기 디스패치에서 Spring Security(Spring Boot 4.1.2)가 인증을 유지하는지(#51-S1이 실제 서버로 확인한다), Next 16.4.3의 응답 압축이 `text/event-stream`을 버퍼링하지 않는지(#51-S17이 확인한다. `Cache-Control: no-transform`을 둔다)
