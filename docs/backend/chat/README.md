# 채팅 백엔드

채팅(#36)의 백엔드 계획. 여러 이슈에 걸친 결정과 데이터 구조는 이 문서에 두고, 기능별 계획은 이 폴더의 `<기능>.md`로 나눈다. 기능 문서는 여기 있는 결정을 복사하지 않고 이 문서를 링크한다.

## 이슈와 문서

| 이슈 | 내용 | 문서 |
|---|---|---|
| [#47](https://github.com/likelion-backendschool-9th/test-moa/issues/47) | 채팅 엔티티 | [entities.md](entities.md) |
| [#49](https://github.com/likelion-backendschool-9th/test-moa/issues/49) | 메시지 조회·보내기 | [messages.md](messages.md) |
| [#48](https://github.com/likelion-backendschool-9th/test-moa/issues/48) | 채팅함 조회 | inbox.md |
| [#50](https://github.com/likelion-backendschool-9th/test-moa/issues/50) | 대화방 이름 변경·삭제 | rooms.md |
| [#52](https://github.com/likelion-backendschool-9th/test-moa/issues/52) | 읽음 처리·안 읽은 수·읽음 표시 | read.md |
| [#51](https://github.com/likelion-backendschool-9th/test-moa/issues/51) | 실시간 전송(SSE) | realtime.md |
| [#53](https://github.com/likelion-backendschool-9th/test-moa/issues/53) | 채팅 시작 | start.md |
| [#54](https://github.com/likelion-backendschool-9th/test-moa/issues/54) | 화면을 실제 API로 연결 | [채팅함](../../frontend/chat/chats.md), [채팅방](../../frontend/chat/chat-room.md) |

진행 순서는 표의 위에서 아래다. 문서는 그 이슈를 시작할 때 만든다. 진행 상태는 이슈와 PR에서 본다.

## 정한 것
- 저장소는 기존 PostgreSQL이다. 채팅은 구조가 고정된 1대1 대화이고 참가·모집 건·회원에 연결되며, 별도 저장소가 필요한 요구나 성능 근거가 없다. 메시지 순서·중복 방지·동시 갱신은 제약 조건과 트랜잭션으로 보장한다 (11-05)
- 삭제한 방에 상대가 새 메시지를 보내면 내 채팅함에 다시 나타난다(#50) (11-04)
- 모집이 끝나거나 구독이 끝난 방은 읽기 전용이다(#53) (11-04)
- 채팅은 거는 시점에 개발자가 구독 중이고 테스터의 `Register`가 `CONFIRMED`일 때 걸 수 있다. 구독 중은 `start_at <= 지금 < end_at`이고 `CANCELLED`가 아닌 구독이 있는 것이다([결제·구독·크레딧](../payment/entities.md#6-내-구독-45-r6)의 판단)(#53) (11-05)
- 메시지 순서는 방마다 1부터 매기는 순번(`seq`)으로 정한다. 커서(이전 메시지 더 보기, 다시 연결 뒤 채우기), 안 읽은 수(내 `last_read_seq`보다 큰 상대 메시지), 읽음 표시를 모두 순번으로 계산한다 (11-05)
- 메시지 보내기는 한 트랜잭션에서 메시지 저장, 방의 `last_seq`·최근 메시지 일시 갱신, 상대의 삭제 해제를 함께 한다. 같은 방에 동시에 보내도 순번이 빠지거나 겹치지 않게 방 행을 잠그고 순번을 받는다. 방 행을 `PESSIMISTIC_WRITE`로 먼저 잠근 뒤 최신 `last_seq + 1`을 받는다. 상대의 삭제 해제는 `hidden`만 바꾸는 update 쿼리로 처리해 이름·읽은 순번을 덮어쓰지 않는다. 동시 전송은 [#49-S10](messages.md)에서 확인한다 (#49, 11-05)
- 실시간 전송은 SSE로 한다. Spring `SseEmitter`의 스트림을 Next Route Handler가 중계하고, 브라우저는 `EventSource`로 받는다. 보내기는 서버 액션(POST)으로 한다. SSE는 "새 메시지가 왔다", "읽었다"는 알림으로만 쓰고, 다시 연결되면 화면이 보고 있는 방마다 REST로 `after={그 방의 마지막 순번}`을 조회하며 채팅함·헤더는 요약을 다시 받는다(#51) (11-05)
- SSE 연결은 방마다가 아니라 회원마다 하나 연다. 그 연결로 모든 방의 알림을 받아 채팅함과 헤더의 안 읽은 표시도 실시간으로 바꾼다(#51·#52) (11-05)
- 상대가 내 메시지를 읽었는지 보여 주는 읽음 표시를 범위에 넣는다. 상대의 `last_read_seq`가 내 메시지의 `seq` 이상이면 읽음이다. #52 이슈의 "범위 밖" 문구는 고쳐야 한다(이슈 수정은 따로 허가를 받는다) (11-05)

## 데이터 구조
#47에서 만든 테이블. 자세한 시나리오와 가정은 [entities.md](entities.md)에 있다.

| 테이블 | 한 행이 뜻하는 것 | 주요 컬럼 | 제약 |
|---|---|---|---|
| `chat_rooms` | 참가 한 건(모집 건 × 선정된 테스터)의 대화방 | `room_key`, `recruitment_id`, `register_id`, `last_seq`, `last_message_at` | `room_key` unique, `register_id` unique |
| `chat_participants` | 방에 들어간 회원 한 명(방마다 개발자·테스터 2행) | `room_id`, `user_id`, `role`, `custom_name`, `hidden`, `last_read_seq` | `(room_id, user_id)` unique, `(room_id, role)` unique |
| `chat_messages` | 메시지 하나 | `room_id`, `seq`, `sender_id`(참여자), `content`, `sent_at` | `(room_id, seq)` unique |

## 아직 정하지 않은 것
- 배포 서버 DB에 테이블을 만드는 방법(`ddl-auto: update`, Flyway 등): 11-06 팀 회의에서 정한다. 지금은 `ddl-auto`도 마이그레이션 도구도 없어서 배포된 DB에는 백엔드 테이블이 없다. 그 전까지 채팅은 로컬 테스트로만 확인한다
- ERD(ERDCloud)에 세 테이블을 더하는 일
- 같은 참여자 행을 두 요청이 동시에 고칠 때 바꾸지 않은 컬럼을 덮어쓰지 않게 할 방법: 보내기는 `hidden`만 바꾸는 update 쿼리로 정했다(#49). 이름 변경·삭제(#50), 읽음 처리(#52)의 갱신 방식은 각 이슈에서 정한다
- 기획이 정하지 않은 것(#36): 채팅방 신고·차단, 사진·파일 보내기, 메시지 수정·삭제, 알림

## 참고
- 외부 요청은 nginx 하나로만 받아 `frontend`로 넘긴다. 브라우저는 Spring에 직접 닿지 않고 Next 서버(BFF)가 백엔드를 부른다 (11-04)
- 프론트의 채팅 데이터 접근은 `frontend/src/features/chat/api.ts`에 모여 있다. 실제 API를 붙일 때 함수 본문만 바꾸고 시그니처는 유지한다(#54) (11-04)
