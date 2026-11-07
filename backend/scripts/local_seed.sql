-- =====================================================================
-- 로컬 전용 테스트 데이터. 운영 DB에서 실행 금지
-- =====================================================================
-- 용도: 리뷰 분석(#107), 버전 비교(#108), 후속 질문(#109)을 로컬에서 테스트한다.
-- 실행: 저장소 최상위에서
--   psql -h localhost -U postgres -d testmoa -f backend/scripts/local_seed.sql
--   DB 툴에서는 파일 내용을 통째로 실행한다. 애플리케이션 시작 때 자동으로 실행되지 않는다.
--   서버에서 실수로 돌리지 않도록 배포 이미지에 들어가는 src/main 밖에 둔다(Dockerfile은 src만 복사한다).
--
-- 주의: 맨 앞의 TRUNCATE ... CASCADE는 아래 테이블을 참조하는 테이블까지 모두 비운다.
--   채팅(chat_rooms, chat_participants, chat_messages), 크레딧(credit_wallets, credit_ledgers), 출금(cashout_requests),
--   결제(payments), 로그인 토큰(refresh_tokens), 이미지(recruitment_images, test_item_images, feedback_images)도 비워진다.
--
-- 여러 번 실행해도 같은 결과다. 날짜는 실행 시각 기준이라 구독은 언제 실행해도 유효하고, 두 모집은 이미 끝나 있다.
--
-- 계정: 모두 비밀번호 test1234, 이메일 로그인(accounts.provider = LOCAL)
--   비밀번호 해시는 SecurityConfig의 BCryptPasswordEncoder(강도 10, $2a$)와 같은 방식이다. 다시 만들려면 둘 중 하나:
--   - 아무 테스트 코드에서 System.out.println(new BCryptPasswordEncoder().encode("test1234"));
--   - jshell --class-path "<Gradle 캐시의 spring-security-crypto-버전.jar>" 를 열고
--     org.springframework.security.crypto.bcrypt.BCrypt.hashpw("test1234", org.springframework.security.crypto.bcrypt.BCrypt.gensalt(10))
--   해시는 솔트 때문에 만들 때마다 다르지만 모두 test1234와 맞는다.
--
-- 넣지 않는 것: cluster_groups, feedback_clusters, version_comparisons는 비워 둔다.
--   리뷰 분석과 버전 비교를 실행해서 채워지는지 확인하는 것이 목적이다.
-- =====================================================================

-- Windows의 psql은 콘솔 코드 페이지로 읽어 한글이 깨질 수 있어 UTF-8로 맞춘다
SET client_encoding = 'UTF8';

BEGIN;

-- 1. 비우기. 참조하는 쪽부터(FK 역순). 리뷰 분석·버전 비교 결과도 비운다
TRUNCATE TABLE
    version_comparisons,
    feedback_clusters,
    cluster_groups,
    feedbacks,
    registers,
    test_items,
    recruitment_types,
    recruitments,
    types,
    projects,
    subscriptions,
    plans,
    accounts,
    users
    RESTART IDENTITY CASCADE;

-- 2. 회원. DB의 역할(role)은 모두 USER다. 개발자·테스터는 같은 회원이 쓰는 화면 구분이라 컬럼이 없다
--    1 = 구독한 개발자(프로젝트 주인), 2 = 구독하지 않은 개발자(권한 거부 테스트), 3~12 = 테스터
INSERT INTO users (id, name, nickname, email, role, status, image_url, created_at, updated_at)
SELECT v.id, v.name, v.nickname, v.email, 'USER', 'ACTIVE', NULL, base.t, base.t
FROM (VALUES
    (1, '김구독', '구독개발자', 'dev.subscribed@example.com'),
    (2, '이무료', '무료개발자', 'dev.free@example.com'),
    (3, '박서준', '테스터03', 'tester03@example.com'),
    (4, '최지우', '테스터04', 'tester04@example.com'),
    (5, '정하린', '테스터05', 'tester05@example.com'),
    (6, '강도윤', '테스터06', 'tester06@example.com'),
    (7, '조서아', '테스터07', 'tester07@example.com'),
    (8, '윤시우', '테스터08', 'tester08@example.com'),
    (9, '장하은', '테스터09', 'tester09@example.com'),
    (10, '임지호', '테스터10', 'tester10@example.com'),
    (11, '한유나', '테스터11', 'tester11@example.com'),
    (12, '오태민', '테스터12', 'tester12@example.com')
) AS v(id, name, nickname, email)
CROSS JOIN (SELECT date_trunc('day', LOCALTIMESTAMP) - interval '60 days' AS t) AS base;

-- 이메일 로그인 계정. 가입 API(AuthServiceImpl.signup)처럼 회원마다 LOCAL 계정 하나, 비밀번호는 test1234
INSERT INTO accounts (id, user_id, password, provider, provider_code, created_at, updated_at)
SELECT id, id, '$2a$10$MrDXIIx1jh5CTTdQo3Xmout.ZTlhgs29fNIZkMyhQfo7AZlEyt8BG', 'LOCAL', NULL, created_at, created_at
FROM users;

-- 3. 구독. 구독 여부는 subscriptions에서 ACTIVE이고 start_at <= 지금 < end_at인 행으로 판단한다(SubscriptionChecker)
--    플랜은 로컬 DB에 있던 값과 같다. 회원 1만 구독하고 회원 2는 구독이 없다
INSERT INTO plans (id, tier, cash_price, credit_price, monthly_recruit_limit, version, description, image_url, period_days,
                   created_at, updated_at)
VALUES (1, '구독', 10000, 9000, 30, 1, NULL, NULL, 30,
        date_trunc('day', LOCALTIMESTAMP) - interval '60 days', date_trunc('day', LOCALTIMESTAMP) - interval '60 days');

INSERT INTO subscriptions (id, user_id, plan_id, start_at, end_at, status, created_at, updated_at)
VALUES (1, 1, 1, LOCALTIMESTAMP - interval '1 day', LOCALTIMESTAMP + interval '29 days', 'ACTIVE',
        LOCALTIMESTAMP - interval '1 day', LOCALTIMESTAMP - interval '1 day');

-- 4. 프로젝트와 모집글
INSERT INTO projects (id, user_id, title, description, image_url, created_at, updated_at)
VALUES (1, 1, '가계부 앱', '지출을 기록하고 월별 통계를 보여주는 앱', NULL,
        date_trunc('day', LOCALTIMESTAMP) - interval '50 days', date_trunc('day', LOCALTIMESTAMP) - interval '50 days');

-- 모집 상태는 취소만 저장하고, 모집 중·테스트 중·종료는 마감일로 계산한다(프로젝트 README 결정 11).
-- 그래서 status는 만들 때 값(RECRUITING)이고, 두 마감일을 지난 날로 두어 "종료"로 보이게 한다.
-- 마감은 그날 23:59:59까지다(결정 10). 분석은 하기 전(NONE)이고 analyzed_at·praise_summary는 NULL이다
INSERT INTO recruitments (id, project_id, title, description, conditions, access_url, recruit_deadline, feedback_deadline,
                          status, selection_mode, version, analysis_status, analyzed_at, praise_summary,
                          cancel_reason, cancelled_at, created_at, updated_at)
SELECT v.id, 1, v.title, v.description, NULL, 'https://example.com/budget-app',
       day.t - v.recruit_days_ago + interval '23 hours 59 minutes 59 seconds',
       day.t - v.feedback_days_ago + interval '23 hours 59 minutes 59 seconds',
       'RECRUITING', 'FIRST_COME', v.version, 'NONE', NULL, NULL,
       NULL, NULL, day.t - v.created_days_ago, day.t - v.created_days_ago
FROM (VALUES
    (1, 'v1 베타 테스트', '로그인, 사진 첨부, 결제 흐름을 중점적으로 테스트해주세요', 1,
        interval '40 days', interval '33 days', interval '26 days'),
    (2, 'v2 베타 테스트', 'v1에서 보고된 문제를 수정했습니다. 사진 첨부와 결제를 다시 확인해주세요', 2,
        interval '20 days', interval '13 days', interval '6 days')
) AS v(id, title, description, version, created_days_ago, recruit_days_ago, feedback_days_ago)
CROSS JOIN (SELECT date_trunc('day', LOCALTIMESTAMP) AS t) AS day;

-- 모집 작성 API(ProjectServiceImpl.createRecruitment)처럼 두 모집글 모두 웹서비스(WEB) 유형이다
INSERT INTO types (id, code, image_url, created_at, updated_at)
SELECT 1, 'WEB', NULL, created_at, created_at FROM recruitments WHERE id = 1;

INSERT INTO recruitment_types (id, recruitment_id, type_id, created_at, updated_at)
SELECT id, id, 1, created_at, created_at FROM recruitments;

-- 테스트 항목. v1은 1~3, v2는 4~6
INSERT INTO test_items (id, recruitment_id, title, description, is_required, created_at, updated_at)
SELECT v.id, v.recruitment_id, v.title, v.description, true, r.created_at, r.created_at
FROM (VALUES
    (1, 1, '로그인', '구글·카카오로 로그인해 보세요'),
    (2, 1, '사진 첨부', '영수증 사진을 올려 보세요'),
    (3, 1, '결제', '구독 결제를 끝까지 진행해 보세요'),
    (4, 2, '로그인', '구글·카카오로 로그인해 보세요'),
    (5, 2, '사진 첨부', '영수증 사진을 올려 보세요'),
    (6, 2, '결제', '구독 결제를 끝까지 진행해 보세요')
) AS v(id, recruitment_id, title, description)
JOIN recruitments r ON r.id = v.recruitment_id;

-- 5. 참가. 선착순 모집이라 지원하면 바로 확정(CONFIRMED)이다. 모집글이 만들어진 뒤 한 시간씩 차이를 두고 지원했다
--    v1은 테스터 3~11, v2는 테스터 3·6·7·9·10·11·12 (3·6·7·9·10·11은 두 버전 모두 참가)
--    보상 스냅샷은 기본 1,000 + 구독 모집 추가 300 크레딧(프론트 BASE_REWARD·EXTRA_REWARD와 같은 임시값)
INSERT INTO registers (id, recruitment_id, user_id, status, applied_at, confirmed_at, base_reward_snapshot, extra_reward_snapshot,
                       created_at, updated_at)
SELECT v.id, v.recruitment_id, v.user_id, 'CONFIRMED', applied.t, applied.t, 1000, 300, applied.t, applied.t
FROM (VALUES
    (1, 1, 3), (2, 1, 4), (3, 1, 5), (4, 1, 6), (5, 1, 7), (6, 1, 8), (7, 1, 9), (8, 1, 10), (9, 1, 11),
    (10, 2, 3), (11, 2, 6), (12, 2, 7), (13, 2, 9), (14, 2, 10), (15, 2, 11), (16, 2, 12)
) AS v(id, recruitment_id, user_id)
JOIN recruitments r ON r.id = v.recruitment_id
CROSS JOIN LATERAL (SELECT r.created_at + v.id * interval '1 hour' AS t) AS applied;

-- 6. 리뷰. 모두 제출(SUBMITTED)이고, 모집 마감 뒤 제출 마감 전에 서로 다른 시각에 냈다
--    작성한 테스터의 그 모집글 참가(registers)에 단다. 테스트 항목이 "없음"인 기타 의견은 test_item_id가 NULL이다
--    v1은 리뷰 1~11, v2는 리뷰 12~18
INSERT INTO feedbacks (id, register_id, test_item_id, content, submitted_at, status, is_recommended, created_at, updated_at)
SELECT v.id, reg.id, v.test_item_id, v.content, submitted.t, 'SUBMITTED', false, submitted.t, submitted.t
FROM (VALUES
    -- v1 (모집글 1)
    (1, 1, 3, 1, '구글 로그인 누르면 앱이 꺼져요', 5),
    (2, 1, 4, 1, '로그인 화면에서 튕김', 9),
    (3, 1, 5, NULL, '카카오 로그인이 안 됩니다', 14),
    (4, 1, 6, 2, '영수증 사진 올리면 멈춰요', 20),
    (5, 1, 7, NULL, '사진 업로드가 너무 느려요', 27),
    (6, 1, 8, NULL, '디자인이 깔끔하고 좋아요', 33),
    (7, 1, 9, NULL, '색감이 예뻐요', 41),
    (8, 1, 10, 3, '결제할 때 금액이 이상하게 나와요', 50),
    (9, 1, 11, NULL, '창이 안넘어가서 결제가 안돼요', 62),
    (10, 1, 3, NULL, '로그인도 느리고 사진도 깨져요', 75),
    (11, 1, 4, NULL, 'ㅇㅇ', 90),
    -- v2 (모집글 2)
    (12, 2, 3, NULL, '로그인은 이제 잘 돼요', 4),
    (13, 2, 6, 5, '사진 올릴 때 여전히 가끔 멈춰요', 10),
    (14, 2, 7, NULL, '큰 사진은 업로드가 실패해요', 18),
    (15, 2, 10, 6, '결제 금액이 할인 적용 전 금액으로 나와요', 26),
    (16, 2, 11, NULL, '다크모드에서 글씨가 안 보여요', 37),
    (17, 2, 12, NULL, '다크모드로 바꾸면 버튼 색이 배경이랑 같아져요', 49),
    (18, 2, 9, NULL, '통계 그래프가 보기 좋아요', 63)
) AS v(id, recruitment_id, tester_id, test_item_id, content, hours_after_recruit_deadline)
JOIN recruitments r ON r.id = v.recruitment_id
JOIN registers reg ON reg.recruitment_id = v.recruitment_id AND reg.user_id = v.tester_id
CROSS JOIN LATERAL (SELECT r.recruit_deadline + v.hours_after_recruit_deadline * interval '1 hour' AS t) AS submitted;

-- 7. 확인. 참가가 없는 테스터의 리뷰는 위 JOIN에서 빠지므로 개수로 확인하고, 다르면 전체를 되돌린다
DO $$
BEGIN
    IF (SELECT count(*) FROM users) <> 12 THEN RAISE EXCEPTION '회원이 12명이 아닙니다'; END IF;
    IF (SELECT count(*) FROM registers) <> 16 THEN RAISE EXCEPTION '참가가 16건이 아닙니다'; END IF;
    IF (SELECT count(*) FROM feedbacks WHERE register_id IN (SELECT id FROM registers WHERE recruitment_id = 1)) <> 11 THEN
        RAISE EXCEPTION 'v1 리뷰가 11개가 아닙니다. 리뷰를 쓴 테스터의 참가가 있는지 확인하세요';
    END IF;
    IF (SELECT count(*) FROM feedbacks WHERE register_id IN (SELECT id FROM registers WHERE recruitment_id = 2)) <> 7 THEN
        RAISE EXCEPTION 'v2 리뷰가 7개가 아닙니다. 리뷰를 쓴 테스터의 참가가 있는지 확인하세요';
    END IF;
    -- 리뷰의 테스트 항목은 같은 모집글의 항목이어야 한다
    IF EXISTS (SELECT 1 FROM feedbacks f JOIN registers reg ON reg.id = f.register_id JOIN test_items ti ON ti.id = f.test_item_id
               WHERE ti.recruitment_id <> reg.recruitment_id) THEN
        RAISE EXCEPTION '다른 모집글의 테스트 항목에 단 리뷰가 있습니다';
    END IF;
END $$;

-- 8. 시퀀스를 넣은 최대 ID 다음으로 맞춘다. 이후 애플리케이션이 INSERT할 때 ID가 겹치지 않는다
SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT max(id) FROM users));
SELECT setval(pg_get_serial_sequence('accounts', 'id'), (SELECT max(id) FROM accounts));
SELECT setval(pg_get_serial_sequence('plans', 'id'), (SELECT max(id) FROM plans));
SELECT setval(pg_get_serial_sequence('subscriptions', 'id'), (SELECT max(id) FROM subscriptions));
SELECT setval(pg_get_serial_sequence('projects', 'id'), (SELECT max(id) FROM projects));
SELECT setval(pg_get_serial_sequence('recruitments', 'id'), (SELECT max(id) FROM recruitments));
SELECT setval(pg_get_serial_sequence('types', 'id'), (SELECT max(id) FROM types));
SELECT setval(pg_get_serial_sequence('recruitment_types', 'id'), (SELECT max(id) FROM recruitment_types));
SELECT setval(pg_get_serial_sequence('test_items', 'id'), (SELECT max(id) FROM test_items));
SELECT setval(pg_get_serial_sequence('registers', 'id'), (SELECT max(id) FROM registers));
SELECT setval(pg_get_serial_sequence('feedbacks', 'id'), (SELECT max(id) FROM feedbacks));

COMMIT;
