# 모집 관리 화면의 채팅 걸기 (#195)

구독 개발자가 모집 관리 화면에서 확정된 테스터와의 채팅방으로 바로 간다. 채팅을 거는 API는 [#53](../../backend/chat/start.md), 채팅 화면 연결은 [api-connection.md](api-connection.md), 지금 버튼의 동작은 [projects.md](../project/projects.md)의 #62-S23, #62-S24, #134-S3, #134-S7에 있다. PR을 둘로 나눈다. ①은 피드백 응답의 참가 id이고 다른 이슈를 기다리지 않는다. ②는 화면 연결이고 #190(모집 관리 화면의 실제 API 연결) 병합 뒤에 한다.

## 한눈에
- 끝나면: `AUTH_MODE=backend`에서 지원자 목록의 "채팅", 피드백 카드의 "채팅하기", AI 질문 대화상자의 "채팅으로 물어보러 가기"가 그 테스터와의 채팅방을 열고 그 방으로 이동한다. 방이 있으면 그 방으로 가고, 지운 방은 다시 열린다. 방을 만들 수 없으면 이유를 안내하고 그 화면에 머문다. 목업 모드의 동작은 그대로다
- 결정 필요: 없음
- 규모: 5단계

## 1. 피드백 응답의 참가 id (#195-R1)
개발자용 피드백 목록의 건마다 그 피드백을 낸 참가의 `registerId`를 준다.

#195-S1 정상 [테스트]
- Given #175-S10의 모집 건과 참가, 그 참가의 피드백 2건과 다른 테스터의 참가·피드백 1건
- When  개발자가 `GET /api/v1/developer/recruitments/{id}/feedbacks`를 부른다
- Then  응답 순서와 무관하게 피드백 내용으로 각 건을 찾으면 `registerId`가 그 피드백을 낸 참가의 id다

## 2. 채팅방으로 이동 (#195-R2)
세 버튼은 `POST /api/v1/chats`로 그 참가의 방을 열고 `/my/chats/{roomKey}`로 이동한다.

#195-S2 정상: 지원자 목록 [직접]
- Given `AUTH_MODE=backend`, 구독 중인 개발자 A의 구독 모집 건, 확정된 테스터 "윤슬", 아직 방이 없다
- When  A가 테스터 관리 탭에서 "윤슬님과 채팅"을 누른다
- Then  `/my/chats/{roomKey}`로 이동하고 상대가 "윤슬"이며 메시지가 없다
- When  A가 `/my/chats`를 연다
- Then  그 방이 목록에 있다

#195-S3 정상: 피드백 카드 [직접]
- Given #195-S2의 조건에서 "윤슬"의 피드백이 있다
- When  A가 피드백 탭에서 "윤슬님과 채팅하기"를 누른다
- Then  "윤슬"과의 채팅방으로 이동한다

#195-S4 정상: AI 질문 대화상자 [직접]
- Given 피드백 카드에서 AI 질문 대화상자를 열었다
- When  "채팅으로 물어보러 가기"를 누른다
- Then  그 피드백을 쓴 테스터와의 채팅방으로 이동한다

#195-S5 정상: 이미 있는 방 [직접]
- Given "윤슬"과의 방에 메시지 2개가 있다
- When  A가 세 버튼 중 하나를 누른다
- Then  같은 `roomKey`의 방으로 이동하고 메시지 2개가 그대로다

#195-S6 정상: 내가 지운 방 [직접]
- Given A가 "윤슬"과의 방을 지웠다
- When  A가 "윤슬님과 채팅"을 누른다
- Then  그 방으로 이동하고, `/my/chats`에 그 방이 다시 있다

#195-S7 경계: 연속으로 누른다 [직접]
- When  A가 "윤슬님과 채팅"을 빠르게 두 번 누른다
- Then  처리 중에는 버튼이 비활성이고 방은 하나만 생긴다

## 3. 방을 만들 수 없을 때 (#195-R3)
방을 만들 수 없으면 이유를 안내하고 그 화면에 머문다. 지원자 목록은 목록 위 오류 줄에, 피드백 카드는 그 카드의 안내 줄에, 대화상자는 대화상자 안의 안내 줄에 보이고 스크린 리더로 읽힌다.

#195-S8 문구 변환 [테스트: unit]
- When  백엔드 실패를 안내 문구로 바꾼다
- Then  `SUBSCRIPTION_REQUIRED`는 "구독 중일 때만 새 채팅을 시작할 수 있어요"다
- Then  `CHAT_READ_ONLY`는 "모집이 끝나 새 채팅을 시작할 수 없어요"다
- Then  `INVALID_INPUT`은 "확정된 테스터와만 채팅할 수 있어요"다
- Then  `NOT_FOUND`는 "테스터 정보를 찾지 못했어요. 새로고침해 주세요"다
- Then  `BACKEND_UNAVAILABLE`과 그 밖의 코드는 "채팅을 시작하지 못했어요. 잠시 후 다시 시도해 주세요"다

#195-S9 실패: 구독이 끝났다 [직접]
- Given A의 구독이 끝났고 "윤슬"과의 방이 없다
- When  A가 "윤슬님과 채팅"을 누른다
- Then  주소가 그대로이고 "구독 중일 때만 새 채팅을 시작할 수 있어요"가 보인다

#195-S10 실패: 모집이 끝났다 [직접]
- Given 피드백 마감이 지났고 "윤슬"과의 방이 없다
- When  A가 피드백 카드의 "채팅하기"를 누른다
- Then  주소가 그대로이고 그 카드에 "모집이 끝나 새 채팅을 시작할 수 없어요"가 보인다

#195-S11 정상: 끝났어도 있던 방은 열린다 [테스트: ChatStartControllerTest #53-S2]
- Given 구독이 끝났고 "윤슬"과의 방이 있다
- When  같은 참가로 `POST /api/v1/chats`를 부른다
- Then  HTTP 200이고 그 방의 `roomKey`다

#195-S12 실패: 로그인이 끝났다 [직접]
- Given 토큰이 만료되어 갱신할 수 없다
- When  A가 버튼을 누른다
- Then  `/login?next=<모집 관리 주소>`로 이동한다

## 4. 목업 모드는 그대로 (#195-R4)
`AUTH_MODE`가 없으면 `registerId`가 없어서 지금 동작을 유지한다.

#195-S13 정상 [직접]
- Given `AUTH_MODE`가 없다
- When  개발자가 구독 모집의 "윤슬님과 채팅"을 누른다
- Then  `/my/chats?q=윤슬`로 간다
- When  "채팅하기"와 "채팅으로 물어보러 가기"를 누른다
- Then  "채팅방 연결은 준비 중이에요"가 보인다

## 범위 밖
- 모집 관리 화면의 실제 데이터 연결: #190
- 목업과 `demo-chat*` 쿠키 삭제: [api-connection.md](api-connection.md)의 범위 밖 그대로, 이 이슈 완료 뒤 별도로 한다
- 무료 모집의 구독 안내(`PaidAction`), 확정되지 않은 테스터에게 버튼을 숨기는 조건: 지금 그대로다
- 테스터가 채팅을 거는 기능: 개발자만 건다(#53)
- 프론트 구조 변경: #197. 이 계획은 지금 구조를 따른다

## 모듈 배치

| 코드 | 위치 | 이유 |
| --- | --- | --- |
| `startChat(registerId, nextPath)` | `features/chat/api.ts` | 채팅 데이터 접근은 이 파일에 모은다 |
| `toChatStartFailureMessage(code)` | `features/chat/backend-map.ts` | 순수 함수라 unit 테스트한다 |
| `startChatAction(registerId, nextPath)` | `features/chat/actions.ts` | `actions.ts`는 다른 도메인을 import하지 못한다(`eslint-boundaries.mjs`) |
| `useStartChat(recruitmentKey)` | `app/(site)/developer/recruitments/[recruitmentKey]/_lib/use-start-chat.ts` | 이 구역의 세 컴포넌트만 쓴다 |

의존 방향은 `app` → `features/chat`이다. `features/chat`은 `features/recruitment`를 import하지 않고, `features/recruitment`도 `features/chat`을 import하지 않는다. 모집 관리 주소는 화면 쪽 훅이 `recruitmentManagePath`로 만들어 넘긴다.

## 작업 순서

1. 피드백 응답 — #195-S1
   - 파일: `backend/src/main/java/com/testmoa/backend/dto/response/FeedbackResponse.java`(`Long feedbackId` 다음에 `Long registerId`), `service/impl/FeedbackServiceImpl.java`(`feedback.getRegister().getId()`), 테스트 `controller/developer/FeedbackControllerTest.java`(`@DisplayName("#195-S1 피드백마다 참가 id를 준다")`), `docs/backend/project/feedback-management.md`(목록 응답 필드에 `registerId`, 끝에 `(고침 #195: 채팅 걸기에 참가 id가 필요하다)`)
   - 확인: `./gradlew test --tests '*FeedbackControllerTest'`

2~4단계는 #190 병합 뒤 그 브랜치의 변환 함수를 보고 시작한다.

2. 채팅 시작 API와 문구 — #195-S8, #195-S12
   - `features/chat/backend-map.ts`: `toChatStartFailureMessage(code: string): string`
   - `features/chat/api.ts`: `roomPagePath`를 export한다. `startChat(registerId: string, nextPath: string): Promise<{ ok: true; roomKey: string } | { ok: false; message: string }>`는 `POST /api/v1/chats`에 `{ registerId: Number(registerId) }`를 보내고, 401이면 `/login?next=…`로 redirect한다. 404는 `notFound()`로 보내지 않고 문구로 돌려준다
   - `features/chat/actions.ts`: `startChatAction(registerId, nextPath)`는 `registerId`가 숫자 문자열이고 `nextPath`가 `/developer/recruitments/`로 시작하는지 확인한다. 성공하면 `revalidatePath(CHATS_PATH)` 뒤 `redirect(roomPagePath(roomKey))`, 실패하면 `{ ok: false, message }`를 돌려준다
   - `tests/unit/chat-backend-map.test.ts`: `#195-S8` 추가
   - 확인: `npx tsc --noEmit`, `npm run lint`, `npm test`
3. 버튼 연결 — #195-S2~#195-S7, #195-S9, #195-S10, #195-S13
   - `features/recruitment/types.ts`: `Application`과 `Feedback`에 `registerId?: string`. 목업은 넣지 않는다
   - #190의 지원자·피드백 변환 함수: `registerId: String(response.registerId)`
   - `_lib/use-start-chat.ts`: `useStartChat(recruitmentKey)`는 `{ start(registerId, onFailure), isPending }`을 돌려준다. `useTransition` 안에서 액션을 부르고, 잡은 오류는 `unstable_rethrow` 뒤 연결 실패 문구를 `onFailure`로 넘긴다
   - `ApplicantList.tsx`: `registerId`가 있으면 `Link` 대신 같은 `aria-label`의 `<button type="button" className={styles.link} disabled={isPending}>`, 실패는 `setError`. 없으면 지금 링크. `ApplicantList.module.css`의 `.link`에 버튼 기본 모양을 지우는 값을 더한다
   - `FeedbackList.tsx`: `registerId`가 있으면 `start`, 실패는 `showNotice(item, message)`. 없으면 `CHAT_NOT_READY`. `FollowupQuestionsDialog`에 `asking.registerId`와 `recruitmentKey`를 넘긴다
   - `FollowupQuestionsDialog.tsx`: `registerId` prop이 있으면 `goChat`이 `start`를 부르고, 실패는 `setChatNotice`와 `setAnnouncement`. 없으면 지금 안내
   - 확인: `npx tsc --noEmit`, `npm run lint`, `npm test`, 모집 관리 관련 E2E
4. 문서 — `projects.md`의 #62-S23, #62-S24, #134-S3, #134-S7 끝에 `(고침 #195: 목업 모드의 동작이다. 백엔드 모드는 채팅방으로 바로 간다)`를 붙이고, `docs/backend/chat/README.md`의 이슈 표에 #195와 이 문서를 더한다
5. 직접 확인 — #195-S2~#195-S7, #195-S9, #195-S10, #195-S12, #195-S13. 로컬 `AUTH_MODE=backend`에서 하고, 원격 도커의 Postgres를 쓴다

## 가정
- 버튼을 누를 때 방을 만든다. 미리 만들거나 방 유무를 먼저 조회하지 않는다. `POST /api/v1/chats`가 있으면 돌려주고 지운 방도 되살리므로 한 번으로 끝난다
- 지원자 목록의 버튼 표시 조건은 지금처럼 구독 모집이고 확정 상태일 때다. 참여를 취소한 테스터에게는 버튼이 없다. 그사이 취소돼 400이 오면 #195-S8의 문구를 보여 준다
- 피드백 카드에는 확정 상태 조건이 없다. 참여를 취소한 테스터의 피드백에서 눌러도 방이 없으면 400 문구를 보여 준다
- `registerId`는 지원 응답의 숫자를 문자열로 바꿔 쓴다. 다른 화면 id와 같은 형식이다
- `registerId`를 선택 필드로 두어 목업 데이터를 고치지 않는다. 목업 삭제 때 필수로 바꾼다
- `nextPath`를 액션에서 다시 확인하는 것은 브라우저가 액션 인자를 바꿔 보낼 수 있어서다
- 성공 안내 문구는 두지 않는다. 채팅방으로 이동하는 것이 결과다

## 참고 (2026-11-09 확인)
- 지금 `findApplications`, `findFeedbacks`는 목업 저장소만 읽어서 `AUTH_MODE=backend`의 테스터 관리·피드백 탭은 비어 있다. 백엔드의 조회 API는 있다(`GET /api/v1/developer/recruitments/{id}/applications`, `/feedbacks`)
- 지원자 응답 `ApplicantResponse`에는 `registerId`가 있다. 피드백은 `feedback.getRegister()`를 이미 읽어 id를 더해도 쿼리가 늘지 않는다
- `POST /api/v1/chats`의 실패: 남의 참가·없는 참가 404 `NOT_FOUND`, 확정 아님 400 `INVALID_INPUT`, 구독 없음 403 `SUBSCRIPTION_REQUIRED`, 끝난 모집 403 `CHAT_READ_ONLY`. 방이 이미 있으면 확정 상태·구독·마감을 보지 않고 200이다(#53-S2)
- `CHAT_READ_ONLY`의 서버 문구는 "대화가 끝난 방이라 메시지를 보낼 수 없어요"라서, 방을 여는 상황에 맞게 프론트 문구를 쓴다
