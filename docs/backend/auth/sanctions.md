# 운영자 제재·해제 (#86)

운영자가 회원별로 받은 신고를 모아 보고 직접 제재하고, 언제든 해제하는 API. 제재받은 회원은 막힌 기능을 쓸 때 사유와 해제일을 본다. 신고는 [reports.md](reports.md)(#85), 여러 이슈에 걸친 결정은 [README.md](README.md).

## 정한 것

- 테이블은 팀 ERD의 `sanctions` 그대로: 회원(`user_id`), 제재한 운영자(`sanctioned_by`), 해제한 운영자(`released_by`), 종류(`type`), 막을 기능(`restriction`), 사유, 시작·종료·해제 일시, 해제 사유
- 종류: 경고 `WARNING`(아무것도 막지 않는 기록), 기간 정지 `SUSPENSION`(일수를 받아 종료 일시를 정함), 영구 정지 `PERMANENT`(종료 없음)
- 막을 기능: 로그인 `LOGIN`, 테스트 지원 `APPLY`, 모집 글 작성 `RECRUIT`, 피드백 작성 `FEEDBACK`, 채팅 `CHAT`. 정지(기간·영구)는 하나 이상 골라야 하고, 경고는 고르지 않는다. `restriction` 칸에 쉼표로 이어 저장한다(예: `LOGIN,CHAT`)
- 지금 걸린 제재: 해제하지 않았고, 시작했고, 종료 일시가 없거나 아직 오지 않은 정지. 기간이 끝나면 따로 처리하지 않아도 풀린다
- 기능 확인: 각 기능 서비스의 맨 앞에서 `sanctionChecker.require(userId, Restriction.X)`를 부른다. 지원(`ApplicationServiceImpl.apply`), 모집 글 작성(`ProjectServiceImpl.createRecruitment`), 피드백 작성(`ParticipationServiceImpl.submitFeedback`), 채팅 시작·보내기(`ChatServiceImpl.startChat`·`sendMessage`). 막혀 있으면 403 `RESTRICTED`이고, `error.fields`에 막힌 기능(`restriction`), 사유(`reason`), 해제 일시(`endsAt`, 영구 정지는 없음)를 준다
- 로그인 막기: 이메일·소셜 로그인과 소셜 가입이 `LOGIN` 제재를 확인한다. `LOGIN`을 막는 제재를 주면 그 회원의 refresh 토큰을 모두 지워, 이미 로그인한 기기도 바로 끊긴다(access 토큰은 요청마다 세션을 확인한다)
- `users.status`의 `SUSPENDED`는 제재가 대신한다(#86 이슈). 이번에는 기존 `SUSPENDED` 처리를 그대로 두고 새 제재는 `sanctions`로만 한다
- 운영자 화면의 이름·이메일은 가린다: 이름 `Masking.name`(서준호 → 서*호), 이메일 `Masking.email`(member04@example.com → me***@example.com)
- 운영자는 제재할 수 없고, 자기 자신도 제재할 수 없다
- 같은 종류·같은 기능의 정지가 이미 걸려 있으면 409 `SANCTION_DUPLICATE`. 회원 행을 잠가 두 번 눌러도 두 번째는 첫 제재를 본다. 경고는 막지 않아서 여러 번 줄 수 있다

## API

- `GET /api/v1/admin/users?q=&filter=all|sanctioned|reported`: 운영자 회원 목록. 닉네임 검색, 제재 이력 있음·검토 대기 신고 있음 필터, 최근 가입 순. 실명·이메일은 넣지 않는다
- `GET /api/v1/admin/users/{userId}`: 운영자 회원 상세. 가린 실명·이메일, 지금 막힌 기능, 제재 이력, 받은 신고(사유·증거). 목록과 같이 일반 회원만 열고, 운영자 id는 404
- `POST /api/v1/admin/users/{userId}/sanctions` `{type, days, restrictions, reason}`: 제재. 201
- `POST /api/v1/admin/sanctions/{sanctionId}/release` `{reason}`: 해제
- `GET /api/v1/sanctions/me`: 내가 받은 경고·정지. 신고자와 증거는 없다

## 시나리오

#86-S1 운영자가 경고·기간 정지·영구 정지를 사유와 함께 준다 [테스트]
- Given 운영자와 일반 회원
- When  기간 정지(7일, 테스트 지원·채팅)를 준다
- Then  201이고 종료 일시는 7일 뒤, 막을 기능은 `APPLY`·`CHAT`, 제재한 운영자가 남는다
- 경고는 막을 기능 없이, 영구 정지는 종료 일시 없이 남는다
- 사유가 없거나, 기간 정지에 일수(1~3650)가 없거나, 정지에 막을 기능이 없거나, 경고에 막을 기능이 있으면 400(칸별 문구)

#86-S2 기간 정지는 끝나면 따로 처리하지 않아도 풀린다 [테스트]
- 종료 일시가 지난 정지는 기능을 막지 않는다

#86-S3 운영자가 언제든 해제하고, 해제 사유는 필수다 [테스트]
- 해제하면 해제 일시·해제한 운영자·사유가 남고 바로 풀린다
- 사유가 없으면 400, 이미 해제했거나 끝난 제재는 409 `SANCTION_NOT_ACTIVE`, 없는 제재는 404

#86-S4 로그인이 막힌 회원은 로그인하지 못하고, 이미 로그인한 기기도 끊긴다 [테스트]
- 이메일 로그인은 403 `RESTRICTED`, `error.fields`에 `restriction=LOGIN`, 사유, 해제 일시
- 제재 전에 받은 access·refresh 토큰은 401이다. 해제하면 다시 로그인된다

#86-S5 다른 기능이 막힌 회원은 그 기능에서 403 `RESTRICTED`와 같은 안내를 받는다 [테스트]
- `sanctionChecker.require(userId, Restriction.CHAT)`은 채팅이 막힌 회원에게 403, 막히지 않은 기능과 다른 회원은 통과

#86-S6 운영자가 회원 목록을 닉네임과 필터로 찾는다 [테스트]
- 최근 가입 순. 각 행에 닉네임, 가입일, 제재 이력 수, 검토 대기 신고 수, 지금 걸린 제재가 있다. 실명·이메일은 없다
- `filter=sanctioned`는 제재 이력이 있는 회원만, `filter=reported`는 검토 대기 신고를 받은 회원만, `q`는 닉네임 일부

#86-S7 운영자가 회원 상세에서 제재 이력과 받은 신고를 본다 [테스트]
- 실명·이메일은 가린다. 제재 이력은 최근 순, 받은 신고는 사유·상태·증거와 함께. 없는 회원은 404

#86-S8 회원이 내가 받은 경고·정지를 본다 [테스트]
- 사유·기간·막힌 기능·해제 일시. 제재한 운영자, 신고자, 증거는 없다

#86-S9 운영자 회원·제재 API는 운영자만 쓸 수 있다 [테스트]
- 일반 회원 403, 로그인하지 않으면 401

#86-S10 운영자와 자기 자신은 제재할 수 없다 [테스트]
- 400 `INVALID_INPUT`

#86-S14 막힌 기능(지원·모집 글 작성·피드백 작성·채팅)은 실제 서비스에서 403 `RESTRICTED`다 [테스트]
- 대상을 찾기 전에 막는다. 다른 회원은 막히지 않는다

#86-S15 막을 기능에 빈 값(null)이 있으면 400이다 [테스트]

#86-S16 같은 종류·같은 기능의 정지가 이미 걸려 있으면 다시 줄 수 없다 [테스트]
- 409 `SANCTION_DUPLICATE`. 기능이 다르거나 해제한 뒤면 준다. 경고는 여러 번 준다

#86-S17 운영자 회원 상세는 목록과 같이 일반 회원만 연다 [테스트]
- 운영자 id는 404

## 범위 밖

- 기존 `users.status`의 `SUSPENDED` 정리, 제재 알림(메일·푸시), 신고 판정과 제재를 한 번에 하는 화면 흐름
- 회원 상세의 활동 요약(테스터·개발자 활동): 각 도메인 API
