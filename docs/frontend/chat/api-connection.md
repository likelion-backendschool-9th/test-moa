# 채팅 화면 실제 API 연결 (#54)

채팅함과 채팅방을 #48~#53의 백엔드에 연결한다. 화면의 기존 동작은 [chats.md](chats.md)와 [chat-room.md](chat-room.md)에, API는 [채팅 백엔드](../../backend/chat/README.md)에 있다. PR을 둘로 나눈다. ①은 R1~R5와 R9, ②는 R6~R8이다.

## 한눈에
- 끝나면: `AUTH_MODE=backend`에서 로그인 회원의 채팅함과 채팅방이 실제 데이터로 동작한다. 이전 메시지 더 보기, 보내기(10,000자), 이름 변경·삭제가 저장되고, 끝난 방은 입력창 대신 안내가 보인다. 상대 메시지와 읽음이 새로고침 없이 반영되고, 채팅함 카드와 헤더 "채팅"에 안 읽은 수가 보인다. `AUTH_MODE`가 없으면 지금처럼 목업으로 동작한다
- 결정 필요: 없음 (11-09 답변: PR 둘로 나눔, 목업은 이번에 남김, 채팅 걸기 버튼은 #195)
- 규모: 8단계(PR ① 5단계, PR ② 3단계)

## 1. 채팅함 (#54-R1) — PR ①
로그인 회원의 채팅함이 백엔드 데이터로 보이고 검색·역할 탭·정렬이 서버에서 적용된다.

#54-S1 정상 [직접]
- Given `AUTH_MODE=backend`이고 A의 방이 2개 있다
- When  A가 `/my/chats`를 연다
- Then  카드 2개에 대화방 이름, 상대 닉네임과 역할, 최근 메시지, 일시가 응답대로 보인다

#54-S2 검색 조건 전달 [테스트: unit]
- When  `{q: "북로그", role: "tester", sort: "oldest"}`를 경로로 바꾼다
- Then  `/api/v1/chats?q=%EB%B6%81%EB%A1%9C%EA%B7%B8&role=TESTER&sort=OLDEST`이다
- When  `{q: "", role: null, sort: "latest"}`를 바꾼다
- Then  `/api/v1/chats?sort=LATEST`이다

#54-S3 응답 변환 [테스트: unit]
- Given 응답 방이 `myRole: "DEVELOPER"`, `partner.role: "TESTER"`, `roomName: null`, `projectImage: null`이다
- Then  `myRole`은 "developer", `partner.role`은 "tester"이고 `roomName`·`projectImage`는 `undefined`다
- Then  `recruitmentSlug`는 null이다

#54-S4 메시지가 없는 방 [테스트: unit]
- Given 응답 방의 `lastMessage`가 null이다
- Then  변환한 `lastMessage`는 null이고, 카드 미리보기는 "아직 대화가 없어요"다

#54-S5 시각 표시 [직접]
- Given #193이 적용된 백엔드라 `sentAt`·`lastMessageAt`이 오프셋을 포함한다(`2026-11-09T01:00:00Z`)
- When  브라우저에서 채팅함과 채팅방을 연다
- Then  말풍선 시각은 "오전 10:00"이고, 새로고침 뒤 서버 렌더링 값과 같다

#54-S6 실패 [직접]
- Given 토큰이 없다
- When  `/my/chats`를 연다
- Then  `/login?next=%2Fmy%2Fchats`로 간다
- Given 백엔드가 꺼져 있다
- Then  오류 화면이 보이고, 빈 채팅함으로 보이지 않는다

## 2. 채팅방 조회 (#54-R2) — PR ①
최근 메시지 30개가 보이고, 위로 올리면 이전 메시지를 이어 받는다.

#54-S7 정상 [직접]
- Given 메시지 35개가 있는 방이다
- When  방을 연다
- Then  순번 6~35가 오래된 것부터 보이고 내 메시지는 오른쪽, 상대 메시지는 왼쪽이다

#54-S8 이전 메시지 [직접]
- When  S7의 방에서 맨 위까지 올린다
- Then  `GET /api/chats/{roomKey}/messages?before=6`으로 순번 1~5가 위에 붙는다
- Then  보던 메시지의 화면 위치가 움직이지 않는다
- Then  `hasMore`가 false라 더 요청하지 않는다
- Given 요청이 실패한다
- Then  맨 위에 "이전 메시지를 불러오지 못했어요."와 "다시 시도"가 보인다

#54-S9 들어갈 수 없는 방 [직접]
- Given 없는 방, 내가 지운 방, 내가 참여자가 아닌 방이다
- When  주소로 연다
- Then  지금의 없는 방 안내가 보인다

#54-S28 열어 둔 사이 쌓인 메시지 [테스트: unit]
- Given 화면에 순번 6~35가 있다
- When  서버가 47~76을 준다
- Then  대화 중간이 비지 않도록 목록을 47~76으로 바꾼다
- When  서버가 7~36을 준다
- Then  기존 목록에 순번 6이 있어 합친다

## 3. 보내기 (#54-R3) — PR ①
보낸 메시지가 저장되고 내 말풍선으로 붙는다. 최대 글자 수는 서버와 같은 10,000자다.

#54-S10 정상 [직접]
- When  "안녕하세요"를 쓰고 Enter를 누른다
- Then  "보내는 중" 말풍선이 저장된 말풍선으로 바뀌고, 새로고침해도 남는다
- Then  채팅함 카드의 미리보기와 일시가 바뀌고 맨 위로 온다

#54-S11 최대 글자 수 [테스트: chat-room.spec.ts S150] (S150 고침 #54: 10,000자)
- Then  입력창의 `maxlength`는 10000이다

#54-S12 실패 [직접]
- Given 백엔드가 꺼져 있다
- When  보낸다
- Then  글이 입력창에 돌아오고 "보내지 못했어요. 다시 보내 주세요."가 보인다

## 4. 이름 변경·삭제 (#54-R4) — PR ①
이름 변경과 삭제가 서버에 저장되고 내 화면에만 적용된다.

#54-S13 정상 [직접]
- When  채팅방에서 이름을 "북로그 1차"로 바꾼다
- Then  머리와 채팅함 카드의 이름이 바뀌고 새로고침해도 남는다
- Then  상대의 이름은 그대로다
- When  채팅함에서 그 방을 삭제한다
- Then  내 채팅함에서 빠지고, 상대 채팅함에는 남는다

## 5. 읽기 전용 (#54-R5) — PR ①
`readOnly` 방은 입력창 대신 안내를 보여 주고, 지난 대화와 이름 변경·삭제는 그대로 쓴다.

#54-S14 표시 [직접]
- Given 피드백 마감이 지난 방이다
- When  방을 연다
- Then  입력창 대신 "대화가 끝난 방이에요. 지난 대화는 계속 볼 수 있어요."가 보이고 지난 메시지는 보인다
- Then  채팅함 카드에 "종료" 배지가 보인다

#54-S15 보내는 중에 끝남 [직접]
- Given 방을 연 뒤 개발자 구독이 끝났다
- When  메시지를 보낸다
- Then  서버가 403 `CHAT_READ_ONLY`를 주고, 보내는 중 말풍선이 사라지며 입력창이 안내로 바뀐다

## 6. 실시간 (#54-R6) — PR ②
로그인 일반 회원의 탭마다 SSE 연결 하나로, 열어 둔 방과 채팅함이 새로고침 없이 맞춰진다.

#54-S16 연결 [직접]
- Given 일반 회원이다
- When  어느 페이지든 연다
- Then  `/api/chats/events` 연결이 탭마다 하나다
- Given 운영자나 비로그인이다
- Then  연결하지 않는다

#54-S17 상대 메시지 [직접]
- Given A와 B가 같은 방을 열어 두었다
- When  B가 메시지를 보낸다
- Then  A가 맨 아래 근처에 있으면 말풍선이 붙고 최근 메시지로 스크롤된다. 높이가 200px를 넘는 긴 메시지도 같다. (고침 11-09: 지난 대화를 읽는 중에는 스크롤하지 않음)

#54-S29 지난 대화를 읽는 중 [테스트: unit]
- Given 새 메시지가 붙기 전 입력창 끝이 화면 아래에서 200px보다 멀다
- When  상대가 메시지를 보낸다
- Then  말풍선은 붙지만 스크롤 위치는 그대로다
- When  내가 메시지를 보낸다
- Then  최근 메시지로 스크롤된다

#54-S18 중복 없음 [테스트: unit]
- Given 순번 1~3이 있고 보내기 응답으로 4가 붙었다
- When  `after=3` 응답으로 3·4·5가 온다
- Then  목록은 1~5이고 순번 순이다

#54-S19 다른 탭과 재연결 [직접]
- When  같은 회원의 다른 탭에서 메시지를 보낸다
- Then  이 탭에도 붙는다
- When  서버를 재시작해 연결이 끊긴 사이 상대가 보내고 다시 연결된다
- Then  `ready`를 받아 빠진 메시지가 채워진다
- When  서버가 내려가 `/api/chats/events`가 503을 돌려주는 사이 상대가 보내고 서버가 복구된다
- Then  최대 30초 안에 다시 연결되어 빠진 메시지가 채워진다

#54-S20 채팅함 [직접]
- Given A가 채팅함을 열어 두었다
- When  B가 보낸다
- Then  카드의 미리보기·일시·순서가 새로고침 없이 바뀐다

#54-S33 채팅함 갱신 범위 [테스트: unit]
- When  상대가 읽었다는 read 이벤트가 온다
- Then  새로고침하지 않는다
- When  message, 내가 읽은 read, ready 이벤트가 온다
- Then  새로고침한다

## 7. 안 읽은 표시 (#54-R7) — PR ②
채팅함 카드와 헤더 "채팅"에 안 읽은 수가 보인다.

#54-S21 카드 [직접]
- Given 안 읽은 상대 메시지가 3개인 방이다
- Then  미리보기 줄 끝에 초록 알약 3이 보이고 미리보기는 먹색이다
- Then  스크린리더에는 "안 읽은 메시지 3개"로 읽힌다
- Then  일시는 오늘 온 대화여도 흐린 먹색이고 점이 없다 (S136 고침 #54)
- Given 0개다
- Then  표시가 없다

#54-S22 헤더 [직접]
- Given 지우지 않은 방의 안 읽은 메시지가 합해서 120개다
- Then  헤더와 모바일 메뉴의 "채팅"에 초록 알약 "99+"가 보인다

#54-S30 안 읽은 수 조회 실패 [직접]
- Given 로그인 회원이고 `GET /api/v1/chats/unread`가 실패한다
- When  아무 페이지나 연다
- Then  페이지는 정상이고 "채팅"에 수가 없다
- When  페이지를 열어 둔 사이 조회가 실패한다
- Then  표시 중인 수가 그대로다

#54-S23 실시간 갱신 [직접]
- When  다른 페이지를 보는 동안 상대가 보낸다
- Then  헤더 수가 1 오른다

## 8. 읽음 처리와 읽음 표시 (#54-R8) — PR ②
보이는 방의 마지막 상대 메시지까지 읽음 처리하고, 상대가 아직 안 읽은 내 메시지를 표시한다.

#54-S24 읽음 처리 [직접]
- Given 안 읽은 메시지가 3개이고 마지막 순번이 7이다
- When  방을 연다
- Then  `POST /api/v1/chats/{roomKey}/read`에 `{"seq": 7}`이 가고 헤더 수가 3 줄어든다

#54-S25 보고 있을 때만 [직접]
- Given 방이 다른 탭 뒤에 가려져 있다(`document.visibilityState`가 `hidden`)
- When  상대가 보낸다
- Then  읽음 처리하지 않는다
- When  그 탭으로 돌아온다
- Then  마지막 순번까지 읽음 처리한다

#54-S31 재시도 간격 [테스트: unit]
- Given 새 메시지 조회나 읽음 처리가 503으로 이어서 실패한다
- Then  다시 시도하는 간격은 1, 2, 4, 8, 16, 30, 30초다

#54-S32 읽음 처리의 인증·404 실패 [테스트: unit]
- Given 읽음 처리가 401 또는 404로 실패한다
- Then  다시 시도하지 않는다
- Given 503으로 실패한다
- Then  다시 시도한다

#54-S26 안 읽음 표시 [직접] (고침 11-09: 읽음 대신 안 읽음을 표시하기로 함)
- Given 내 메시지 순번 5, 6이 있고 `partnerLastReadSeq`가 5다
- Then  순번 6에만 시각 위에 초록 "1"이 붙고, 5에는 없다
- Then  스크린리더에는 "안 읽음"으로 읽힌다
- When  상대가 6까지 읽는다
- Then  새로고침 없이 6의 "1"이 사라진다

## 9. 목업 유지 (#54-R9) — PR ①
`AUTH_MODE`가 없으면 지금 동작이 그대로다.

#54-S27 [테스트: chats.spec.ts, chat-room.spec.ts, pages.spec.ts]
- Given `AUTH_MODE`가 없다
- Then  기존 E2E가 통과한다
- Then  `/api/chats/events`에 연결하지 않고, 안 읽은 표시와 읽음 표시는 없다 (고침 11-09: 재연결이 생겨 목업은 연결 자체를 하지 않음)

## 범위 밖
- 채팅 걸기 버튼: #195 (이슈 시나리오 6)
- 목업과 `demo-chat*` 쿠키 삭제(이슈 시나리오 7): #195 완료와 테스트 서버의 백엔드 모드 전환 뒤. `demo/chat.ts`는 `features/chat/api.ts`만 쓰므로 혼자 지울 수 있다 (11-09 사용자 결정)
- 채팅방의 "모집 글" 링크 복구: 공개 모집 화면 연결(#188) 뒤
- 프론트 구조 변경: #197. 이 계획은 지금 구조를 따른다
- 메시지 검색: #105

## 작업 순서

### PR ①
1. 변환과 시그니처 — #54-S2~S4
   - 파일: `features/chat/types.ts`(`CHAT_MESSAGE_MAX = 10_000`, `ChatRoom`에 `readOnly`, `lastMessage: string | null`, `recruitmentSlug: string | null`, `ChatMessage`에 `seq: number`, `ChatRoomData`에 `hasMore`), `features/chat/backend-map.ts`(새로, 순수 함수 `toChatInboxPath`·`toChatRoom`·`toChatMessage`), `tests/unit/chat-backend-map.test.ts`(새로), `demo/chat.ts`(새 필드 기본값, 목업 저장은 500자 유지)
   - 확인: `npm run test:unit -- tests/unit/chat-backend-map.test.ts`
2. 조회 연결 — #54-S1, S6, S7, S9
   - 파일: `features/chat/api.ts`(`getChatInbox`·`getChatRoom`·`getChatRoomTitle` 맨 위에 `if (isBackendAuth)`. 401은 로그인으로, 404는 `notFound()`, 그 밖의 실패는 throw), `ChatCard.tsx`, `ChatRoomHeader.tsx`(`recruitmentSlug`가 null이면 링크를 그리지 않는다)
   - 확인: `npx tsc --noEmit`, `npm run lint`
3. 이전 메시지 — #54-S8, S28
   - 파일: `features/chat/api.ts`(`getChatMessages(roomKey, {before, after})`), `app/api/chats/[roomKey]/messages/route.ts`(새로, 목업 모드 404), `[roomKey]/_components/ChatConversation/ChatConversation.tsx`·`hook.ts`(새로, "use client", 메시지 상태를 순번으로 합친다. 목록과 입력창을 감싼다), `ChatRoomView.tsx`
   - 확인: `npx tsc --noEmit`, `npm run lint`
4. 보내기·이름 변경·삭제·읽기 전용 — #54-S10~S15
   - 파일: `features/chat/api.ts`(`sendChatMessage`는 저장된 메시지를 돌려준다. 실패는 throw, `CHAT_READ_ONLY`는 `{readOnly: true}`), `features/chat/actions.ts`(백엔드 성공 뒤 채팅함에 `revalidatePath`), `ChatComposer.tsx`(`readOnly`면 안내, 저장된 메시지를 상위로 넘긴다), `ChatCard.tsx`("종료" 배지), [chat-room.md](chat-room.md) S150에 `(고침 #54: 10,000자)`
   - 확인: `npm run lint`, `npm run build`, `npm run test:e2e -- e2e/chats.spec.ts e2e/chat-room.spec.ts e2e/pages.spec.ts`
5. 백엔드 모드 직접 확인 — #54-S1, S6~S10, S12~S15, S27
   - 프론트를 `AUTH_MODE=backend`로, 같은 시점의 백엔드와 PostgreSQL을 띄워 브라우저로 확인한다

### PR ② (PR ① 병합 뒤)
6. 안 읽은 표시 — #54-S21, S22, S30
   - 파일: `features/chat/api.ts`(`getChatUnreadCount`), `features/chat/types.ts`(`unreadCount`, `partnerLastReadSeq`), `ChatCard.tsx`, `app/_components/NavList`·`MobileMenu`(`badge`), `app/_lib/nav.ts`
   - 문서·테스트: [chats.md](chats.md) S136과 강조색 설명, `DESIGN.md`의 채팅 카드와 The One Green Rule(오늘 온 대화 삭제, 내 메시지의 안 읽음 표시 예외 추가), `e2e/chat-room.spec.ts`의 `data-today` 검사
   - 확인: `npm run lint`, `npm run test:e2e -- e2e/chats.spec.ts e2e/chat-room.spec.ts`
7. SSE 연결과 실시간 — #54-S16~S20, S23, S29, S33
   - 파일: `app/_components/ChatEvents/ChatEvents.tsx`·`hook.ts`(새로, "use client", `EventSource` 하나와 구독 함수. 루트 레이아웃에서 일반 회원에게만 그린다), `ChatConversation/hook.ts`(`message`·`ready`에 `after` 조회), `ChatInbox` 쪽에 이벤트 시 `router.refresh()`(300ms 안의 이벤트는 한 번으로 묶는다), `tests/unit/chat-merge.test.ts`(새로)
   - 확인: `npm run test:unit -- tests/unit/chat-merge.test.ts`, `npm run build`
8. 읽음 처리와 안 읽음 표시 — #54-S24~S26, S5, S31, S32, 직접 확인
   - 파일: `features/chat/api.ts`·`actions.ts`(`markChatRead`), `ChatConversation/hook.ts`, `ChatMessageList.tsx`, [chats.md](chats.md)·[chat-room.md](chat-room.md) 범위 밖의 안 읽은 수·읽음 표시 줄에 `(고침 #54: 범위에 넣음)`
   - 확인: `npm run build`, 백엔드 모드에서 두 브라우저로 #54-S16~S26

## 가정
- 목업은 이번에 남긴다. #186이 뒤따를 화면 연결의 기준으로 `isBackendAuth` 분기를 쓰고, 화면에서 방을 만드는 #195 전에는 목업을 지우면 테스트 서버 채팅이 비거나 동작하지 않는다
- 응답 시각의 시간대는 #193이 맡는다. 프론트는 시각 문자열을 가공하지 않고 그대로 쓴다. #193 전의 백엔드로는 브라우저 시각이 9시간 어긋나므로, #54-S5는 #193이 병합된 뒤에 확인한다
- 이전·이후 메시지 조회는 Route Handler로 한다. Server Function은 변경용이고 클라이언트가 한 번에 하나씩 보내므로(`01-getting-started/07-mutating-data.md:207`), 조회에 쓰면 보내기와 서로 기다린다
- 채팅함은 이벤트가 오면 `router.refresh()`로 서버 데이터를 다시 그린다. 채팅방은 이전 메시지를 들고 있어야 하므로 클라이언트 상태로 둔다
- "모집 글" 링크는 공개 모집 화면이 아직 목업이라 `recruitmentId`로 이어도 404다. 백엔드 모드에서는 그리지 않는다
- 말풍선의 안 읽음 표시는 초록 숫자 1이고, 메시지마다 반복되는 정보에 강조색을 쓰는 예외다(11-09 사용자 결정). 1대1이라 숫자는 늘 1이다
- 첫 메시지가 없는 새 방은 카드 정렬에 방을 연 일시를 쓴다(백엔드 그대로)
- 내가 보낸 메시지는 안 읽은 수에 들어가지 않는다(#52). 헤더 수는 프론트에서 계산하지 않고 `GET /api/v1/chats/unread`와 이벤트로 맞춘다
- 읽음 처리는 화면에 그린 마지막 순번을 보낸다(#52). 내 메시지만 있는 방도 마지막 순번을 보낸다
- 이름 변경 30자, 빈 이름 처리는 지금 프론트 동작(잘라서 보내기, 빈 이름 무시)을 유지한다
- 백엔드 연결 동작은 #186과 같이 `[직접]`으로 확인한다. E2E는 백엔드 없이 돌기 때문이다

## 참고 (2026-11-09 확인)
- `/api/chats/events`는 목업 모드에서 204를 준다. `EventSource`는 204를 받으면 다시 연결하지 않는다(HTML 표준)
- `proxy.ts`의 matcher는 `/api` 경로도 포함해서, `/api/chats/*` 요청에서도 access 토큰을 갱신한다
- 백엔드 응답: 방 `{roomKey, recruitmentId, projectName, roomName, projectImage, myRole, partner: {nickname, role}, partnerLastReadSeq, readOnly}`, 채팅함 방은 여기에 `lastMessage`, `lastMessageAt`, `unreadCount`를 더하고 `partnerLastReadSeq`는 없다. 메시지 `{seq, from: "me"|"partner", text, sentAt}`, 조회 `{messages, hasMore}`
- 역할과 정렬은 대문자 enum이다(`DEVELOPER`·`TESTER`, `LATEST`·`OLDEST`)
- SSE 이벤트: `ready`, `message {roomKey, seq}`, `read {roomKey, reader, lastReadSeq}`([realtime.md](../../backend/chat/realtime.md))
