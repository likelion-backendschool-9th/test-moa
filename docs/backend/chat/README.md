# 채팅 백엔드

채팅(#36)의 백엔드 계획. 여러 이슈에 걸친 결정과 데이터 구조는 이 문서에 두고, 기능별 계획은 이 폴더의 `<기능>.md`로 나눈다. 기능 문서는 여기 있는 결정을 복사하지 않고 이 문서를 링크한다.

## 이슈와 문서

| 이슈 | 내용 | 문서 |
|---|---|---|
| [#47](https://github.com/likelion-backendschool-9th/test-moa/issues/47) | 채팅 엔티티 | [entities.md](entities.md) |
| [#49](https://github.com/likelion-backendschool-9th/test-moa/issues/49) | 메시지 조회·보내기 | [messages.md](messages.md) |
| [#48](https://github.com/likelion-backendschool-9th/test-moa/issues/48) | 채팅함 조회 | [inbox.md](inbox.md) |
| [#111](https://github.com/likelion-backendschool-9th/test-moa/issues/111) | 메시지 최대 길이 10,000자로 확대 | [message-length.md](message-length.md) |
| [#50](https://github.com/likelion-backendschool-9th/test-moa/issues/50) | 대화방 이름 변경·삭제 | [rooms.md](rooms.md) |
| [#52](https://github.com/likelion-backendschool-9th/test-moa/issues/52) | 읽음 처리·안 읽은 수·읽음 표시 | [read.md](read.md) |
| [#51](https://github.com/likelion-backendschool-9th/test-moa/issues/51) | 실시간 전송(SSE) | [realtime.md](realtime.md) |
| [#53](https://github.com/likelion-backendschool-9th/test-moa/issues/53) | 채팅 시작 | start.md |
| [#54](https://github.com/likelion-backendschool-9th/test-moa/issues/54) | 화면을 실제 API로 연결 | [채팅함](../../frontend/chat/chats.md), [채팅방](../../frontend/chat/chat-room.md) |
| [#105](https://github.com/likelion-backendschool-9th/test-moa/issues/105) | 채팅방 메시지 검색 | search.md |

진행 순서는 표의 위에서 아래다. 문서는 그 이슈를 시작할 때 만든다. 진행 상태는 이슈와 PR에서 본다.

## 정한 것
- 저장소는 기존 PostgreSQL이다. 채팅은 구조가 고정된 1대1 대화이고 참가·모집 건·회원에 연결되며, 별도 저장소가 필요한 요구나 성능 근거가 없다. 메시지 순서·중복 방지·동시 갱신은 제약 조건과 트랜잭션으로 보장한다 (11-05)
- 삭제한 방에 상대가 새 메시지를 보내면 내 채팅함에 다시 나타난다(#50) (11-04)
- 모집이 끝나거나 구독이 끝난 방은 읽기 전용이다(#53) (11-04)
- 채팅의 모집 종료 기준은 `phaseAt(now)`가 `CLOSED`이거나 `CANCELLED`인 것이다. 방 정보·채팅함은 개발자의 현재 구독을 기준으로 `readOnly`를 반환한다. 읽기 전용은 보내기만 HTTP 403 `CHAT_READ_ONLY`로 막고 조회·읽음·이름 변경·삭제는 허용한다. 취소는 `phaseAt`이 별도 `CANCELLED`를 반환하므로 함께 종료로 본다 ([#53](start.md), 11-08)
- 채팅은 거는 시점에 개발자가 구독 중이고 테스터의 `Register`가 `CONFIRMED`일 때 걸 수 있다. 구독 중은 `start_at <= 지금 < end_at`이고 `CANCELLED`가 아닌 구독이 있는 것이다([결제·구독·크레딧](../payment/entities.md#6-내-구독-45-r6)의 판단)(#53) (11-05)
- 메시지 순서는 방마다 1부터 매기는 순번(`seq`)으로 정한다. 커서(이전 메시지 더 보기, 다시 연결 뒤 채우기), 안 읽은 수(내 `last_read_seq`보다 큰 상대 메시지), 읽음 표시를 모두 순번으로 계산한다 (11-05)
- 메시지 보내기는 한 트랜잭션에서 메시지 저장, 방의 `last_seq`·최근 메시지 일시 갱신, 상대의 삭제 해제를 함께 한다. 같은 방에 동시에 보내도 순번이 빠지거나 겹치지 않게 방 행을 잠그고 순번을 받는다. 방 행을 `PESSIMISTIC_WRITE`로 먼저 잠근 뒤 최신 `last_seq + 1`을 받는다. 상대의 삭제 해제는 `hidden`만 바꾸는 update 쿼리로 처리해 이름·읽은 순번을 덮어쓰지 않는다. 동시 전송은 [#49-S10](messages.md)에서 확인한다 (#49, 11-05)
- 이름 변경·삭제는 참여자를 먼저 확인한 뒤 `hidden = false`인 행의 해당 컬럼만 update 쿼리로 바꾼다. 갱신한 행이 없으면 없는 방과 같은 404다. 삭제해도 바꾼 이름과 읽은 순번은 유지한다 ([#50](rooms.md), 11-08)
- 같은 참여자 행을 두 요청이 동시에 고쳐도 다른 컬럼을 덮어쓰지 않도록 각 작업은 해당 컬럼만 update 쿼리로 갱신한다. 보내기의 삭제 해제는 `hidden`(#49), 이름 변경은 `custom_room_name`, 삭제는 `hidden`(#50), 읽음 처리는 `last_read_seq`(#52)만 바꾼다. HQL update는 `@UpdateTimestamp`를 적용하지 않으므로 쿼리에서 `updated_at`도 명시적으로 갱신한다. 읽음은 `hidden = false and last_read_seq < :seq`인 행만 갱신해 순번이 내려가지 않는다. 1행을 바꿨으면 받은 순번을 그대로 돌려주고, 0행이면 DB 값을 다시 조회한다. 그 사이 방이 삭제되었으면 같은 404로 거절한다 ([#52](read.md), 11-08)
- 삭제는 읽음을 바꾸지 않는다. 지운 방은 채팅함과 헤더의 안 읽은 수에서 제외하지만 `last_read_seq`는 유지한다. 상대가 새 메시지를 보내 방이 다시 나타나면 삭제 전의 안 읽은 메시지도 함께 센다 (#50-S7, [#52-S9](read.md), 11-08)
- 실시간 전송은 SSE로 한다. Spring `SseEmitter`의 스트림을 Next Route Handler가 중계하고, 브라우저는 `EventSource`로 받는다. 보내기는 서버 액션(POST)으로 한다. SSE는 "새 메시지가 왔다", "읽었다"는 알림으로만 쓰고, 다시 연결되면 화면이 보고 있는 방마다 REST로 `after={그 방의 마지막 순번}`을 조회하며 채팅함·헤더는 요약을 다시 받는다(#51) (11-05)
- SSE 연결은 방마다가 아니라 회원마다 하나 연다. 그 연결로 모든 방의 알림을 받아 채팅함과 헤더의 안 읽은 표시도 실시간으로 바꾼다(#51·#52) (11-05)
- 상대가 내 메시지를 읽었는지 보여 주는 읽음 표시를 범위에 넣는다. 상대의 `last_read_seq`가 내 메시지의 `seq` 이상이면 읽음이다. (11-05)
- 참여자의 바꾼 대화방 이름 컬럼 `custom_name`을 `custom_room_name`으로 바꾼다(엔티티 필드는 `customRoomName`). `custom_name`만으로는 무엇의 이름인지 알기 어렵다. 이 컬럼을 실제로 쓰는 #50에서 바꾸고, 배포 DB에 채팅 테이블이 생기기 전이라 옮길 데이터는 없다. ERD에는 먼저 `custom_room_name`으로 넣는다(#50) (11-06)

- SSE 이벤트는 `ready`(`{}`), `message`(`roomKey`, `seq`), `read`(`roomKey`, `reader: me|partner`, `lastReadSeq`) 세 가지다. 메시지 저장·읽음 순번 증가가 커밋된 뒤 방의 두 참여자 모든 연결에 알린다. 삭제한 방도 대상이고, 읽은 순번이 그대로면 알리지 않는다. 이름 변경·삭제는 다른 탭에 알리지 않고 채팅함으로 돌아갈 때 맞춘다 ([#51](realtime.md), 11-08)
- SSE 연결은 30분 뒤 정상 종료하며, 25초마다 주석 하트비트를 보내고 재연결 간격은 3초다. 회원당 최대 5개 연결을 두고 넘으면 가장 오래된 연결을 닫는다. Next는 쿠키 토큰을 붙여 스트림을 중계하며 nginx는 버퍼링하지 않는다. 다시 받은 `ready`를 계기로 `after` 조회로 빠진 메시지를 채운다 ([#51](realtime.md), 11-08)

## 데이터 구조
#47에서 만든 테이블. 자세한 시나리오와 가정은 [entities.md](entities.md)에 있다.

| 테이블 | 한 행이 뜻하는 것 | 주요 컬럼 | 제약 |
|---|---|---|---|
| `chat_rooms` | 참가 한 건(모집 건 × 선정된 테스터)의 대화방 | `room_key`, `recruitment_id`, `register_id`, `last_seq`, `last_message_at` | `room_key` unique, `register_id` unique |
| `chat_participants` | 방에 들어간 회원 한 명(방마다 개발자·테스터 2행) | `room_id`, `user_id`, `role`, `custom_room_name`, `hidden`, `last_read_seq` | `(room_id, user_id)` unique, `(room_id, role)` unique |
| `chat_messages` | 메시지 하나 | `room_id`, `seq`, `sender_id`(참여자), `content`, `sent_at` | `(room_id, seq)` unique |

## 아직 정하지 않은 것
- 백엔드를 여러 대로 늘릴 때 SSE 알림을 서버 사이에 전달하는 방식(Redis pub/sub, PostgreSQL LISTEN/NOTIFY 등). 지금 연결 목록은 백엔드 한 대의 메모리에 있다 ([#51](realtime.md), 11-08)
- 스키마 관리 방식(Flyway 등) 도입: 팀 결정. 테스트 서버는 `ddl-auto: update`(11-05). `update`는 없는 테이블·컬럼을 더하고 있는 컬럼의 타입·길이를 엔티티에 맞추지만, 컬럼을 지우거나 이름을 바꾸지는 않는다. (#111, 11-07)
- ERD(ERDCloud)에 세 테이블을 더하는 일
- 메시지 전송 횟수 제한: 서버에는 없다. 지금은 프론트가 500자로 잘라 보내 영향이 적지만, #54에서 프론트 한도를 10,000자로 올리면 긴 메시지를 반복해 보낼 수 있다. 전송은 방 행을 잠근 트랜잭션 안에서 저장하므로 같은 방 상대의 전송도 그만큼 기다린다. 서비스 전체의 남용 방지 정책과 함께 정한다(#155 리뷰, 11-08)
- 기획이 정하지 않은 것(#36): 채팅방 신고·차단, 사진·파일 보내기, 메시지 수정·삭제, 알림

## 참고
- 외부 요청은 nginx 하나로만 받아 `frontend`로 넘긴다. 브라우저는 Spring에 직접 닿지 않고 Next 서버(BFF)가 백엔드를 부른다 (11-04)
- 프론트의 채팅 데이터 접근은 `frontend/src/features/chat/api.ts`에 모여 있다. 실제 API를 붙일 때 함수 본문만 바꾸고 시그니처는 유지한다(#54) (11-04)
