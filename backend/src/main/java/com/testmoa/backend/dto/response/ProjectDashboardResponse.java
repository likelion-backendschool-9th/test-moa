package com.testmoa.backend.dto.response;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 내 프로젝트 화면의 "지금 확인할 일"과 "전체 현황"
 */
public record ProjectDashboardResponse(List<Todo> todos, Overview overview) {

    /**
     * @param kind     applicants(확정을 기다리는 지원자), feedback(신고 대기 피드백)
     * @param count    대기 지원자 수 또는 신고 대기 피드백 수
     * @param payoutAt 가장 먼저 자동 지급될 시각. applicants는 null
     */
    public record Todo(String kind, Long recruitmentId, String projectName, long count, LocalDateTime payoutAt) {}

    public record Overview(long recruiting, long testing, long waitingReports) {}
}
