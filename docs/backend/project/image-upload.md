# 프로젝트·모집글·테스트 항목 이미지 업로드

[#191](https://github.com/likelion-backendschool-9th/test-moa/issues/191). 결정과 데이터 구조는 [README](README.md#정한-것), 화면은 [개발자 프로젝트](../../frontend/project/projects.md)를 따른다.

## 한눈에
- 끝나면: 개발자가 프로젝트 등록·수정과 모집 작성에서 고른 이미지가 실제로 저장되고, 프로젝트 상세와 모집 상세에 보인다.
- 결정 필요: 없음
- 규모: 4단계, 약 4시간

## 정한 것 (11-09)
- 파일은 제출할 때 올린다. 고를 때 올리면 작성을 그만둘 때마다 안 쓰는 파일이 남는다.
- 안 쓰는 파일 자동 삭제는 이번에 넣지 않고 후속 이슈로 나눈다. 저장 실패, 이미지 교체로 남는 파일이 있고, 모집 버전끼리 같은 이미지를 쓸 수 있어 삭제 조건을 따로 따져야 한다.

## API 구성
새 컨트롤러를 만들지 않고 화면별 기존 컨트롤러에 메서드를 더한다. 저장 API는 지금처럼 JSON으로 이미지 주소를 받는다.

| 용도 | 주소 | 위치 |
| --- | --- | --- |
| 프로젝트 대표 이미지 업로드 | `POST /api/v1/developer/projects/images` | `controller.ProjectController` |
| 모집글·테스트 항목 이미지 업로드 | `POST /api/v1/developer/recruitments/images` | `controller.developer.RecruitmentController` |
| 공개 조회 | `GET /api/v1/recruitments/images/{파일}` | `controller.RecruitmentController` |

- 업로드는 multipart `file` 하나를 받아 `{ "url": "/api/v1/recruitments/images/<uuid>.<확장자>" }`를 돌려준다. 파일은 한 번에 한 장이다. 모집글 이미지 10장이면 최대 50MB라 요청 한도 30MB를 넘기 때문이다.
- 두 업로드 API 모두 업로드 폴더의 `images/`에 저장한다. 신고 증거는 `reports/`에 있으므로 조회가 `images/`만 읽으면 증거 파일에 닿지 않는다.
- 공개 조회를 공개 모집 컨트롤러에 두는 이유는 세 이미지가 모두 공개 모집 화면에 나오고, 공개 프로젝트 컨트롤러가 없기 때문이다.
- 브라우저는 백엔드에 직접 닿지 않는다(nginx가 Next로 보낸다). Next Route Handler를 백엔드와 같은 경로에 두어 전달한다. `standalone` 빌드의 `rewrites`는 빌드 때 값이 고정되어 백엔드 주소를 환경 변수로 바꿀 수 없으므로 쓰지 않는다.

## 1. 프로젝트 대표 이미지 (#191-R1)
개발자가 프로젝트 등록·수정에서 대표 이미지를 올리면 저장되고 상세에 보인다.

#191-S1 업로드 [테스트]
- Given 로그인한 회원
- When  1MB PNG를 `POST /api/v1/developer/projects/images`로 보낸다
- Then  200이고 `url`이 `/api/v1/recruitments/images/<uuid>.png`다

#191-S2 비로그인 업로드 [테스트]
- Given 토큰 없음
- When  같은 요청을 보낸다
- Then  401이고 파일이 저장되지 않는다

#191-S3 등록과 상세 [직접]
- Given 등록 폼에 PNG 한 장을 고른 개발자
- When  저장한다
- Then  프로젝트 상세에 고른 이미지가 보인다

#191-S4 수정에서 유지·교체·삭제 [직접]
- Given 대표 이미지가 있는 프로젝트
- When  이미지를 건드리지 않고 저장한다
- Then  기존 이미지가 그대로 보인다
- When  새 이미지로 바꿔 저장한다
- Then  새 이미지가 보인다
- When  이미지를 지우고 저장한다
- Then  기본 이미지가 보인다

## 2. 모집글·테스트 항목 이미지 (#191-R2)
모집 작성에서 모집글 이미지와 테스트 항목 이미지를 올리면 저장되고 모집 상세에 보인다.

#191-S5 업로드 두 종류 [테스트]
- Given 로그인한 회원
- When  JPG와 WEBP를 모두 `/api/v1/developer/recruitments/images`로 보낸다
- Then  둘 다 200이고 `url`의 확장자가 각각 `jpg`, `webp`다 (고침 #191: 같은 규칙이라 업로드 주소를 합침, PR #224 리뷰)

#191-S6 모집 작성과 상세 [직접]
- Given 모집글 이미지 2장과 첫 번째 테스트 항목 이미지 1장을 고른 작성 폼
- When  등록한다
- Then  모집 상세에 모집글 이미지 2장이 고른 순서대로, 첫 번째 항목에 이미지 1장이 보인다

## 3. 형식·용량·장수 한도 (#191-R3)
형식이나 용량, 장수가 한도를 넘으면 저장되지 않고 이유가 보인다.

#191-S7 내용이 이미지가 아닌 파일 [테스트]
- Given 이름만 `a.png`이고 내용은 텍스트인 파일
- When  업로드한다
- Then  400이고 "PNG, JPG, WEBP 이미지만 올릴 수 있어요"가 온다

#191-S8 PDF [테스트]
- Given 신고 증거로는 받는 정상 PDF
- When  업로드한다
- Then  400이고 파일이 저장되지 않는다

#191-S9 5MB 초과 [직접]
- Given 실행 중인 서버와 6MB PNG
- When  업로드한다
- Then  413이다
- 참고: MockMvc는 업로드 한도를 거치지 않는다

#191-S10 장수 초과 [테스트: ProjectControllerTest 모집글 이미지 10장, 항목 이미지 5장 검증]
- Given 모집글 이미지 11장 또는 항목 이미지 6장의 주소
- When  모집을 작성한다
- Then  400이고 해당 칸의 문구가 온다

## 4. 저장은 올린 주소만 받는다 (#191-R4)
저장 API는 업로드 API가 돌려준 모양의 주소만 저장한다.

#191-S11 외부 주소 거절 [테스트]
- Given 이미지 주소가 `https://evil.example/a.png`인 프로젝트 등록·모집 작성 요청
- When  저장한다
- Then  400이고 "이미지 주소를 확인해 주세요"가 해당 칸에 온다

#191-S12 예전 값 유지 [테스트]
- Given `imageUrl`이 `https://img.example.com/a.png`인 기존 프로젝트
- When  같은 `imageUrl`로 수정한다
- Then  200이고 값이 유지된다

## 5. 공개 조회 (#191-R5)
올린 이미지는 로그인 없이 볼 수 있고, 이미지가 아닌 업로드 파일에는 닿지 않는다.

#191-S13 비로그인 조회와 경로 차단 [테스트]
- Given 업로드한 PNG와 `reports/`의 신고 증거 파일
- When  토큰 없이 PNG 주소를 조회한다
- Then  200이고 `Content-Type`이 `image/png`이며 바이트가 올린 파일과 같다
- When  없는 파일 이름, `..`이 든 이름, 신고 증거의 파일 이름을 조회한다
- Then  모두 404다

## 6. 화면의 제출 흐름 (#191-R6)
제출할 때 새 파일을 한 장씩 올려 주소를 받고, 그 주소로 저장한다.

#191-S14 저장 막음 해제 (고침 #187-R3: 파일 저장소가 생겼다) [직접]
- Given `AUTH_MODE=backend`와 새 이미지를 고른 폼
- When  제출한다
- Then  "아직 준비 중" 안내 없이 저장된다

#191-S15 일부 실패 [직접]
- Given 이미지 3장 중 2번째가 업로드에 실패하는 상황
- When  제출한다
- Then  저장되지 않고 그 이미지 칸에 이유가 보이며 입력값이 남아 있다

#191-S16 다시 제출 [직접]
- Given #191-S15에서 실패한 이미지를 뺀 폼
- When  다시 제출한다
- Then  이미 올라간 1번째는 다시 올리지 않고 저장된다

#191-S17 목업 유지 [직접]
- Given `AUTH_MODE=backend`가 아닌 환경
- When  이미지를 고르고 저장한다
- Then  지금처럼 목업으로 동작하고 파일을 보내지 않는다

#191-S19 이미 올린 파일 재사용 [테스트]
- Given 2개 중 두 번째 업로드가 실패한 뒤의 업로드 기록
- When 같은 파일로 다시 업로드한다
- Then 첫 번째 파일은 다시 보내지 않고 두 번째 파일만 보낸다

## 범위 밖
- 안 쓰는 파일 자동 삭제(후속 이슈)
- 피드백 이미지(#119). 다른 회원 접근을 막아야 하므로 공개 조회를 쓰지 않는다
- 프로필 이미지(#84)
- 등록된 모집글·테스트 항목의 이미지 변경. `RecruitmentUpdateRequest`, `TestItemsUpdateRequest`에 이미지 칸이 없다

## 작업 순서
1. 백엔드 업로드와 조회 — #191-S1, S2, S5, S7, S8, S13
   - 파일: `ProjectController`, `controller.developer.RecruitmentController`, `controller.RecruitmentController`, `ProjectService(Impl)`, `RecruitmentService(Impl)`, `FileStorage`, `SecurityConfig`
   - 확인: `./gradlew test --tests '*ProjectControllerTest' --tests '*RecruitmentControllerTest'`
2. 저장 주소 검사 — #191-S10~S12
   - 파일: `ProjectServiceImpl`, 외부 주소를 저장 요청에 쓰는 기존 테스트
   - 확인: 1단계와 같은 명령에 `*ProjectRecruitmentRollbackTest` 추가
3. Next 전달과 제출 흐름 — #191-S3, S4, S6, S14~S17
   - 파일: `frontend/app/api/v1/...`의 Route Handler, `features/project/api.ts`, `features/project/media.ts`, `features/recruitment/api.ts`, `ProjectForm`, `RecruitmentForm`
   - 확인: 프론트 기본 검사와 `bootRun`으로 직접 확인
4. 실제 서버 한도 확인과 문서 — #191-S9
   - 파일: `docs/frontend/project/projects.md`(#187-R3 고침, 화면 시나리오)
   - 확인: `bootRun`에 6MB 파일 업로드

## 가정
- 주소 검사는 모양(경로와 UUID 파일 이름)만 본다. 파일 존재와 올린 사람은 확인하지 않는다. 공개 이미지라 다른 사람이 올린 주소를 넣어도 새로 노출되는 것이 없다.
- 프로젝트 수정은 현재 저장된 값과 같으면 모양이 달라도 통과시킨다.
- 파일 이름이 바뀌지 않으므로 조회 응답은 오래 캐시한다.
- 업로드 전달은 서버 액션 대신 Route Handler로 한다. 서버 액션의 기본 본문 한도를 늘리지 않기 위해서다.
- 프로젝트·모집글 업로드 메서드의 처리는 같으므로 서비스의 메서드 하나를 함께 쓴다.

## 참고 (2026-11-09 확인)
- `FileStorage`는 PNG·JPG·WEBP·PDF를 파일 앞부분으로 판별한다. 이미지 업로드는 PDF를 따로 막아야 한다.
- 업로드 한도는 Spring `max-file-size 5MB`, `max-request-size 30MB`, nginx `client_max_body_size 30m`이다.
- `SecurityConfig`의 공개 GET은 `/api/v1/recruitments/*`까지라 `/api/v1/recruitments/images/*`는 따로 더해야 한다.
- 구현 때 확인할 것: `backendFetch`의 multipart 전달, `next/image`가 이 상대 주소를 처리하는지
