package com.testmoa.backend.dto.response;

import com.testmoa.backend.entity.ClusterGroup;
import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.VersionComparison;
import com.testmoa.backend.entity.enums.ClusterCategory;

import java.time.LocalDateTime;
import java.util.List;

/**
 * AI 버전 비교 결과. 화면에는 "해결됨"이라고 쓰지 않고 notReportedGroups를 "이번 버전에서 보고되지 않음"으로 보여 준다
 *
 * @param currentTitle      현재 버전 모집글 제목
 * @param previousTitle     직전 버전 모집글 제목
 * @param comparedAt        비교한 시각
 * @param stale             비교한 뒤 두 버전 중 하나를 다시 분석했으면 true(오래된 비교)
 * @param groups            현재 버전 그룹
 * @param notReportedGroups 직전 버전 그룹 중 어느 현재 버전 그룹과도 이어지지 않은 그룹
 */
public record VersionComparisonResponse(
        Long currentRecruitmentId,
        int currentVersion,
        String currentTitle,
        Long previousRecruitmentId,
        int previousVersion,
        String previousTitle,
        String summary,
        LocalDateTime comparedAt,
        boolean stale,
        List<CurrentGroup> groups,
        List<NotReportedGroup> notReportedGroups
) {
    public static VersionComparisonResponse of(VersionComparison comparison, Recruitment current, Recruitment previous, boolean stale,
                                               List<CurrentGroup> groups, List<NotReportedGroup> notReportedGroups) {
        return new VersionComparisonResponse(current.getId(), current.getVersion(), current.getTitle(),
                previous.getId(), previous.getVersion(), previous.getTitle(),
                comparison.getSummary(), comparison.getUpdatedAt(), stale, groups, notReportedGroups);
    }

    /**
     * @param improvementRank    심각도 1 = 치명 ~ 4 = 사소. 칭찬·미분류는 null
     * @param previouslyReported 이어진 직전 그룹이 있으면 true("이전에도 있음"), 없으면 false("신규")
     * @param previousGroupIds   이어진 직전 버전 그룹 id. 여러 개일 수 있다(N:M)
     */
    public record CurrentGroup(Long groupId, String groupCode, String name, ClusterCategory category, Integer improvementRank,
                               boolean previouslyReported, List<Long> previousGroupIds) {
        public static CurrentGroup of(ClusterGroup group, List<Long> previousGroupIds) {
            return new CurrentGroup(group.getId(), group.getGroupCode(), group.getName(), group.getCategory(),
                    group.getImprovementRank(), !previousGroupIds.isEmpty(), previousGroupIds);
        }
    }

    public record NotReportedGroup(Long groupId, String groupCode, String name, ClusterCategory category, Integer improvementRank) {
        public static NotReportedGroup of(ClusterGroup group) {
            return new NotReportedGroup(group.getId(), group.getGroupCode(), group.getName(), group.getCategory(),
                    group.getImprovementRank());
        }
    }
}
