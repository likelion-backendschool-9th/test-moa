package com.testmoa.backend.dto.response;

/**
 * 내 프로젝트 화면의 "전체 현황"
 */
public record ProjectDashboardResponse(Overview overview) {

    public record Overview(long recruiting, long testing, long closed) {}
}
