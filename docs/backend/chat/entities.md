# 채팅 엔티티 (#47)

채팅방·참여자·메시지 테이블과 repository. 채팅 전체에서 정한 것과 데이터 구조 요약은 [README.md](README.md)에 있다.

## 한눈에
- 끝나면: Postgres에 채팅방·참여자·메시지 테이블과 repository가 생기고, 방을 `roomKey`로 찾을 수 있다. 참가당 방 하나, 방 안 순번 중복 금지를 DB 제약으로 막는다
- 결정 필요: 없음
- 규모: 4단계

## 1. 채팅방은 참가 한 건에 하나 (#47-R1)
채팅방은 구독 모집 건과 선정된 테스터 한 쌍, 곧 `Register` 한 건마다 하나만 저장된다.

#47-S1 정상 [테스트]
- Given 개발자 A의 프로젝트에 모집 건(`Recruitment`) M이 있고, 테스터 B의 참가 R이 선정(CONFIRMED)되었다
- When  R로 채팅방을 연다
- Then  `chat_rooms`에 1행이 저장되고, 그 방의 모집 건은 M, 참가는 R이다

#47-S2 실패 [테스트]
- Given R로 연 채팅방이 이미 있다
- When  R로 채팅방을 하나 더 저장한다
- Then  `DataIntegrityViolationException`이 난다

## 2. 참여자는 두 명이고 각자 상태를 가진다 (#47-R2)
채팅방을 열면 개발자와 테스터 두 참여자가 `chat_participants`에 따로 저장되고, 참여자마다 바꾼 대화방 이름, 삭제 여부, 마지막으로 읽은 순번을 가진다.

#47-S3 정상 [테스트]
- Given #47-S1처럼 R로 채팅방을 연다
- When  저장한 방을 다시 읽는다
- Then  참여자는 2명이다
- Then  A는 역할 DEVELOPER, B는 역할 TESTER다
- Then  둘 다 바꾼 이름은 null, 삭제 여부는 false, 마지막으로 읽은 순번은 0이다
- Then  방의 마지막 순번(`last_seq`)은 0이다

#47-S4 정상: 이름 변경·삭제는 나에게만 적용된다 [테스트]
- Given R로 연 채팅방이 있고, 두 참여자 모두 이름을 바꾸지 않았고 삭제하지 않았다
- When  개발자 A가 대화방 이름을 "결제 테스트"로 바꾼다
- When  A가 그 방을 삭제하고 저장한다
- Then  다시 읽은 두 참여자의 상태가 아래 표와 같다

| | 바꾼 이름 | 삭제 여부 | 화면에서는(#48·#50) |
|---|---|---|---|
| 개발자 A | "결제 테스트" | true | 내 채팅함에서 방이 사라진다 |
| 테스터 B | null(그대로) | false(그대로) | 원래 이름(프로젝트명)으로 방이 그대로 보인다 |

#47-S8 실패: 한 방에 같은 역할의 참여자는 두 명 저장되지 않는다 [테스트]
- Given R로 연 채팅방에 개발자 A와 테스터 B가 있다
- When  같은 방에 다른 회원 C를 역할 DEVELOPER로 저장한다
- Then  `(room_id, role)` unique 제약(`chat_participants_room_id_role_key`) 위반으로 저장이 거절된다

## 3. 메시지와 순번 (#47-R3)
메시지는 채팅방, 순번, 보낸 참여자, 내용, 보낸 시각으로 저장되고 순번 순서대로 읽을 수 있다. 한 방에서 같은 순번은 두 번 저장되지 않는다.

#47-S5 정상 [테스트]
- Given R로 연 채팅방이 있다
- When  B의 "안녕하세요"를 순번 1로, A의 "반갑습니다"를 순번 2로 저장한다
- Then  그 방의 메시지를 순번 순으로 읽으면 "안녕하세요"(순번 1, 보낸 참여자 B), "반갑습니다"(순번 2, 보낸 참여자 A) 순이다
- Then  두 메시지 모두 보낸 시각이 있다

#47-S6 실패: 같은 방에 같은 순번은 두 번 저장되지 않는다 [테스트]
- Given R로 연 방과 다른 참가 R2로 연 방에 각각 순번 1인 메시지가 저장되어 있다(순번은 방마다 따로 센다)
- When  R의 방에 순번 1로 메시지 "반갑습니다"를 하나 더 저장한다
- Then  `DataIntegrityViolationException`이 난다

## 4. roomKey로 찾기 (#47-R4)
채팅방은 주소에 쓰는, 추측하기 어려운 `roomKey`로 찾을 수 있다.

#47-S7 정상 [테스트]
- Given R과 R2로 채팅방 두 개를 연다
- When  각 방의 `roomKey`를 본다
- Then  둘 다 `[0-9A-Za-z]{22}`에 맞고 서로 다르다
- When  첫 방의 `roomKey`로 찾는다
- Then  첫 방이 나온다
- When  없는 `roomKey` "aaaaaaaaaaaaaaaaaaaaaa"로 찾는다
- Then  빈 결과(`Optional.empty()`)가 나온다

## 범위 밖
- API, 권한 확인, 입력 검증: #48~#53
- 메시지를 보낼 때 방 행을 잠가 순번을 받고, 최근 메시지 일시를 바꾸고, 상대의 삭제를 해제하는 트랜잭션과 동시 전송 확인: #49
- 이름 변경·삭제·읽음 처리가 보내기와 동시에 일어날 때의 확인: #50·#52
- 채팅을 걸 수 있는지 판단(구독·선정 여부): #53. 엔티티는 `Register`를 받기만 한다
- 읽기 전용 여부: 저장하지 않고 #49·#53에서 모집·구독 상태로 계산한다
- 배포 서버 DB에 테이블을 만드는 방법과 ERD에 세 테이블을 더하는 일: [README.md](README.md)의 "아직 정하지 않은 것". 그 전까지 #47은 로컬 테스트로만 확인한다

## 작업 순서
1. 테스트 DB 설정 — 이후 단계의 전제
   - 파일: `backend/src/test/resources/application-test.yml`(`@ActiveProfiles("test")`인 테스트에서만 `ddl-auto: create-drop`), 테스트 데이터 준비 도우미 `backend/src/test/java/com/testmoa/backend/support/ChatFixtures.java`
   - 확인: `./gradlew test`(기존 테스트 통과)
2. 채팅방·참여자와 roomKey — #47-S1, #47-S3, #47-S7
   - 파일: `global/common/ChatRole.java`, `global/util/RoomKeyGenerator.java`, `domain/entity/ChatRoom.java`, `domain/entity/ChatParticipant.java`, `domain/repository/ChatRoomRepository.java`, 테스트 `domain/repository/ChatRoomRepositoryTest.java`
   - 확인: `./gradlew test --tests '*ChatRoomRepositoryTest'`
3. 같은 참가로 두 번째 방 막기, 참여자별 상태, 역할마다 한 명 — #47-S2, #47-S4, #47-S8
   - 파일: `ChatRoom.java`(`register` unique), `ChatParticipant.java`(`rename`, `hide`, `unhide`, `markRead(seq)`, `(room_id, role)` unique), 같은 테스트 파일, `domain/entity/ChatParticipantPersistenceTest.java`(#47-S8. 참여자 생성자가 package-private이라 같은 패키지에서 확인한다)
   - 확인: 같은 명령
4. 메시지와 순번 — #47-S5, #47-S6
   - 파일: `domain/entity/ChatMessage.java`(`(room_id, seq)` unique), `domain/repository/ChatMessageRepository.java`, 테스트 `domain/repository/ChatMessageRepositoryTest.java`
   - 확인: `./gradlew test`

## 브랜치·커밋
- 브랜치: `feature/chat-entity`
- 커밋
  - `Docs: 채팅 백엔드 계획과 #47 엔티티 시나리오 추가 (#47)`
  - `Chore: 백엔드 테스트에서 스키마를 만들도록 테스트 설정 추가 (#47)` — 단계 1
  - `Feat: 채팅방·참여자·메시지 엔티티와 repository 추가 (#47)` — 단계 2~4
  - `Test: 채팅 엔티티 repository 테스트 추가 (#47)` — 단계 2~4

## 가정
- 테이블 이름은 기존 관례(`@Entity(name = "...")`, 복수형)를 따라 `chat_rooms`, `chat_participants`, `chat_messages`로 한다
- 채팅방을 열면 참여자 두 명이 함께 저장된다(cascade). 개발자는 모집 건을 올린 프로젝트의 주인(`register.recruitment.project.user`), 테스터는 `register.user`다. `(room_id, user_id)`와 `(room_id, role)`은 unique다. 그래서 한 방에는 개발자 한 명과 테스터 한 명만 들어간다
- `roomKey`는 `SecureRandom`으로 뽑은 base62 22자(약 131비트)다. 겹칠 확률은 무시할 만하고, 겹쳐도 unique 제약이 막는다
- 순번은 1부터 시작한다. 메시지가 없는 방의 `last_seq`와 아직 읽지 않은 참여자의 `last_read_seq`는 0이다
- 메시지가 없는 방의 최근 메시지 일시는 방을 연 일시다. 채팅함 정렬에 null이 끼지 않게 하기 위해서다
- `(room_id, seq)` unique 제약의 인덱스가 방별 메시지 조회와 커서에 함께 쓰인다
- 메시지 내용 컬럼은 500자(`CHAT_MESSAGE_MAX`), 바꾼 대화방 이름 컬럼은 30자(`CHAT_ROOM_NAME_MAX`)다. 길이 검증 메시지는 #49·#50에서 정한다
- 테스트는 H2를 쓰지 않고 CI처럼 Postgres에 붙인다(`@DataJpaTest` + `@AutoConfigureTestDatabase(replace = NONE)` + `@ActiveProfiles("test")`). 테스트 설정을 `application.yml`이 아닌 `application-test.yml`로 두는 것은, 같은 이름이면 main의 `application.yml`을 통째로 가려 snake_case 이름 규칙이 빠지기 때문이다. 로컬에서는 Postgres를 띄우고 CI와 같은 `SPRING_DATASOURCE_*` 환경 변수로 실행한다
- Postgres는 제약 위반이 난 트랜잭션을 중단시켜 같은 테스트 안에서 다시 조회할 수 없다. 그래서 #47-S2, #47-S6은 예외가 나는 것까지만 확인한다

## 참고
- 지금 엔티티(#91 이후): `Project`(프로젝트, 주인 `user`) 1:N `Recruitment`(모집 건) 1:N `Register`(참가, 테스터 `user`). `Register`는 `APPLIED`로 시작하고 `confirm(...)`으로 `CONFIRMED`가 된다. `Subscription`의 구독 중은 날짜로 판단한다. 서비스·컨트롤러는 `Sample`만 있다([프로젝트·테스터·피드백](../project-tester-feedback.md)) (11-05)
- 채팅방은 프로젝트가 아니라 모집 건(`recruitment_id`)을 가리킨다. 채팅은 모집 건 × 선정된 테스터마다 하나이고, 프로젝트명·이미지는 `recruitment.project`에서 찾는다. 프론트 `ChatRoom.recruitmentSlug` 자리에는 팀 문서대로 `recruitment_id`를 넘긴다(#48) (11-05)
- develop의 백엔드 테스트는 DB 없이 도는 엔티티 단위 테스트(`domain/entity/*Test`)와 `contextLoads`뿐이고, 테스트용 설정(`src/test/resources`)은 없다 (11-05)
- `application.yml`에 `ddl-auto`가 없어 Postgres에서는 Hibernate가 테이블을 만들지 않는다. 스키마 관리 도구도 없다. 서버는 `local` 프로필로 뜨지만 `application-local.yml`은 커밋하지 않는 파일이라, 배포된 DB에는 백엔드 테이블이 없다(`compose.prod.yaml`, `deploy.yml`, `.env.example`, `backend/Dockerfile`에도 스키마 설정이 없다) (11-05)
- CI(`.github/workflows/deploy.yml`의 Backend test)는 postgres:17 서비스를 띄우고 `./gradlew test`를 돌린다 (11-05)
- 컬럼 이름은 `PhysicalNamingStrategySnakeCaseImpl`로 snake_case가 된다 (11-05)
- Spring Boot 4.1.2에서 `@DataJpaTest`는 `org.springframework.boot.data.jpa.test.autoconfigure`, `@AutoConfigureTestDatabase`는 `org.springframework.boot.jdbc.test.autoconfigure`, `TestEntityManager`는 `org.springframework.boot.jpa.test.autoconfigure` 패키지에 있다 (11-05)
