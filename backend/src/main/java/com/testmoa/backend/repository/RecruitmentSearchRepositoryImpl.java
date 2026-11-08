package com.testmoa.backend.repository;

import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.enums.RecruitmentStatus;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * RecruitmentRepository가 이 구현을 함께 쓴다(Spring Data의 Impl 이름 규칙).
 * 엔티티 이름이 테이블 이름과 같아서(@Entity(name = "recruitments")) JPQL에도 그 이름을 쓴다
 */
public class RecruitmentSearchRepositoryImpl implements RecruitmentSearchRepository {

    @PersistenceContext
    private EntityManager em;

    @Override
    public long countPublic(Condition condition) {
        Map<String, Object> params = new HashMap<>();
        String where = where(condition, params);
        TypedQuery<Long> query = em.createQuery("select count(r) from recruitments r join r.project p" + where, Long.class);
        params.forEach(query::setParameter);
        return query.getSingleResult();
    }

    @Override
    public List<Recruitment> findPublic(Condition condition, int offset, int limit) {
        Map<String, Object> params = new HashMap<>();
        String where = where(condition, params);
        /* 같은 순서 안에서는 나중에 저장한 것이 먼저다. 페이지를 넘겨도 순서가 흔들리지 않게 id로 끝낸다 */
        String orderBy = condition.byDeadline()
                ? " order by case when r.recruitDeadline > :now then 0 else 1 end, r.recruitDeadline asc, r.id desc"
                : " order by r.createdAt desc, r.id desc";
        if (condition.byDeadline()) params.put("now", condition.now());
        TypedQuery<Recruitment> query = em.createQuery(
                "select r from recruitments r join fetch r.project p" + where + orderBy, Recruitment.class);
        params.forEach(query::setParameter);
        return query.setFirstResult(offset).setMaxResults(limit).getResultList();
    }

    // 조건이 있는 것만 붙인다. 값은 모두 파라미터로 넘긴다
    private String where(Condition condition, Map<String, Object> params) {
        StringBuilder where = new StringBuilder(" where r.status <> :cancelled");
        params.put("cancelled", RecruitmentStatus.CANCELLED);
        if (condition.subscriptionOnly()) {
            where.append(" and r.subscription = true");
        }
        if (condition.openOnly()) {
            where.append(" and r.recruitDeadline > :now");
            params.put("now", condition.now());
        }
        if (condition.type() != null) {
            where.append(" and exists (select 1 from recruitment_types rt where rt.recruitment = r and rt.type.code = :type)");
            params.put("type", condition.type());
        }
        if (condition.keyword() != null) {
            where.append(" and (lower(p.title) like :pattern escape '\\'")
                    .append(" or lower(coalesce(p.description, '')) like :pattern escape '\\'")
                    .append(" or lower(r.title) like :pattern escape '\\')");
            params.put("pattern", "%" + escapeLike(condition.keyword()) + "%");
        }
        return where.toString();
    }

    // %, _는 글자 그대로 찾는다
    private static String escapeLike(String keyword) {
        return keyword.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
