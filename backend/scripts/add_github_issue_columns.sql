-- GitHub 이슈 등록(#107)용 컬럼. 수동 실행용이다. Flyway가 없어서 서버 DB에 한 번 실행한다.
-- 로컬은 ddl-auto: update가 같은 컬럼을 자동으로 만들어서 따로 실행하지 않아도 된다.
-- 여러 번 실행해도 된다.
--   psql -h localhost -U postgres -d testmoa -f backend/scripts/add_github_issue_columns.sql

BEGIN;

-- 등록한 GitHub 이슈 번호. 등록 전에는 NULL. 나중에 이슈가 닫혔는지 볼 때 쓴다
ALTER TABLE cluster_groups ADD COLUMN IF NOT EXISTS git_issue_number integer;

-- 이슈를 등록하는 중이면 시작한 시각. 같은 그룹을 두 번 등록하지 않도록 GitHub를 부르기 전에 먼저 채운다. 등록하지 않을 때는 NULL
ALTER TABLE cluster_groups ADD COLUMN IF NOT EXISTS git_issue_registering_at timestamp(6);

COMMIT;
