package com.testmoa.backend.repository;

import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.enums.TypeCode;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 공개 모집 목록 검색(#112). 조건이 있을 때만 쿼리에 넣으려고 JPQL을 직접 만든다
 */
public interface RecruitmentSearchRepository {

    /**
     * 검색 조건. 취소된 모집은 언제나 뺀다
     *
     * @param keyword          소문자로 바꾼 검색어. 없으면 null
     * @param type             유형. 없으면 전체
     * @param openOnly         모집 마감 전인 것만
     * @param subscriptionOnly 구독 모집만
     * @param byDeadline       true면 마감 임박순, false면 최신순
     * @param now              서버 시간대의 지금
     */
    record Condition(String keyword, TypeCode type, boolean openOnly, boolean subscriptionOnly,
                     boolean byDeadline, LocalDateTime now) {}

    long countPublic(Condition condition);

    /** 조건에 맞는 모집글을 정렬해 offset부터 limit개. 프로젝트를 함께 읽는다 */
    List<Recruitment> findPublic(Condition condition, int offset, int limit);
}
