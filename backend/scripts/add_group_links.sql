-- 버전 비교의 짝을 그룹 코드에서 group_links로 옮긴다(#284). 수동 실행용이다. Flyway가 없어서 서버 DB에 한 번 실행한다.
-- 배포한 뒤, 백엔드가 ddl-auto: update로 group_links 테이블과 cluster_groups.links_edited_at 컬럼을 만든 다음에 실행한다.
-- 예전에는 이번 버전 그룹이 직전 버전 그룹의 코드를 이어받는 것이 곧 짝이었다. 저장된 비교마다 코드가 같은 두 버전 그룹 쌍을 짝으로 넣는다.
-- 개발자가 고친 짝인지는 알 수 없어 고친 표시(links_edited_at)는 남기지 않는다. 다시 비교하면 AI가 새로 잇는다.
-- 여러 번 실행해도 같은 결과다.
--   psql -h localhost -U postgres -d testmoa -f backend/scripts/add_group_links.sql

BEGIN;

INSERT INTO group_links (current_group_id, previous_group_id, created_at, updated_at)
SELECT c.id, p.id, now(), now()
FROM version_comparisons vc
JOIN cluster_groups c ON c.recruitment_id = vc.recruitment_id
JOIN cluster_groups p ON p.recruitment_id = vc.previous_recruitment_id AND p.group_code = c.group_code
ON CONFLICT (current_group_id, previous_group_id) DO NOTHING;

COMMIT;
