-- #69: Plan.monthlyRecruitLimit 필드를 지웠다(모집 한도 없음).
-- ddl-auto: update는 칼럼을 지우지 않아서, 이 칼럼이 NOT NULL로 남은 DB는 플랜 등록(POST /api/v1/admin/plans)이 500으로 실패한다.
-- 플랜 행이 있든 없든 칼럼이 있는 DB는 모두 해당한다. 이 변경이 들어간 서버를 배포하기 전에 한 번 실행한다.
-- 다시 실행해도 안전하다(IF EXISTS).
ALTER TABLE plans DROP COLUMN IF EXISTS monthly_recruit_limit;
